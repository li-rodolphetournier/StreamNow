import { useMutation, useQueryClient } from "@tanstack/react-query";
import { graphqlRequest } from "@/lib/api/graphql";
import type {
  CreateLocalVideoInputVariables,
  GraphQLVideo,
} from "@/types/graphql";

interface CreateLocalVideoResponse {
  createLocalVideo: GraphQLVideo;
}

const CREATE_LOCAL_VIDEO_MUTATION = /* GraphQL */ `
  mutation CreateLocalVideo($input: CreateLocalVideoInput!) {
    createLocalVideo(input: $input) {
      id
      title
      sourceType
      fileUrl
      status
      mediaType
      slug
      visibility
      tmdbId
      createdAt
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

export function useCreateLocalVideo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (variables: CreateLocalVideoInputVariables) => {
      const data = await graphqlRequest<CreateLocalVideoResponse>({
        query: CREATE_LOCAL_VIDEO_MUTATION,
        variables: { input: variables },
      });
      return data.createLocalVideo;
    },
    onSuccess: (video) => {
      queryClient.invalidateQueries({ queryKey: ["customVideos"] });
      queryClient.invalidateQueries({ queryKey: ["customVideo", video.id] });
    },
  });
}
