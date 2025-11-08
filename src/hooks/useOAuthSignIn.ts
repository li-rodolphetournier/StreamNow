import { useMutation, useQueryClient } from "@tanstack/react-query";
import { oauthSignIn } from "@/lib/api/auth";
import type { GraphQLAuthPayload } from "@/types/graphql";

type OAuthVariables = {
  provider: "GOOGLE" | "FACEBOOK";
  code: string;
  redirectUri?: string;
};

export function useOAuthSignIn() {
  const queryClient = useQueryClient();

  return useMutation<GraphQLAuthPayload, Error, OAuthVariables>({
    mutationFn: async (variables) => oauthSignIn(variables),
    onSuccess: (payload) => {
      queryClient.setQueryData(["currentUser"], payload.user);
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      queryClient.invalidateQueries({ queryKey: ["customVideos"] });
    },
  });
}
