import { clearAccessToken, getAccessToken, setAccessToken } from "@/lib/auth/tokens";

interface GraphQLRequest<TVariables = Record<string, unknown>> {
  query: string;
  variables?: TVariables;
}

interface GraphQLErrorLike {
  message: string;
  extensions?: {
    code?: string;
  };
}

interface GraphQLResponse<TData> {
  data?: TData;
  errors?: GraphQLErrorLike[];
}

interface GraphQLRequestOptions {
  auth?: boolean;
}

const endpoint = process.env.NEXT_PUBLIC_API_URL;

const REFRESH_MUTATION = /* GraphQL */ `
  mutation RefreshToken {
    refreshToken {
      accessToken
    }
  }
`;

let refreshPromise: Promise<string | null> | null = null;

const shouldAttemptRefresh = (errors: GraphQLErrorLike[] | undefined): boolean => {
  if (!errors || errors.length === 0) {
    return false;
  }

  return errors.some((error) => {
    const message = error.message.toLowerCase();
    return (
      message.includes("authentification") ||
      message.includes("access denied") ||
      message.includes("permission")
    );
  });
};

const performRefresh = async (): Promise<string | null> => {
  if (!endpoint) {
    return null;
  }

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        query: REFRESH_MUTATION,
      }),
    });

    if (!response.ok) {
      return null;
    }

    const json = (await response.json()) as GraphQLResponse<{
      refreshToken?: { accessToken?: string };
    }>;

    const newToken = json.data?.refreshToken?.accessToken;
    if (newToken) {
      setAccessToken(newToken);
      return newToken;
    }
  } catch (error) {
    console.error("Failed to refresh access token", error);
  }

  clearAccessToken();
  return null;
};

const refreshAccessToken = async (): Promise<string | null> => {
  if (!refreshPromise) {
    refreshPromise = performRefresh().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
};

async function executeRequest<TData, TVariables>(
  request: GraphQLRequest<TVariables>,
  options: Required<GraphQLRequestOptions>,
  retryOnAuthError: boolean
): Promise<TData> {
  if (!endpoint) {
    throw new Error("NEXT_PUBLIC_API_URL is not defined");
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (options.auth) {
    const token = getAccessToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    credentials: "include",
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`GraphQL request failed with status ${response.status}`);
  }

  const json = (await response.json()) as GraphQLResponse<TData>;

  if (json.errors?.length) {
    if (
      options.auth &&
      retryOnAuthError &&
      shouldAttemptRefresh(json.errors) &&
      getAccessToken()
    ) {
      const newToken = await refreshAccessToken();
      if (newToken) {
        return executeRequest(request, options, false);
      }
    }

    throw new Error(json.errors.map((error) => error.message).join("\n"));
  }

  if (!json.data) {
    throw new Error("No data returned from GraphQL response");
  }

  return json.data;
}

export async function graphqlRequest<TData, TVariables = Record<string, unknown>>(
  request: GraphQLRequest<TVariables>,
  options: GraphQLRequestOptions = {}
): Promise<TData> {
  const mergedOptions: Required<GraphQLRequestOptions> = {
    auth: options.auth ?? true,
  };

  return executeRequest(request, mergedOptions, true);
}

