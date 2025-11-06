/**
 * Types pour les vidéos
 */

export interface Video {
  id: number;
  title: string;
  overview: string;
  posterPath: string | null;
  backdropPath: string | null;
  releaseDate: string;
  voteAverage: number;
  voteCount: number;
  genreIds: number[];
  mediaType: "movie" | "tv";
}

export interface VideoDetails extends Video {
  runtime?: number;
  seasons?: number;
  episodes?: number;
  genres: Genre[];
  productionCompanies: ProductionCompany[];
  cast: CastMember[];
  crew: CrewMember[];
  similar: Video[];
  recommendations: Video[];
}

export interface Genre {
  id: number;
  name: string;
}

export interface ProductionCompany {
  id: number;
  name: string;
  logoPath: string | null;
}

export interface CastMember {
  id: number;
  name: string;
  character: string;
  profilePath: string | null;
  order: number;
}

export interface CrewMember {
  id: number;
  name: string;
  job: string;
  department: string;
  profilePath: string | null;
}

export interface VideoCategory {
  id: string;
  name: string;
  videos: Video[];
}

