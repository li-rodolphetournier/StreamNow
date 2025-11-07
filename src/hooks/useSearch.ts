import { useQuery } from "@tanstack/react-query";
import { searchVideos, type SearchOptions } from "@/lib/api/tmdb";

/**
 * Hook pour rechercher des vidéos avec filtres
 */
export function useSearchVideos(
  query: string,
  page: number = 1,
  options?: SearchOptions
) {
  return useQuery({
    queryKey: ["search-videos", { query, page, options }],
    queryFn: () => searchVideos(query, page, options),
    enabled: query.length > 0,
    staleTime: 60 * 1000,
  });
}

export type { SearchOptions };

