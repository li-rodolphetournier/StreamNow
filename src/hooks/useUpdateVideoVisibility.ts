import { useMutation, useQueryClient } from "@tanstack/react-query";
import { graphqlRequest } from "@/lib/api/graphql";
import type {
  GraphQLVideo,
  UpdateVideoVisibilityInputVariables,
} from "@/types/graphql";

interface UpdateVideoVisibilityResponse {
  updateVideoVisibility: GraphQLVideo;
}

interface UpdateVideoVisibilityVariables {
  input: UpdateVideoVisibilityInputVariables;
}

const UPDATE_VISIBILITY_MUTATION = /* GraphQL */ `
  mutation UpdateVideoVisibility($input: UpdateVideoVisibilityInput!) {
    updateVideoVisibility(input: $input) {
      id
      tmdbId
      title
      slug
      status
      mediaType
      sourceType
      fileUrl
      fileSize
      durationSeconds
      tagline
      overview
      posterUrl
      trailerUrl
      releaseDate
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

export function useUpdateVideoVisibility() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (variables: UpdateVideoVisibilityInputVariables) => {
      const data = await graphqlRequest<
        UpdateVideoVisibilityResponse,
        UpdateVideoVisibilityVariables
      >({
        query: UPDATE_VISIBILITY_MUTATION,
        variables: { input: variables },
      });

      return data.updateVideoVisibility;
    },
    onSuccess: (video, variables) => {
      queryClient.setQueryData(["customVideo", variables.id], video);
      queryClient.invalidateQueries({ queryKey: ["customVideos"] });
    },
  });
}


