import { graphqlRequest } from "@/lib/api/graphql";
import { setAccessToken, clearAccessToken } from "@/lib/auth/tokens";
import type {
  GraphQLAuthPayload,
  GraphQLUser,
  SignInVariables,
  SignUpVariables,
} from "@/types/graphql";

const SIGN_UP_MUTATION = /* GraphQL */ `
  mutation SignUp($input: SignUpInput!) {
    signUp(input: $input) {
      accessToken
      refreshToken
      user {
        id
        email
        role
        nickname
        avatarUrl
      }
    }
  }
`;

const SIGN_IN_MUTATION = /* GraphQL */ `
  mutation SignIn($input: SignInInput!) {
    signIn(input: $input) {
      accessToken
      refreshToken
      user {
        id
        email
        role
        nickname
        avatarUrl
      }
    }
  }
`;

const SIGN_OUT_MUTATION = /* GraphQL */ `
  mutation SignOut {
    signOut
  }
`;

const OAUTH_SIGN_IN_MUTATION = /* GraphQL */ `
  mutation OAuthSignIn($input: OAuthSignInInput!) {
    oauthSignIn(input: $input) {
      accessToken
      refreshToken
      user {
        id
        email
        role
        nickname
        avatarUrl
      }
    }
  }
`;

const ME_QUERY = /* GraphQL */ `
  query Me {
    me {
      id
      email
      role
      nickname
      avatarUrl
    }
  }
`;

export async function signUp(input: SignUpVariables): Promise<GraphQLAuthPayload> {
  const data = await graphqlRequest<{ signUp: GraphQLAuthPayload }>(
    {
      query: SIGN_UP_MUTATION,
      variables: { input },
    },
    { auth: false }
  );

  const payload = data.signUp;
  if (payload?.accessToken) {
    setAccessToken(payload.accessToken);
  }

  return payload;
}

export async function signIn(input: SignInVariables): Promise<GraphQLAuthPayload> {
  const data = await graphqlRequest<{ signIn: GraphQLAuthPayload }>(
    {
      query: SIGN_IN_MUTATION,
      variables: { input },
    },
    { auth: false }
  );

  const payload = data.signIn;
  if (payload?.accessToken) {
    setAccessToken(payload.accessToken);
  }

  return payload;
}

export async function signOut(): Promise<boolean> {
  const data = await graphqlRequest<{ signOut: boolean }>(
    {
      query: SIGN_OUT_MUTATION,
    },
    { auth: true }
  );

  clearAccessToken();
  return data.signOut;
}

export async function fetchCurrentUser(): Promise<GraphQLUser | null> {
  const data = await graphqlRequest<{ me: GraphQLUser | null }>({
    query: ME_QUERY,
  });
  return data.me ?? null;
}

export async function oauthSignIn(variables: {
  provider: "GOOGLE" | "FACEBOOK";
  code: string;
  redirectUri?: string;
}): Promise<GraphQLAuthPayload> {
  const data = await graphqlRequest<{ oauthSignIn: GraphQLAuthPayload }>(
    {
      query: OAUTH_SIGN_IN_MUTATION,
      variables: { input: variables },
    },
    { auth: false }
  );

  const payload = data.oauthSignIn;
  if (payload?.accessToken) {
    setAccessToken(payload.accessToken);
  }
  return payload;
}
