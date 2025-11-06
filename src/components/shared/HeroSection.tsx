"use client";

import Image from "next/image";
import Link from "next/link";
import { Play, Plus, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getImageUrl } from "@/lib/api/tmdb";
import type { Video } from "@/types/video";
import { useVideoStore } from "@/lib/store/useVideoStore";
import { cn } from "@/lib/utils";

interface HeroSectionProps {
  video: Video;
}

export function HeroSection({ video }: HeroSectionProps) {
  const { isFavorite, addToFavorites, removeFromFavorites } = useVideoStore();
  const isFav = isFavorite(video.id);

  const backdropUrl = getImageUrl(video.backdropPath, "w1280");
  const year = video.releaseDate
    ? new Date(video.releaseDate).getFullYear()
    : null;

  const handleFavoriteClick = () => {
    if (isFav) {
      removeFromFavorites(video.id);
    } else {
      addToFavorites(video);
    }
  };

  return (
    <div className="relative h-[80vh] min-h-[600px] w-full overflow-hidden">
      {/* Image de fond */}
      <div className="absolute inset-0">
        <Image
          src={backdropUrl}
          alt={video.title}
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/40 to-transparent" />
      </div>

      {/* Contenu */}
      <div className="relative z-10 flex h-full items-end">
        <div className="container mx-auto px-4 pb-16 md:pb-24">
          <div className="max-w-2xl space-y-4">
            <h1 className="text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
              {video.title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              {year && <span>{year}</span>}
              {video.voteAverage > 0 && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    ⭐ {video.voteAverage.toFixed(1)}
                  </span>
                </>
              )}
              <span>•</span>
              <span>{video.mediaType === "movie" ? "Film" : "Série"}</span>
            </div>

            <p className="line-clamp-3 text-base leading-relaxed md:text-lg">
              {video.overview || "Découvrez cette vidéo sur StreamNow."}
            </p>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                href={`/video/${video.id}?type=${video.mediaType}&play=true`}
                prefetch
              >
                <Button size="lg" className="gap-2">
                  <Play className="h-5 w-5 fill-current" />
                  Regarder
                </Button>
              </Link>
              <Link
                href={`/video/${video.id}?type=${video.mediaType}`}
                prefetch
              >
                <Button variant="secondary" size="lg" className="gap-2">
                  <Info className="h-5 w-5" />
                  Plus d&apos;infos
                </Button>
              </Link>
              <Button
                variant="secondary"
                size="lg"
                className="gap-2"
                onClick={handleFavoriteClick}
                aria-label={isFav ? "Retirer des favoris" : "Ajouter aux favoris"}
              >
                <Plus
                  className={cn(
                    "h-5 w-5",
                    isFav && "rotate-45"
                  )}
                />
                Ma liste
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

