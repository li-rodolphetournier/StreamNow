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
    clearWatchHistory,
  } = useVideoStore();

  const addVideo = (video: Video, progress?: number) => {
    addToWatchHistory(video, progress);
  };

  const getProgress = (videoId: number) => {
    return getWatchProgress(videoId);
  };

  const clear = () => {
    clearWatchHistory();
  };

  return {
    watchHistory,
    addVideo,
    getProgress,
    clear,
  };
}

