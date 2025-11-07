"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { Play, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getImageUrl } from "@/lib/api/tmdb";
import type { Video } from "@/types/video";
import { useVideoStore } from "@/lib/store/useVideoStore";
import { cn } from "@/lib/utils";

interface VideoCardProps {
  video: Video;
  priority?: boolean;
  progress?: number;
  onRemove?: () => void;
}

export function VideoCard({
  video,
  priority = false,
  progress,
  onRemove,
}: VideoCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const { isFavorite, addToFavorites, removeFromFavorites } = useVideoStore();

  const isFav = isFavorite(video.id);
  const posterUrl = getImageUrl(video.posterPath, "w500");
  const year = video.releaseDate
    ? new Date(video.releaseDate).getFullYear()
    : null;

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isFav) {
      removeFromFavorites(video.id);
    } else {
      addToFavorites(video);
    }
  };

  return (
    <Link
      href={`/video/${video.id}?type=${video.mediaType}`}
      prefetch={priority}
    >
      <motion.div
        className="group relative cursor-pointer"
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
        whileHover={{ y: -8 }}
        transition={{ duration: 0.2 }}
      >
        {/* Vignette */}
        <div className="relative aspect-[2/3] w-full overflow-hidden rounded-lg bg-muted">
          <Image
            src={posterUrl}
            alt={video.title}
            fill
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
            className={cn(
              "object-cover transition-transform duration-300",
              isHovered && "scale-110"
            )}
            priority={priority}
          />

          {/* Overlay au hover */}
          {isHovered && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 flex items-center justify-center gap-2"
            >
              <Button size="lg" className="gap-2">
                <Play className="h-4 w-4 fill-current" />
                Regarder
              </Button>
            </motion.div>
          )}

          {/* Badge favori */}
          <button
            onClick={handleFavoriteClick}
            className={cn(
              "absolute top-2 right-2 p-2 rounded-full transition-colors z-10",
              "bg-black/50 hover:bg-black/70",
              isFav && "bg-red-500 hover:bg-red-600"
            )}
            aria-label={isFav ? "Retirer des favoris" : "Ajouter aux favoris"}
          >
            <Heart
              className={cn(
                "h-4 w-4",
                isFav ? "fill-white text-white" : "text-white"
              )}
            />
          </button>

          {/* Badge catégorie */}
          <div className="absolute bottom-2 left-2 px-2 py-1 rounded bg-black/70 text-xs font-medium text-white">
            {video.mediaType === "movie" ? "Film" : "Série"}
          </div>

          {typeof progress === "number" && progress > 0 && (
            <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/20">
              <div
                className="h-full bg-primary"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          )}
        </div>

        {/* Infos sous la vignette */}
        <div className="mt-2 space-y-1">
          <h3 className="font-semibold text-sm line-clamp-2 group-hover:text-primary transition-colors">
            {video.title}
          </h3>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {year && <span>{year}</span>}
            {video.voteAverage > 0 && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1">
                  ⭐ {video.voteAverage.toFixed(1)}
                </span>
              </>
            )}
          </div>

          {typeof progress === "number" && progress > 0 && (
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{Math.round(progress)}% regardé</span>
              {onRemove && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onRemove();
                  }}
                  className="text-xs text-primary hover:underline"
                >
                  Retirer
                </button>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </Link>
  );
}

