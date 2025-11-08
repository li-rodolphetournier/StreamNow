import { useMutation, useQueryClient } from "@tanstack/react-query";
import { graphqlRequest } from "@/lib/api/graphql";
import type { GraphQLVideo, GraphQLVideoStatus } from "@/types/graphql";

interface UpdateVideoStatusVariables {
  id: string;
  status: GraphQLVideoStatus;
}

interface UpdateVideoStatusResponse {
  updateVideoStatus: Pick<GraphQLVideo, "id" | "status">;
}

const UPDATE_VIDEO_STATUS_MUTATION = /* GraphQL */ `
  mutation UpdateVideoStatus($input: UpdateVideoStatusInput!) {
    updateVideoStatus(input: $input) {
      id
      status
    }
  }
`;

export function useUpdateVideoStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (variables: UpdateVideoStatusVariables) => {
      const data = await graphqlRequest<UpdateVideoStatusResponse>({
        query: UPDATE_VIDEO_STATUS_MUTATION,
        variables: { input: variables },
      });
      return data.updateVideoStatus;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["customVideos"] });
      queryClient.invalidateQueries({ queryKey: ["customVideo", data.id] });
    },
  });
}


