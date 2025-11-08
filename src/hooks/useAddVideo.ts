import { useMutation, useQueryClient } from "@tanstack/react-query";
import { graphqlRequest } from "@/lib/api/graphql";
import type {
  AddVideoInputVariables,
  GraphQLVideo,
} from "@/types/graphql";

interface AddVideoMutationInput {
  input: AddVideoInputVariables;
}

interface AddVideoMutationResponse {
  addVideoByTmdbId: GraphQLVideo;
}

const ADD_VIDEO_MUTATION = /* GraphQL */ `
  mutation AddVideo($input: AddVideoInput!) {
    addVideoByTmdbId(input: $input) {
      id
      title
      slug
      status
      mediaType
      sourceType
      fileUrl
      tmdbId
      createdAt
      visibility
      owner {
        id
        email
        nickname
      }
      ownerId
      shares {
        id
        recipient {
          id
          email
          nickname
        }
      }
    }
  }
`;

export function useAddVideo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (variables: AddVideoInputVariables) => {
      const data = await graphqlRequest<AddVideoMutationResponse, AddVideoMutationInput>({
        query: ADD_VIDEO_MUTATION,
        variables: { input: variables },
      });
      return data.addVideoByTmdbId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customVideos"] });
    },
  });
}

