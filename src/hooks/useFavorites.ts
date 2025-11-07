import { useMemo } from "react";
import { useVideoStore } from "@/lib/store/useVideoStore";
import type { Video } from "@/types/video";

/**
 * Hook pour gérer les favoris et la watchlist
 */
export function useFavorites() {
  const {
    favorites,
    addToFavorites,
    removeFromFavorites,
    clearFavorites,
    isFavorite,
  } = useVideoStore();

  const add = (video: Video) => addToFavorites(video);
  const remove = (videoId: number) => removeFromFavorites(videoId);
  const clear = () => clearFavorites();

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

  return {
    favorites,
    favoritesByMediaType,
    add,
    remove,
    clear,
    isFavorite,
  };
}


