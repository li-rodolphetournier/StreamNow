"use client";

import Image from "next/image";
import Link from "next/link";
import { Play, Heart, Info } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getImageUrl } from "@/lib/api/tmdb";
import type { VideoDetails } from "@/types/video";
import { useFavorites } from "@/hooks/useFavorites";
import { cn } from "@/lib/utils";

interface VideoHeroProps {
  video: VideoDetails;
  onPlay?: () => void;
}

export function VideoHero({ video, onPlay }: VideoHeroProps) {
  const router = useRouter();
  const {
    isFavorite,
    add,
    remove,
    isAuthenticated,
    addFavoriteStatus,
    removeFavoriteStatus,
  } = useFavorites();
  const isFav = isFavorite(video.id);

  const backdropUrl = getImageUrl(video.backdropPath, "w1280");
  const posterUrl = getImageUrl(video.posterPath, "w500");

  const handleFavoriteClick = () => {
    if (!isAuthenticated) {
      router.push("/auth/sign-in");
      return;
    }
    if (isFav) {
      remove(video);
    } else {
      add(video);
    }
  };

  const year = video.releaseDate
    ? new Date(video.releaseDate).getFullYear()
    : null;
  const duration = video.runtime
    ? `${Math.floor(video.runtime / 60)}h${video.runtime % 60}`
    : video.seasons
      ? `${video.seasons} saison${video.seasons > 1 ? "s" : ""}`
      : null;

  return (
    <div className="relative h-[60vh] min-h-[500px] w-full overflow-hidden">
      {/* Image de fond */}
      <div className="absolute inset-0" aria-hidden>
        <Image
          src={backdropUrl}
          alt=""
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/60 to-transparent" />
      </div>

      {/* Contenu */}
      <div className="relative z-10 flex h-full items-end">
        <div className="container mx-auto px-4 pb-12">
          <div className="flex flex-col gap-6 md:flex-row md:items-end">
            {/* Poster */}
            <div className="hidden flex-shrink-0 md:block">
              <div className="relative aspect-[2/3] w-48 overflow-hidden rounded-lg shadow-2xl">
                <Image
                  src={posterUrl}
                  alt={video.title}
                  fill
                  className="object-cover"
                  sizes="192px"
                />
              </div>
            </div>

            {/* Infos */}
            <div className="flex-1 space-y-4">
              <div>
                <h1 className="text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
                  {video.title}
                </h1>
                <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  {year && <span>{year}</span>}
                  {duration && (
                    <>
                      <span>•</span>
                      <span>{duration}</span>
                    </>
                  )}
                  {video.genres.length > 0 && (
                    <>
                      <span>•</span>
                      <span>{video.genres.map((g) => g.name).join(", ")}</span>
                    </>
                  )}
                </div>
              </div>

              <p className="max-w-2xl text-sm leading-relaxed md:text-base">
                {video.overview}
              </p>

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-3">
                {onPlay ? (
                  <Button
                    size="lg"
                    className="gap-2"
                    onClick={onPlay}
                    aria-label={`Lancer la lecture de ${video.title}`}
                  >
                    <Play className="h-5 w-5 fill-current" />
                    Regarder
                  </Button>
                ) : (
                  <Button asChild size="lg" className="gap-2">
                    <Link
                      href={`/video/${video.id}?type=${video.mediaType}&play=true`}
                      aria-label={`Aller à la page de lecture pour ${video.title}`}
                    >
                      <Play className="h-5 w-5 fill-current" />
                      Regarder
                    </Link>
                  </Button>
                )}
                <Button
                  variant="secondary"
                  size="lg"
                  className="gap-2"
                  onClick={handleFavoriteClick}
                  disabled={addFavoriteStatus === "pending" || removeFavoriteStatus === "pending"}
                  aria-label={isFav ? "Retirer des favoris" : "Ajouter aux favoris"}
                  aria-pressed={isFav}
                >
                  <Heart
                    className={cn(
                      "h-5 w-5",
                      isFav && "fill-red-500 text-red-500"
                    )}
                  />
                  {isFav ? "Retiré" : "Ma liste"}
                </Button>
                {video.voteAverage > 0 && (
                  <div className="flex items-center gap-2 rounded-full bg-black/50 px-4 py-2 text-sm font-medium">
                    <span>⭐</span>
                    <span>{video.voteAverage.toFixed(1)}</span>
                    <span className="text-muted-foreground">
                      ({video.voteCount} votes)
                    </span>
                  </div>
                )}
                {!onPlay && (
                  <Button asChild variant="secondary" size="lg" className="gap-2">
                    <Link href={`/video/${video.id}?type=${video.mediaType}`}>
                      <Info className="h-5 w-5" />
                      Plus d&apos;infos
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

