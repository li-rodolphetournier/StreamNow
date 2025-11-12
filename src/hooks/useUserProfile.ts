import { useQuery } from "@tanstack/react-query";
import { profileApi } from "@/lib/api/profile";
import type { GraphQLUser } from "@/types/graphql";

export function useUserProfile(userId: string | null | undefined, enabled = true) {
  return useQuery<GraphQLUser | null, Error>({
    queryKey: ["user-profile", userId],
    queryFn: () => {
      if (!userId) {
        return Promise.resolve(null);
      }
      return profileApi.fetchUserById(userId);
    },
    enabled: enabled && Boolean(userId),
    staleTime: 60 * 1000,
  });
}
