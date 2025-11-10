import { useMutation, useQueryClient } from "@tanstack/react-query";
import { signOut } from "@/lib/api/auth";
import { clearAccessToken } from "@/lib/auth/tokens";

export function useSignOut() {
  const queryClient = useQueryClient();

  return useMutation<boolean, Error>({
    mutationFn: async () => signOut(),
    onSuccess: () => {
      clearAccessToken();
      queryClient.setQueryData(["currentUser"], null);
      queryClient.removeQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["customVideos"] });
    },
    onSettled: () => {
      clearAccessToken();
    },
  });
}
