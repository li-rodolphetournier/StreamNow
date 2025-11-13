import type { GraphQLUser, GraphQLFavorite, GraphQLVideo } from "@/types/graphql";

const MOCK_USER_ID = "00000000-0000-0000-0000-000000000000";

export const mockUser: GraphQLUser = {
  id: MOCK_USER_ID,
  email: "mock@streamnow.local",
  role: "ADMIN",
  nickname: "Mock User",
  avatarUrl: "https://placehold.co/128x128",
  bio: "Utilisateur mock pour les tests",
};

export const mockFavorites: GraphQLFavorite[] = [];

export const mockVideos: GraphQLVideo[] = [];

/**
 * Extrait le nom de la query/mutation depuis une requête GraphQL
 */
function extractOperationName(query: string): string | null {
  // Cherche "query Name" ou "mutation Name"
  const queryMatch = query.match(/(?:query|mutation)\s+(\w+)/);
  if (queryMatch) {
    return queryMatch[1];
  }
  
  // Cherche des patterns comme "me {", "signIn(", etc.
  const fieldMatch = query.match(/(\w+)\s*[({]/);
  if (fieldMatch) {
    return fieldMatch[1];
  }
  
  return null;
}

/**
 * Mock les réponses GraphQL
 */
export function mockGraphQLResponse<TData = unknown>(
  query: string,
  variables?: Record<string, unknown>
): TData | null {
  const operationName = extractOperationName(query);
  
  if (!operationName) {
    return null;
  }

  // Query: me
  if (operationName === "Me" || query.includes("query Me") || query.includes("me {")) {
    return { me: mockUser } as TData;
  }

  // Query: MeProfile
  if (operationName === "MeProfile" || query.includes("MeProfile")) {
    return { me: mockUser } as TData;
  }

  // Query: favorites
  if (operationName === "Favorites" || query.includes("favorites {")) {
    return { favorites: mockFavorites } as TData;
  }

  // Query: videos
  if (operationName === "Videos" || query.includes("videos {")) {
    return { videos: mockVideos } as TData;
  }

  // Mutation: signIn
  if (operationName === "SignIn" || query.includes("signIn(")) {
    return {
      signIn: {
        accessToken: "mock-access-token",
        refreshToken: "mock-refresh-token",
        user: mockUser,
      },
    } as TData;
  }

  // Mutation: signUp
  if (operationName === "SignUp" || query.includes("signUp(")) {
    return {
      signUp: {
        accessToken: "mock-access-token",
        refreshToken: "mock-refresh-token",
        user: mockUser,
      },
    } as TData;
  }

  // Mutation: refreshToken
  if (operationName === "RefreshToken" || query.includes("refreshToken {")) {
    return {
      refreshToken: {
        accessToken: "mock-access-token",
      },
    } as TData;
  }

  // Mutation: signOut
  if (operationName === "SignOut" || query.includes("signOut")) {
    return { signOut: true } as TData;
  }

  // Par défaut, retourner null pour que l'appel passe au backend
  return null;
}