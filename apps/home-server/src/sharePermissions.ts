import path from "path";
import { env } from "./env";

interface GraphQLShare {
  path: string;
  isDirectory: boolean;
  recipient: {
    id: string;
  };
}

export interface SharePermission {
  path: string;
  isDirectory: boolean;
  recipientId: string;
}

interface ShareCache {
  data: SharePermission[];
  expiresAt: number;
}

const GRAPHQL_QUERY = /* GraphQL */ `
  query HomeServerShares {
    localMediaShares {
      path
      isDirectory
      recipient {
        id
      }
    }
  }
`;

const normalizeSharePath = (input: string): string => {
  if (!input) {
    return "";
  }

  const normalized = path.normalize(input).replace(/\\/g, "/");
  if (normalized === "." || normalized === "./") {
    return "";
  }

  return normalized.startsWith("./") ? normalized.slice(2) : normalized;
};

let cache: ShareCache | null = null;

const parseShares = (rawShares: GraphQLShare[]): SharePermission[] => {
  const permissions: SharePermission[] = [];
  for (const share of rawShares) {
    if (!share?.recipient?.id) {
      continue;
    }

    permissions.push({
      path: normalizeSharePath(share.path ?? ""),
      isDirectory: Boolean(share.isDirectory),
      recipientId: share.recipient.id,
    });
  }

  return permissions;
};

const fetchShares = async (): Promise<SharePermission[]> => {
  if (cache && cache.expiresAt > Date.now()) {
    return cache.data;
  }

  const response = await fetch(env.HOME_SERVER_GRAPHQL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-user-id": env.HOME_SERVER_OWNER_ID,
      "x-user-role": env.HOME_SERVER_OWNER_ROLE,
      "x-service-token": env.HOME_SERVER_SERVICE_TOKEN,
    },
    body: JSON.stringify({
      query: GRAPHQL_QUERY,
    }),
  });

  if (!response.ok) {
    throw new Error(`GraphQL request failed with status ${response.status}`);
  }

  const payload = (await response.json()) as {
    data?: {
      localMediaShares?: GraphQLShare[];
    };
    errors?: Array<{ message?: string }>;
  };

  if (payload.errors && payload.errors.length > 0) {
    throw new Error(
      payload.errors.map((error) => error.message ?? "Unknown error").join(", ")
    );
  }

  const shares = parseShares(payload.data?.localMediaShares ?? []);

  cache = {
    data: shares,
    expiresAt: Date.now() + env.HOME_SERVER_SHARE_CACHE_TTL * 1000,
  };

  return shares;
};

export const getSharesForRecipient = async (
  recipientId: string
): Promise<SharePermission[]> => {
  if (!recipientId) {
    return [];
  }

  const shares = await fetchShares();
  return shares.filter((share) => share.recipientId === recipientId);
};

export const invalidateShareCache = () => {
  cache = null;
};


