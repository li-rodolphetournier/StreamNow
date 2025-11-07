import axios from "axios";
import type {
  TMDBResponse,
  TMDBMovie,
  TMDBTVShow,
  TMDBVideoDetails,
  TMDBGenre,
} from "@/types/api";
import type { Video, VideoDetails } from "@/types/video";

const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p";

// TODO: Ajouter votre clé API TMDB dans les variables d'environnement
const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY || "";

export type SearchSortKey = "popularity" | "vote_average" | "release_date";

export type SearchOptions = {
  mediaType?: "movie" | "tv" | "multi";
  genre?: number;
  sortBy?: SearchSortKey;
};

if (!TMDB_API_KEY) {
  console.warn(
    "⚠️ NEXT_PUBLIC_TMDB_API_KEY n'est pas définie. Les appels API TMDB échoueront."
  );
}

const apiClient = axios.create({
  baseURL: TMDB_BASE_URL,
  params: {
    api_key: TMDB_API_KEY,
    language: "fr-FR",
  },
});

/**
 * Convertit un film TMDB en Video
 */
function mapMovieToVideo(movie: TMDBMovie): Video {
  return {
    id: movie.id,
    title: movie.title,
    overview: movie.overview,
    posterPath: movie.poster_path,
    backdropPath: movie.backdrop_path,
    releaseDate: movie.release_date,
    voteAverage: movie.vote_average,
    voteCount: movie.vote_count,
    genreIds: movie.genre_ids,
    mediaType: "movie",
    popularity: movie.popularity,
  };
}

/**
 * Convertit une série TV TMDB en Video
 */
function mapTVShowToVideo(tvShow: TMDBTVShow): Video {
  return {
    id: tvShow.id,
    title: tvShow.name,
    overview: tvShow.overview,
    posterPath: tvShow.poster_path,
    backdropPath: tvShow.backdrop_path,
    releaseDate: tvShow.first_air_date,
    voteAverage: tvShow.vote_average,
    voteCount: tvShow.vote_count,
    genreIds: tvShow.genre_ids,
    mediaType: "tv",
    popularity: tvShow.popularity,
  };
}

/**
 * Récupère l'URL complète d'une image TMDB
 */
export function getImageUrl(
  path: string | null,
  size: "w200" | "w300" | "w500" | "w780" | "w1280" | "original" = "w500"
): string {
  if (!path) {
    return "/placeholder-image.jpg"; // TODO: Ajouter une image placeholder
  }
  return `${TMDB_IMAGE_BASE_URL}/${size}${path}`;
}

/**
 * Récupère les films populaires
 */
export async function getPopularMovies(
  page: number = 1
): Promise<{ videos: Video[]; totalPages: number }> {
  const response = await apiClient.get<TMDBResponse<TMDBMovie>>(
    "/movie/popular",
    { params: { page } }
  );
  return {
    videos: response.data.results.map(mapMovieToVideo),
    totalPages: response.data.total_pages,
  };
}

/**
 * Récupère les séries TV populaires
 */
export async function getPopularTVShows(
  page: number = 1
): Promise<{ videos: Video[]; totalPages: number }> {
  const response = await apiClient.get<TMDBResponse<TMDBTVShow>>(
    "/tv/popular",
    { params: { page } }
  );
  return {
    videos: response.data.results.map(mapTVShowToVideo),
    totalPages: response.data.total_pages,
  };
}

/**
 * Récupère les films en tendance
 */
export async function getTrendingMovies(
  page: number = 1
): Promise<{ videos: Video[]; totalPages: number }> {
  const response = await apiClient.get<TMDBResponse<TMDBMovie>>(
    "/trending/movie/day",
    { params: { page } }
  );
  return {
    videos: response.data.results.map(mapMovieToVideo),
    totalPages: response.data.total_pages,
  };
}

/**
 * Récupère les séries TV en tendance
 */
export async function getTrendingTVShows(
  page: number = 1
): Promise<{ videos: Video[]; totalPages: number }> {
  const response = await apiClient.get<TMDBResponse<TMDBTVShow>>(
    "/trending/tv/day",
    { params: { page } }
  );
  return {
    videos: response.data.results.map(mapTVShowToVideo),
    totalPages: response.data.total_pages,
  };
}

/**
 * Recherche des vidéos (films et séries)
 */
export async function searchVideos(
  query: string,
  page: number = 1,
  options?: SearchOptions
): Promise<{ videos: Video[]; totalPages: number }> {
  const response = await apiClient.get<TMDBResponse<TMDBMovie | TMDBTVShow>>(
    "/search/multi",
    { params: { query, page } }
  );

  const videos: Video[] = response.data.results
    .filter((item) => {
      const itemWithType = item as TMDBMovie | TMDBTVShow;
      const isValidType =
        itemWithType.media_type === "movie" || itemWithType.media_type === "tv";

      if (!isValidType) return false;

      if (options?.mediaType && options.mediaType !== "multi") {
        return itemWithType.media_type === options.mediaType;
      }

      if (options?.genre) {
        return itemWithType.genre_ids?.includes(options.genre);
      }

      return true;
    })
    .map((item) => {
      const itemWithType = item as TMDBMovie | TMDBTVShow;
      if (itemWithType.media_type === "movie") {
        return mapMovieToVideo(item as TMDBMovie);
      }
      return mapTVShowToVideo(item as TMDBTVShow);
    });

  const sortedVideos = sortVideos(videos, options?.sortBy);

  return {
    videos: sortedVideos,
    totalPages: response.data.total_pages,
  };
}

/**
 * Récupère les genres disponibles pour films et séries
 */
export async function getGenres(): Promise<{
  movieGenres: TMDBGenre[];
  tvGenres: TMDBGenre[];
}> {
  const [movies, tv] = await Promise.all([
    apiClient.get<{ genres: TMDBGenre[] }>("/genre/movie/list"),
    apiClient.get<{ genres: TMDBGenre[] }>("/genre/tv/list"),
  ]);

  return {
    movieGenres: movies.data.genres,
    tvGenres: tv.data.genres,
  };
}

/**
 * Récupère les détails d'un film
 */
export async function getMovieDetails(id: number): Promise<VideoDetails> {
  const response = await apiClient.get<TMDBVideoDetails>(`/movie/${id}`, {
    params: { append_to_response: "credits,similar,recommendations" },
  });

  const details: VideoDetails = {
    id: response.data.id,
    title: response.data.title || "",
    overview: response.data.overview,
    posterPath: response.data.poster_path,
    backdropPath: response.data.backdrop_path,
    releaseDate: response.data.release_date || "",
    voteAverage: response.data.vote_average,
    voteCount: response.data.vote_count,
    genreIds: response.data.genres.map((g) => g.id),
    mediaType: "movie",
    popularity: response.data.popularity,
    runtime: response.data.runtime,
    genres: response.data.genres.map((g) => ({
      id: g.id,
      name: g.name,
    })),
    productionCompanies: response.data.production_companies.map((c) => ({
      id: c.id,
      name: c.name,
      logoPath: c.logo_path,
    })),
    cast: response.data.credits.cast.map((c) => ({
      id: c.id,
      name: c.name,
      character: c.character,
      profilePath: c.profile_path,
      order: c.order,
    })),
    crew: response.data.credits.crew.map((c) => ({
      id: c.id,
      name: c.name,
      job: c.job,
      department: c.department,
      profilePath: c.profile_path,
    })),
    similar:
      response.data.similar?.results
        .filter((item) => "title" in item)
        .map((item) => mapMovieToVideo(item as TMDBMovie)) || [],
    recommendations:
      response.data.recommendations?.results
        .filter((item) => "title" in item)
        .map((item) => mapMovieToVideo(item as TMDBMovie)) || [],
  };

  return details;
}

/**
 * Récupère les détails d'une série TV
 */
export async function getTVShowDetails(id: number): Promise<VideoDetails> {
  const response = await apiClient.get<TMDBVideoDetails>(`/tv/${id}`, {
    params: { append_to_response: "credits,similar,recommendations" },
  });

  const details: VideoDetails = {
    id: response.data.id,
    title: response.data.name || "",
    overview: response.data.overview,
    posterPath: response.data.poster_path,
    backdropPath: response.data.backdrop_path,
    releaseDate: response.data.first_air_date || "",
    voteAverage: response.data.vote_average,
    voteCount: response.data.vote_count,
    genreIds: response.data.genres.map((g) => g.id),
    mediaType: "tv",
    popularity: response.data.popularity,
    seasons: response.data.number_of_seasons,
    episodes: response.data.number_of_episodes,
    genres: response.data.genres.map((g) => ({
      id: g.id,
      name: g.name,
    })),
    productionCompanies: response.data.production_companies.map((c) => ({
      id: c.id,
      name: c.name,
      logoPath: c.logo_path,
    })),
    cast: response.data.credits.cast.map((c) => ({
      id: c.id,
      name: c.name,
      character: c.character,
      profilePath: c.profile_path,
      order: c.order,
    })),
    crew: response.data.credits.crew.map((c) => ({
      id: c.id,
      name: c.name,
      job: c.job,
      department: c.department,
      profilePath: c.profile_path,
    })),
    similar:
      response.data.similar?.results
        .filter((item) => "name" in item)
        .map((item) => mapTVShowToVideo(item as TMDBTVShow)) || [],
    recommendations:
      response.data.recommendations?.results
        .filter((item) => "name" in item)
        .map((item) => mapTVShowToVideo(item as TMDBTVShow)) || [],
  };

  return details;
}

function sortVideos(videos: Video[], sortBy?: SearchSortKey) {
  if (!sortBy) return videos;

  const sorted = [...videos];

  switch (sortBy) {
    case "popularity":
      sorted.sort(
        (a, b) => (b.popularity ?? 0) - (a.popularity ?? 0)
      );
      break;
    case "vote_average":
      sorted.sort((a, b) => b.voteAverage - a.voteAverage);
      break;
    case "release_date":
      sorted.sort(
        (a, b) =>
          (b.releaseDate ? new Date(b.releaseDate).getTime() : 0) -
          (a.releaseDate ? new Date(a.releaseDate).getTime() : 0)
      );
      break;
    default:
      break;
  }

  return sorted;
}

/**
 * Récupère les vidéos (trailers) d'un film
 */
export async function getMovieVideos(id: number): Promise<string | null> {
  try {
    const response = await apiClient.get<{
      id: number;
      results: Array<{
        key: string;
        site: string;
        type: string;
        official: boolean;
      }>;
    }>(`/movie/${id}/videos`);

    // Chercher un trailer officiel YouTube
    const trailer = response.data.results.find(
      (v) => v.site === "YouTube" && v.type === "Trailer" && v.official
    );

    // Sinon, prendre le premier trailer YouTube
    const youtubeTrailer = response.data.results.find(
      (v) => v.site === "YouTube" && v.type === "Trailer"
    );

    if (trailer || youtubeTrailer) {
      return `https://www.youtube.com/watch?v=${trailer?.key || youtubeTrailer?.key}`;
    }

    return null;
  } catch (error) {
    console.error("Error fetching movie videos:", error);
    return null;
  }
}

/**
 * Récupère les vidéos (trailers) d'une série TV
 */
export async function getTVShowVideos(id: number): Promise<string | null> {
  try {
    const response = await apiClient.get<{
      id: number;
      results: Array<{
        key: string;
        site: string;
        type: string;
        official: boolean;
      }>;
    }>(`/tv/${id}/videos`);

    // Chercher un trailer officiel YouTube
    const trailer = response.data.results.find(
      (v) => v.site === "YouTube" && v.type === "Trailer" && v.official
    );

    // Sinon, prendre le premier trailer YouTube
    const youtubeTrailer = response.data.results.find(
      (v) => v.site === "YouTube" && v.type === "Trailer"
    );

    if (trailer || youtubeTrailer) {
      return `https://www.youtube.com/watch?v=${trailer?.key || youtubeTrailer?.key}`;
    }

    return null;
  } catch (error) {
    console.error("Error fetching TV show videos:", error);
    return null;
  }
}
