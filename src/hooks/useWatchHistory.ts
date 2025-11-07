import { useMemo } from "react";
import { useVideoStore } from "@/lib/store/useVideoStore";
import type { Video } from "@/types/video";

/**
 * Hook pour gérer l'historique de visionnage
 */
export function useWatchHistory() {
  const {
    watchHistory,
    addToWatchHistory,
    getWatchProgress,
    removeFromWatchHistory,
    clearWatchHistory,
  } = useVideoStore();

  const addVideo = (video: Video, progress?: number) => {
    addToWatchHistory(video, progress);
  };

  const getProgress = (videoId: number) => {
    return getWatchProgress(videoId);
  };

  const removeVideo = (videoId: number) => {
    removeFromWatchHistory(videoId);
  };

  const clear = () => {
    clearWatchHistory();
  };

  const continueWatching = useMemo(
    () =>
      watchHistory.filter((entry) => {
        const progress = entry.progress ?? 0;
        return progress >= 5 && progress < 95;
      }),
    [watchHistory]
  );

  return {
    watchHistory,
    continueWatching,
    addVideo,
    getProgress,
    removeVideo,
    clear,
  };
}

