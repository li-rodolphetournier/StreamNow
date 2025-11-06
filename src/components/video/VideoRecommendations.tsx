"use client";

import { VideoCarousel } from "./VideoCarousel";
import type { Video } from "@/types/video";

interface VideoRecommendationsProps {
  videos: Video[];
}

export function VideoRecommendations({
  videos,
}: VideoRecommendationsProps) {
  if (videos.length === 0) {
    return null;
  }

  return (
    <section className="container mx-auto px-4 py-8">
      <VideoCarousel videos={videos} title="Vous aimerez aussi" />
    </section>
  );
}

