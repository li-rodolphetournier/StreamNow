"use client";

import { VideoCard } from "./VideoCard";
import type { Video } from "@/types/video";

interface VideoGridProps {
  videos: Video[];
  title?: string;
  priority?: boolean;
}

export function VideoGrid({ videos, title, priority = false }: VideoGridProps) {
  if (videos.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        <p>Aucune vidéo disponible</p>
      </div>
    );
  }

  return (
    <section className="space-y-4">
      {title && (
        <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
      )}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {videos.map((video, index) => (
          <VideoCard
            key={video.id}
            video={video}
            priority={priority && index < 5}
          />
        ))}
      </div>
    </section>
  );
}

