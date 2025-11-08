import { useMutation, useQueryClient } from "@tanstack/react-query";
import { signUp } from "@/lib/api/auth";
import type { GraphQLAuthPayload, SignUpVariables } from "@/types/graphql";

export function useSignUp() {
  const queryClient = useQueryClient();

  return useMutation<GraphQLAuthPayload, Error, SignUpVariables>({
    mutationFn: async (variables) => signUp(variables),
    onSuccess: (payload) => {
      queryClient.setQueryData(["currentUser"], payload.user);
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      queryClient.invalidateQueries({ queryKey: ["customVideos"] });
    },
  });
}
