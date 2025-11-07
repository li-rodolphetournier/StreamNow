import { useQuery } from "@tanstack/react-query";
import { getGenres } from "@/lib/api/tmdb";

export function useGenres() {
  return useQuery({
    queryKey: ["genres"],
    queryFn: getGenres,
    staleTime: 24 * 60 * 60 * 1000, // 24h
  });
}


