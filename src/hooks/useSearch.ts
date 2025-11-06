import { useQuery } from "@tanstack/react-query";
import { searchVideos } from "@/lib/api/tmdb";

/**
 * Hook pour rechercher des vidéos
 */
export function useSearchVideos(query: string, page: number = 1) {
  return useQuery({
    queryKey: ["search-videos", query, page],
    queryFn: () => searchVideos(query, page),
    enabled: query.length > 0,
  });
}

