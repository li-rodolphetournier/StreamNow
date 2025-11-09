import { graphqlRequest } from "@/lib/api/graphql";
import type { GraphQLLocalMediaShare } from "@/types/graphql";

interface LocalMediaSharesResponse {
  localMediaSharesByPath: GraphQLLocalMediaShare[];
}

interface ShareLocalMediaResponse {
  shareLocalMedia: GraphQLLocalMediaShare[];
}

interface RevokeLocalMediaShareResponse {
  revokeLocalMediaShare: boolean;
}

const LOCAL_MEDIA_SHARES_BY_PATH_QUERY = /* GraphQL */ `
  query LocalMediaSharesByPath($path: String!) {
    localMediaSharesByPath(path: $path) {
      id
      path
      isDirectory
      createdAt
      recipient {
        id
        email
        nickname
        avatarUrl
      }
    }
  }
`;

const SHARE_LOCAL_MEDIA_MUTATION = /* GraphQL */ `
  mutation ShareLocalMedia($input: ShareLocalMediaInput!) {
    shareLocalMedia(input: $input) {
      id
      path
      isDirectory
      createdAt
      recipient {
        id
        email
        nickname
        avatarUrl
      }
    }
  }
`;

const REVOKE_LOCAL_MEDIA_SHARE_MUTATION = /* GraphQL */ `
  mutation RevokeLocalMediaShare($id: ID!) {
    revokeLocalMediaShare(id: $id)
  }
`;

export const localSharesApi = {
  fetchByPath: async (path: string): Promise<GraphQLLocalMediaShare[]> => {
    const { localMediaSharesByPath } = await graphqlRequest<
      LocalMediaSharesResponse,
      { path: string }
    >({
      query: LOCAL_MEDIA_SHARES_BY_PATH_QUERY,
      variables: { path },
    });
    return localMediaSharesByPath;
  },

  share: async (variables: {
    path: string;
    isDirectory: boolean;
    recipientIds: string[];
  }): Promise<GraphQLLocalMediaShare[]> => {
    const { shareLocalMedia } = await graphqlRequest<
      ShareLocalMediaResponse,
      {
        input: {
          path: string;
          isDirectory: boolean;
          recipientIds: string[];
        };
      }
    >({
      query: SHARE_LOCAL_MEDIA_MUTATION,
      variables: {
        input: {
          path: variables.path,
          isDirectory: variables.isDirectory,
          recipientIds: variables.recipientIds,
        },
      },
    });
    return shareLocalMedia;
  },

  revoke: async (id: string): Promise<boolean> => {
    const { revokeLocalMediaShare } = await graphqlRequest<
      RevokeLocalMediaShareResponse,
      { id: string }
    >({
      query: REVOKE_LOCAL_MEDIA_SHARE_MUTATION,
      variables: { id },
    });
    return revokeLocalMediaShare;
  },
};

