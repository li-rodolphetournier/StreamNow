import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { graphqlRequest } from "@/lib/api/graphql";
import type {
  AddFavoriteInputVariables,
  GraphQLFavorite,
  RemoveFavoriteInputVariables,
} from "@/types/graphql";
import type { Video } from "@/types/video";
import { useCurrentUser } from "./useCurrentUser";

interface FavoritesQueryResponse {
  favorites: GraphQLFavorite[];
}

interface AddFavoriteResponse {
  addFavorite: GraphQLFavorite;
}

interface RemoveFavoriteResponse {
  removeFavorite: boolean;
}

const FAVORITES_QUERY = /* GraphQL */ `
  query Favorites {
    favorites {
      id
      tmdbId
      mediaType
      title
      overview
      posterPath
      backdropPath
      releaseDate
      voteAverage
      voteCount
      genreIds
      createdAt
    }
  }
`;

const ADD_FAVORITE_MUTATION = /* GraphQL */ `
  mutation AddFavorite($input: AddFavoriteInput!) {
    addFavorite(input: $input) {
      id
      tmdbId
      mediaType
      title
      overview
      posterPath
      backdropPath
      releaseDate
      voteAverage
      voteCount
      genreIds
      createdAt
    }
  }
`;

const REMOVE_FAVORITE_MUTATION = /* GraphQL */ `
  mutation RemoveFavorite($input: RemoveFavoriteInput!) {
    removeFavorite(input: $input)
  }
`;

const mapFavoriteToVideo = (favorite: GraphQLFavorite): Video => ({
  id: favorite.tmdbId,
  title: favorite.title,
  overview: favorite.overview ?? "",
  posterPath: favorite.posterPath ?? null,
  backdropPath: favorite.backdropPath ?? null,
  releaseDate: favorite.releaseDate ?? "",
  voteAverage: favorite.voteAverage ?? 0,
  voteCount: favorite.voteCount ?? 0,
  genreIds: favorite.genreIds,
  mediaType: favorite.mediaType === "MOVIE" ? "movie" : "tv",
  popularity: undefined,
});

const mapVideoToFavoriteInput = (video: Video): AddFavoriteInputVariables => ({
  tmdbId: video.id,
  mediaType: video.mediaType === "movie" ? "MOVIE" : "TV",
  title: video.title,
  overview: video.overview,
  posterPath: video.posterPath ?? undefined,
  backdropPath: video.backdropPath ?? undefined,
  releaseDate: video.releaseDate ?? undefined,
  voteAverage: video.voteAverage ?? undefined,
  voteCount: video.voteCount ?? undefined,
  genreIds: video.genreIds,
});

export function useFavorites() {
  const currentUserQuery = useCurrentUser();
  const isAuthenticated = Boolean(currentUserQuery.data);
  const queryClient = useQueryClient();

  const favoritesQuery = useQuery({
    queryKey: ["favorites"],
    enabled: isAuthenticated,
    queryFn: async () => {
      const data = await graphqlRequest<FavoritesQueryResponse>({
        query: FAVORITES_QUERY,
      });
      return data.favorites;
    },
    staleTime: 1000 * 60,
  });

  const addMutation = useMutation({
    mutationFn: async (input: AddFavoriteInputVariables) => {
      const data = await graphqlRequest<AddFavoriteResponse, { input: AddFavoriteInputVariables }>({
        query: ADD_FAVORITE_MUTATION,
        variables: { input },
      });
      return data.addFavorite;
    },
    onSuccess: (favorite) => {
      queryClient.setQueryData<GraphQLFavorite[] | undefined>(["favorites"], (current) => {
        if (!current) {
          return [favorite];
        }
        const withoutDuplicate = current.filter(
          (item) =>
            !(item.tmdbId === favorite.tmdbId && item.mediaType === favorite.mediaType)
        );
        return [favorite, ...withoutDuplicate];
      });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (input: RemoveFavoriteInputVariables) => {
      await graphqlRequest<RemoveFavoriteResponse, { input: RemoveFavoriteInputVariables }>({
        query: REMOVE_FAVORITE_MUTATION,
        variables: { input },
      });
      return input;
    },
    onSuccess: (input) => {
      queryClient.setQueryData<GraphQLFavorite[] | undefined>(["favorites"], (current) => {
        if (!current) {
          return current;
        }
        return current.filter(
          (favorite) =>
            !(
              favorite.tmdbId === input.tmdbId && favorite.mediaType === input.mediaType
            )
        );
      });
    },
  });

  const favorites = useMemo(
    () => (favoritesQuery.data ?? []).map(mapFavoriteToVideo),
    [favoritesQuery.data]
  );

  const favoritesByMediaType = useMemo(() => {
    return favorites.reduce(
      (acc, video) => {
        if (video.mediaType === "movie") {
          acc.movies.push(video);
        } else {
          acc.series.push(video);
        }
        return acc;
      },
      { movies: [] as Video[], series: [] as Video[] }
    );
  }, [favorites]);

  const isFavorite = (videoId: number): boolean => {
    return (favoritesQuery.data ?? []).some((favorite) => favorite.tmdbId === videoId);
  };

  const add = (video: Video) => {
    if (!isAuthenticated || addMutation.status === "pending") {
      return;
    }
    addMutation.mutate(mapVideoToFavoriteInput(video));
  };

  const remove = (video: Video | number) => {
    if (!isAuthenticated || removeMutation.status === "pending") {
      return;
    }
    const tmdbId = typeof video === "number" ? video : video.id;
    const mediaType =
      typeof video === "number"
        ? favoritesQuery.data?.find((fav) => fav.tmdbId === tmdbId)?.mediaType ?? "MOVIE"
        : video.mediaType === "movie"
          ? "MOVIE"
          : "TV";

    removeMutation.mutate({ tmdbId, mediaType });
  };

  return {
    favorites,
    favoritesByMediaType,
    add,
    remove,
    isFavorite,
    isAuthenticated,
    isLoading: currentUserQuery.isLoading || favoritesQuery.isLoading,
    isError: currentUserQuery.isError || favoritesQuery.isError,
    error: favoritesQuery.error ?? currentUserQuery.error ?? null,
    addFavoriteStatus: addMutation.status,
    removeFavoriteStatus: removeMutation.status,
  };
}

