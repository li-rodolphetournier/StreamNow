import { useQuery } from "@tanstack/react-query";
import { fetchCurrentUser } from "@/lib/api/auth";
import type { GraphQLUser } from "@/types/graphql";

export function useCurrentUser() {
  return useQuery<GraphQLUser | null, Error>({
    queryKey: ["currentUser"],
    queryFn: fetchCurrentUser,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}
