import { useQuery } from "@tanstack/react-query";
import { getMovieDetails, getTVShowDetails } from "@/lib/api/tmdb";
import type { Video } from "@/types/video";

/**
 * Hook pour récupérer les détails d'une vidéo (film ou série)
 */
export function useVideoDetails(videoId: number, mediaType: "movie" | "tv") {
  return useQuery({
    queryKey: ["video-details", videoId, mediaType],
    queryFn: () =>
      mediaType === "movie"
        ? getMovieDetails(videoId)
        : getTVShowDetails(videoId),
    enabled: !!videoId,
  });
}

/**
 * Hook pour récupérer les détails d'une vidéo à partir d'un objet Video
 */
export function useVideoDetailsFromVideo(video: Video | null) {
  return useQuery({
    queryKey: ["video-details", video?.id, video?.mediaType],
    queryFn: () => {
      if (!video) throw new Error("Video is required");
      return video.mediaType === "movie"
        ? getMovieDetails(video.id)
        : getTVShowDetails(video.id);
    },
    enabled: !!video,
  });
}

