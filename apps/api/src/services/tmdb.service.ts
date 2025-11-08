import axios from "axios";
import { env } from "../config/env";
import { VideoMediaType } from "../entities/Video";

interface TmdbVideoResponse {
  id: number;
  results: Array<{
    id: string;
    key: string;
    name: string;
    site: string;
    type: string;
    official: boolean;
    iso_639_1?: string;
  }>;
}

interface TmdbMovieDetails {
  id: number;
  title: string;
  name?: string;
  overview?: string;
  poster_path?: string;
  backdrop_path?: string;
  release_date?: string;
  first_air_date?: string;
  tagline?: string;
  runtime?: number;
  episode_run_time?: number[];
  videos?: TmdbVideoResponse;
  [key: string]: unknown;
}

interface TmdbSearchResultItem {
  id: number;
  media_type: "movie" | "tv" | "person" | string;
  title?: string;
  name?: string;
  overview?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path?: string;
}

export interface NormalizedTmdbPayload {
  tmdbId: number;
  title: string;
  overview?: string;
  tagline?: string;
  releaseDate?: string;
  posterUrl?: string;
  backdropUrl?: string;
  trailerUrl?: string;
  metadata: Record<string, unknown>;
}

const TMDB_BASE_URL = "https://api.themoviedb.org/3";

export class TmdbService {
  private readonly client = axios.create({
    baseURL: TMDB_BASE_URL,
    params: {
      api_key: env.tmdbApiKey,
      language: "fr-FR",
    },
  });

  async fetchDetails(
    tmdbId: number,
    mediaType: VideoMediaType
  ): Promise<NormalizedTmdbPayload> {
    const endpoint =
      mediaType === VideoMediaType.MOVIE ? `/movie/${tmdbId}` : `/tv/${tmdbId}`;

    const { data } = await this.client.get<TmdbMovieDetails>(endpoint, {
      params: {
        append_to_response: "videos,credits",
      },
    });

    if (!data) {
      throw new Error(`TMDB returned no data for ${mediaType} ${tmdbId}`);
    }

    const videos = data.videos?.results ?? [];
    const trailer =
      videos.find(
        (video) =>
          video.site === "YouTube" &&
          video.type === "Trailer" &&
          (video.official || video.iso_639_1 === "fr")
      ) ??
      videos.find(
        (video) => video.site === "YouTube" && video.type === "Trailer"
      );

    const title =
      mediaType === VideoMediaType.MOVIE ? data.title : (data.name ?? "");
    const releaseDate =
      mediaType === VideoMediaType.MOVIE
        ? data.release_date
        : data.first_air_date;

    return {
      tmdbId: data.id,
      title,
      overview: data.overview ?? undefined,
      tagline: data.tagline ?? undefined,
      releaseDate: releaseDate ?? undefined,
      posterUrl: data.poster_path
        ? `https://image.tmdb.org/t/p/w780${data.poster_path}`
        : undefined,
      backdropUrl: data.backdrop_path
        ? `https://image.tmdb.org/t/p/w1280${data.backdrop_path}`
        : undefined,
      trailerUrl: trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : undefined,
      metadata: data as Record<string, unknown>,
    };
  }

  async search(
    query: string,
    mediaType?: VideoMediaType
  ): Promise<Array<{
    id: number;
    title: string;
    overview?: string;
    releaseDate?: string;
    posterUrl?: string;
    mediaType: VideoMediaType;
  }>> {
    const { data } = await this.client.get<{ results: TmdbSearchResultItem[] }>(
      "/search/multi",
      {
        params: {
          query,
          include_adult: false,
        },
      }
    );

    const mapped = (data.results ?? [])
      .filter((item) => item.media_type === "movie" || item.media_type === "tv")
      .map((item) => {
        const itemMediaType =
          item.media_type === "movie" ? VideoMediaType.MOVIE : VideoMediaType.TV;
        const title = item.title ?? item.name ?? "";
        const releaseDate =
          item.media_type === "movie" ? item.release_date : item.first_air_date;

        return {
          id: item.id,
          title,
          overview: item.overview ?? undefined,
          releaseDate: releaseDate ?? undefined,
          posterUrl: item.poster_path
            ? `https://image.tmdb.org/t/p/w342${item.poster_path}`
            : undefined,
          mediaType: itemMediaType,
        };
      });

    if (mediaType) {
      return mapped.filter((item) => item.mediaType === mediaType);
    }

    return mapped;
  }
}

