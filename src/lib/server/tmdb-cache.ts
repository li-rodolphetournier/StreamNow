"use server";

import "server-only";
import { unstable_cache } from "next/cache";
import {
  getPopularMovies as fetchPopularMovies,
  getPopularTVShows as fetchPopularTVShows,
  getTrendingMovies as fetchTrendingMovies,
} from "@/lib/api/tmdb";

const CACHE_TTL_SECONDS = 60 * 10; // 10 minutes

const cachedTrendingMovies = unstable_cache(
  async (page: number) => fetchTrendingMovies(page),
  ["tmdb", "trending-movies"],
  {
    revalidate: CACHE_TTL_SECONDS,
    tags: ["tmdb:trending-movies"],
  }
);

const cachedPopularMovies = unstable_cache(
  async (page: number) => fetchPopularMovies(page),
  ["tmdb", "popular-movies"],
  {
    revalidate: CACHE_TTL_SECONDS,
    tags: ["tmdb:popular-movies"],
  }
);

const cachedPopularTVShows = unstable_cache(
  async (page: number) => fetchPopularTVShows(page),
  ["tmdb", "popular-tv-shows"],
  {
    revalidate: CACHE_TTL_SECONDS,
    tags: ["tmdb:popular-tv-shows"],
  }
);

export async function getCachedTrendingMovies(page: number = 1) {
  return cachedTrendingMovies(page);
}

export async function getCachedPopularMovies(page: number = 1) {
  return cachedPopularMovies(page);
}

export async function getCachedPopularTVShows(page: number = 1) {
  return cachedPopularTVShows(page);
}

export async function getHomePageData() {
  const [trendingMovies, popularMovies, popularTVShows] = await Promise.all([
    getCachedTrendingMovies(1),
    getCachedPopularMovies(1),
    getCachedPopularTVShows(1),
  ]);

  return {
    trendingMovies,
    popularMovies,
    popularTVShows,
  };
}


