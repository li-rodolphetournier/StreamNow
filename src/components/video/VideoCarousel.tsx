"use client";

import { useId, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VideoCard } from "./VideoCard";
import type { Video } from "@/types/video";
import { cn } from "@/lib/utils";

interface VideoCarouselProps {
  videos: Video[];
  title: string;
  priority?: boolean;
}

export function VideoCarousel({
  videos,
  title,
  priority = false,
}: VideoCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const carouselId = useId();
  const listId = `${carouselId}-list`;

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;

    const scrollAmount = 300;
    const currentScroll = scrollRef.current.scrollLeft;
    const targetScroll =
      direction === "left"
        ? currentScroll - scrollAmount
        : currentScroll + scrollAmount;

    scrollRef.current.scrollTo({
      left: targetScroll,
      behavior: "smooth",
    });
  };

  if (videos.length === 0) {
    return null;
  }

  return (
    <section
      className="space-y-4"
      aria-labelledby={`${carouselId}-title`}
      role="region"
    >
      <div className="flex items-center justify-between">
        <h2
          id={`${carouselId}-title`}
          className="text-2xl font-bold tracking-tight"
        >
          {title}
        </h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => scroll("left")}
            aria-label="Défiler vers la gauche"
            aria-controls={listId}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => scroll("right")}
            aria-label="Défiler vers la droite"
            aria-controls={listId}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="relative">
        <div
          ref={scrollRef}
          role="list"
          id={listId}
          aria-label={title}
          className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth pb-4"
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
        >
          {videos.map((video, index) => (
            <div
              role="listitem"
              key={video.id}
              className={cn(
                "flex-shrink-0 w-[200px] sm:w-[240px] md:w-[280px]",
                "first:pl-0 last:pr-0"
              )}
            >
              <VideoCard
                video={video}
                priority={priority && index < 5}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

