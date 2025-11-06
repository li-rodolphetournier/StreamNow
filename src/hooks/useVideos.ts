import { useQuery } from "@tanstack/react-query";
import {
  getPopularMovies,
  getPopularTVShows,
  getTrendingMovies,
  getTrendingTVShows,
} from "@/lib/api/tmdb";

/**
 * Hook pour récupérer les films populaires
 */
export function usePopularMovies(page: number = 1) {
  return useQuery({
    queryKey: ["popular-movies", page],
    queryFn: () => getPopularMovies(page),
  });
}

/**
 * Hook pour récupérer les séries TV populaires
 */
export function usePopularTVShows(page: number = 1) {
  return useQuery({
    queryKey: ["popular-tv-shows", page],
    queryFn: () => getPopularTVShows(page),
  });
}

/**
 * Hook pour récupérer les films en tendance
 */
export function useTrendingMovies(page: number = 1) {
  return useQuery({
    queryKey: ["trending-movies", page],
    queryFn: () => getTrendingMovies(page),
  });
}

/**
 * Hook pour récupérer les séries TV en tendance
 */
export function useTrendingTVShows(page: number = 1) {
  return useQuery({
    queryKey: ["trending-tv-shows", page],
    queryFn: () => getTrendingTVShows(page),
  });
}

