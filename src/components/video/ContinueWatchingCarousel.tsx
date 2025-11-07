"use client";

import { Button } from "@/components/ui/button";
import { VideoCard } from "./VideoCard";
import { useWatchHistory } from "@/hooks/useWatchHistory";

export function ContinueWatchingCarousel() {
  const { continueWatching, removeVideo, clear } = useWatchHistory();

  if (continueWatching.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">
          Continuer à regarder
        </h2>
        <Button variant="ghost" size="sm" onClick={clear}>
          Effacer tout
        </Button>
      </div>

      <div className="relative">
        <div
          className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth pb-4"
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
        >
          {continueWatching.map((entry) => (
            <div
              key={entry.video.id}
              className="flex-shrink-0 w-[200px] sm:w-[240px] md:w-[280px]"
            >
              <VideoCard
                video={entry.video}
                progress={entry.progress}
                onRemove={() => removeVideo(entry.video.id)}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}


