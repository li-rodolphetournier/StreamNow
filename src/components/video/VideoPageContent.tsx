"use client";

import { useVideoDetails } from "@/hooks/useVideoDetails";
import { VideoHero } from "./VideoHero";
import { VideoDetails } from "./VideoDetails";
import { VideoRecommendations } from "./VideoRecommendations";
import { Skeleton } from "@/components/shared/Skeleton";

interface VideoPageContentProps {
  videoId: number;
  mediaType: "movie" | "tv";
}

export function VideoPageContent({
  videoId,
  mediaType,
}: VideoPageContentProps) {
  const { data: video, isLoading, error } = useVideoDetails(
    videoId,
    mediaType
  );

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <Skeleton className="h-[60vh] min-h-[500px] w-full" />
        <div className="container mx-auto px-4 py-8 space-y-8">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Erreur</h1>
          <p className="text-muted-foreground">
            Impossible de charger les détails de la vidéo.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <VideoHero video={video} />
      <VideoDetails video={video} />
      {video.recommendations.length > 0 && (
        <VideoRecommendations videos={video.recommendations} />
      )}
    </div>
  );
}

