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
const USE_TMDB_MOCKS =
  process.env.NEXT_PUBLIC_USE_MOCK_TMDB === "true" ||
  process.env.TMDB_USE_MOCKS === "true";

export type SearchSortKey = "popularity" | "vote_average" | "release_date";

export type SearchOptions = {
  mediaType?: "movie" | "tv" | "multi";
  genre?: number;
  sortBy?: SearchSortKey;
};

if (!TMDB_API_KEY && !USE_TMDB_MOCKS) {
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

const MOCK_MOVIE: Video = {
  id: 100,
  title: "Mock Movie",
  overview: "Un film fictif utilisé pour les tests automatisés.",
  posterPath: "/mock-poster.jpg",
  backdropPath: "/mock-backdrop.jpg",
  releaseDate: "2024-01-01",
  voteAverage: 8.5,
  voteCount: 1200,
  genreIds: [28, 12],
  mediaType: "movie",
  popularity: 300,
};

const MOCK_TV_SHOW: Video = {
  id: 200,
  title: "Mock Show",
  overview: "Une série fictive utilisée pour les tests automatisés.",
  posterPath: "/mock-show-poster.jpg",
  backdropPath: "/mock-show-backdrop.jpg",
  releaseDate: "2023-09-15",
  voteAverage: 7.9,
  voteCount: 640,
  genreIds: [18],
  mediaType: "tv",
  popularity: 180,
};

const MOCK_MOVIE_DETAILS: VideoDetails = {
  ...MOCK_MOVIE,
  runtime: 122,
  genres: [
    { id: 28, name: "Action" },
    { id: 12, name: "Aventure" },
  ],
  productionCompanies: [
    {
      id: 1,
      name: "Mock Studio",
      logoPath: "/mock-studio-logo.png",
    },
  ],
  cast: [
    {
      id: 10,
      name: "Mock Actor",
      character: "Héro",
      profilePath: "/mock-actor.png",
      order: 0,
    },
  ],
  crew: [
    {
      id: 11,
      name: "Mock Director",
      job: "Director",
      department: "Production",
      profilePath: "/mock-director.png",
    },
  ],
  similar: [],
  recommendations: [],
};

const MOCK_TV_DETAILS: VideoDetails = {
  ...MOCK_TV_SHOW,
  seasons: 3,
  episodes: 24,
  genres: [{ id: 18, name: "Drame" }],
  productionCompanies: [
    {
      id: 2,
      name: "Mock Network",
      logoPath: "/mock-network-logo.png",
    },
  ],
  cast: [
    {
      id: 20,
      name: "Mock Actress",
      character: "Protagoniste",
      profilePath: "/mock-actress.png",
      order: 0,
    },
  ],
  crew: [
    {
      id: 21,
      name: "Mock Showrunner",
      job: "Producer",
      department: "Production",
      profilePath: "/mock-showrunner.png",
    },
  ],
  similar: [],
  recommendations: [],
};

const MOCK_MOVIE_GENRES: TMDBGenre[] = [
  { id: 28, name: "Action" },
  { id: 12, name: "Aventure" },
];

const MOCK_TV_GENRES: TMDBGenre[] = [{ id: 18, name: "Drame" }];

const MOCK_TRAILER_KEY = "mock-trailer-key";

function buildMockList(videos: Video[]): { videos: Video[]; totalPages: number } {
  return { videos, totalPages: 1 };
}

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
  if (USE_TMDB_MOCKS) {
    return buildMockList([MOCK_MOVIE]);
  }
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
  if (USE_TMDB_MOCKS) {
    return buildMockList([MOCK_TV_SHOW]);
  }
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
  if (USE_TMDB_MOCKS) {
    return buildMockList([MOCK_MOVIE]);
  }
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
  if (USE_TMDB_MOCKS) {
    return buildMockList([MOCK_TV_SHOW]);
  }
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
  if (USE_TMDB_MOCKS) {
    const catalog = [MOCK_MOVIE, MOCK_TV_SHOW];
    const results = catalog.filter((item) => {
      const matchesQuery = item.title.toLowerCase().includes(query.toLowerCase());
      if (!matchesQuery) {
        return false;
      }

      if (options?.mediaType && options.mediaType !== "multi") {
        return item.mediaType === options.mediaType;
      }

      if (options?.genre) {
        return item.genreIds.includes(options.genre);
      }

      return true;
    });

    return {
      videos: results,
      totalPages: results.length > 0 ? 1 : 0,
    };
  }
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
  if (USE_TMDB_MOCKS) {
    return {
      movieGenres: MOCK_MOVIE_GENRES,
      tvGenres: MOCK_TV_GENRES,
    };
  }
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
  if (USE_TMDB_MOCKS) {
    return {
      ...MOCK_MOVIE_DETAILS,
      id,
    };
  }
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
  if (USE_TMDB_MOCKS) {
    return {
      ...MOCK_TV_DETAILS,
      id,
    };
  }
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
  if (USE_TMDB_MOCKS) {
    return MOCK_TRAILER_KEY;
  }
  try {
    const trailer = await fetchVideos(`/movie/${id}/videos`);
    if (trailer) return trailer;

    return await fetchVideos(`/movie/${id}/videos`, "en-US");
  } catch (error) {
    console.error("Error fetching movie videos:", error);
    return null;
  }
}

/**
 * Récupère les vidéos (trailers) d'une série TV
 */
export async function getTVShowVideos(id: number): Promise<string | null> {
  if (USE_TMDB_MOCKS) {
    return MOCK_TRAILER_KEY;
  }
  try {
    const trailer = await fetchVideos(`/tv/${id}/videos`);
    if (trailer) return trailer;

    return await fetchVideos(`/tv/${id}/videos`, "en-US");
  } catch (error) {
    console.error("Error fetching TV show videos:", error);
    return null;
  }
}

async function fetchVideos(endpoint: string, languageOverride?: string) {
  if (USE_TMDB_MOCKS) {
    return MOCK_TRAILER_KEY;
  }
  const response = await apiClient.get<{
    id: number;
    results: Array<{
      key: string;
      site: string;
      type: string;
      official: boolean;
    }>;
  }>(endpoint, {
    params: {
      include_video_language: "fr,en",
      ...(languageOverride ? { language: languageOverride } : {}),
    },
  });

  const results = response.data.results.filter(
    (video) => video.site === "YouTube" && video.type === "Trailer"
  );

  const official = results.find((video) => video.official);
  const any = results[0];

  if (!official && !any) {
    return null;
  }

  const selected = official ?? any;
  return `https://www.youtube.com/watch?v=${selected.key}`;
}
