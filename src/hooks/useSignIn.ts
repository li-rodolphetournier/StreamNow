import { useMutation, useQueryClient } from "@tanstack/react-query";
import { signIn } from "@/lib/api/auth";
import type { GraphQLAuthPayload, SignInVariables } from "@/types/graphql";

export function useSignIn() {
  const queryClient = useQueryClient();

  return useMutation<GraphQLAuthPayload, Error, SignInVariables>({
    mutationFn: async (variables) => signIn(variables),
    onSuccess: (payload) => {
      queryClient.setQueryData(["currentUser"], payload.user);
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      queryClient.invalidateQueries({ queryKey: ["customVideos"] });
    },
  });
}
