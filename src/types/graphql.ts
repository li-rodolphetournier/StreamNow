export type GraphQLVideoStatus = "DRAFT" | "PUBLISHED";

export type GraphQLVideoMediaType = "MOVIE" | "TV";

export type GraphQLVideoSourceType = "TMDB" | "LOCAL";

export type GraphQLVideoVisibility =
  | "PRIVATE"
  | "AUTHENTICATED"
  | "FRIENDS"
  | "PUBLIC"
  | "RESTRICTED";

export type GraphQLUserRole = "ADMIN" | "EDITOR" | "VIEWER";

export type GraphQLFriendshipStatus = "pending" | "accepted" | "blocked";

export interface GraphQLUserSmall {
  id: string;
  email: string;
  nickname?: string | null;
}

export interface GraphQLVideoShare {
  id: string;
  recipient: GraphQLUserSmall;
}

export interface GraphQLFavorite {
  id: string;
  tmdbId: number;
  mediaType: GraphQLVideoMediaType;
  title: string;
  overview?: string | null;
  posterPath?: string | null;
  backdropPath?: string | null;
  releaseDate?: string | null;
  voteAverage?: number | null;
  voteCount?: number | null;
  genreIds: number[];
  createdAt: string;
}

export interface GraphQLUser extends GraphQLUserSmall {
  role: GraphQLUserRole;
  nickname?: string | null;
  avatarUrl?: string | null;
}

export interface GraphQLVideo {
  id: string;
  tmdbId?: number | null;
  title: string;
  slug: string;
  status: GraphQLVideoStatus;
  mediaType: GraphQLVideoMediaType;
  sourceType: GraphQLVideoSourceType;
  fileUrl?: string | null;
  fileSize?: number | null;
  durationSeconds?: number | null;
  ownerId?: string | null;
  tagline?: string | null;
  overview?: string | null;
  posterUrl?: string | null;
  trailerUrl?: string | null;
  releaseDate?: string | null;
  createdAt: string;
  visibility: GraphQLVideoVisibility;
  owner?: GraphQLUserSmall | null;
  shares?: GraphQLVideoShare[] | null;
}

export interface GraphQLTmdbSearchResult {
  id: number;
  title: string;
  overview?: string | null;
  releaseDate?: string | null;
  posterUrl?: string | null;
  mediaType?: GraphQLVideoMediaType | null;
}

export interface GraphQLFriend {
  id: string;
  friend: GraphQLUser;
  status: GraphQLFriendshipStatus;
  createdAt: string;
}

export interface GraphQLFriendRequest {
  id: string;
  user: GraphQLUser;
  status: GraphQLFriendshipStatus;
  createdAt: string;
}

export interface AddVideoInputVariables {
  tmdbId: number;
  mediaType: GraphQLVideoMediaType;
  status?: GraphQLVideoStatus;
}

export interface CreateLocalVideoInputVariables {
  fileUrl: string;
  mediaType: GraphQLVideoMediaType;
  status?: GraphQLVideoStatus;
  tmdbId?: number;
  title?: string;
  overview?: string;
  tagline?: string;
  releaseDate?: string;
  posterUrl?: string;
  backdropUrl?: string;
  trailerUrl?: string;
  durationSeconds?: number;
  fileSize?: number;
}

export interface UpdateVideoStatusInputVariables {
  id: string;
  status: GraphQLVideoStatus;
}

export interface ShareRecipientInputVariables {
  email?: string;
  nickname?: string;
}

export interface UpdateVideoVisibilityInputVariables {
  id: string;
  visibility: GraphQLVideoVisibility;
  recipients?: ShareRecipientInputVariables[];
}

export interface AddFavoriteInputVariables {
  tmdbId: number;
  mediaType: GraphQLVideoMediaType;
  title: string;
  overview?: string;
  posterPath?: string;
  backdropPath?: string;
  releaseDate?: string;
  voteAverage?: number;
  voteCount?: number;
  genreIds?: number[];
}

export interface RemoveFavoriteInputVariables {
  tmdbId: number;
  mediaType: GraphQLVideoMediaType;
}

export interface FriendRequestInputVariables {
  email?: string;
  nickname?: string;
}

export interface RespondFriendRequestInputVariables {
  id: string;
  accept: boolean;
}

export interface GraphQLAuthPayload {
  accessToken: string;
  refreshToken: string;
  user: GraphQLUser;
}

export interface SignInVariables {
  email: string;
  password: string;
}

export interface SignUpVariables extends SignInVariables {
  nickname?: string;
}

