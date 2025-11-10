import { useQuery } from "@tanstack/react-query";
import { searchLibraryVideos } from "@/lib/api/library";
import type { GraphQLVideo } from "@/types/graphql";

export function useLibrarySearch(query: string) {
  return useQuery<GraphQLVideo[]>({
    queryKey: ["library-search", query],
    enabled: query.trim().length > 0,
    queryFn: () => searchLibraryVideos(query),
    staleTime: 1000 * 15,
  });
}


