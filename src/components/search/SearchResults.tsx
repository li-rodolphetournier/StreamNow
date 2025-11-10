"use client";

import Image from "next/image";
import Link from "next/link";
import { VideoGrid } from "@/components/video/VideoGrid";
import { Skeleton } from "@/components/shared/Skeleton";
import { useSearchVideos, type SearchOptions } from "@/hooks/useSearch";
import { useLibrarySearch } from "@/hooks/useLibrarySearch";
import type { GraphQLVideo } from "@/types/graphql";
import type { Video as TmdbVideo } from "@/types/video";
import { VideoCarouselSkeleton } from "@/components/video/VideoCarouselSkeleton";

interface SearchResultsProps {
  query: string;
  options?: SearchOptions;
  selectedGenreLabel?: string | null;
}

export function SearchResults({
  query,
  options,
  selectedGenreLabel,
}: SearchResultsProps) {
  const {
    data: tmdbData,
    isLoading: isTmdbLoading,
    error: tmdbError,
  } = useSearchVideos(query, 1, options);

  const {
    data: libraryData,
    isLoading: isLibraryLoading,
    error: libraryError,
  } = useLibrarySearch(query);

  const tmdbVideos = tmdbData?.videos ?? [];
  const libraryVideos = libraryData ?? [];

  const noResults =
    !isTmdbLoading &&
    !isLibraryLoading &&
    tmdbVideos.length === 0 &&
    libraryVideos.length === 0;

  return (
    <div className="space-y-10" aria-live="polite">
      <LibraryResultsSection
        videos={libraryVideos}
        isLoading={isLibraryLoading}
        error={libraryError}
      />

      <TmdbResultsSection
        query={query}
        videos={tmdbVideos}
        options={options}
        selectedGenreLabel={selectedGenreLabel}
        isLoading={isTmdbLoading}
        error={tmdbError}
      />

      {noResults && (
        <div className="text-center py-12">
          <p className="text-lg font-semibold mb-2">Aucun résultat</p>
          <p className="text-muted-foreground">
            Aucune vidéo trouvée pour &quot;{query}&quot;
          </p>
        </div>
      )}
    </div>
  );
}

function LibraryResultsSection({
  videos,
  isLoading,
  error,
}: {
  videos: GraphQLVideo[];
  isLoading: boolean;
  error: unknown;
}) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
        Impossible de récupérer les vidéos de votre bibliothèque.
      </div>
    );
  }

  if (videos.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold mb-1">
          Bibliothèque StreamNow Home
        </h2>
        <p className="text-sm text-muted-foreground">
          {videos.length} résultat{videos.length > 1 ? "s" : ""} trouvé
          {videos.length > 1 ? "s" : ""} dans vos vidéos personnelles.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {videos.map((video) => (
          <LibraryResultCard key={video.id} video={video} />
        ))}
      </div>
    </section>
  );
}

function LibraryResultCard({ video }: { video: GraphQLVideo }) {
  return (
    <article className="flex gap-4 rounded-lg border bg-card/70 p-4 shadow-sm transition hover:border-primary/40">
      <div className="relative h-24 w-16 flex-none overflow-hidden rounded-md bg-muted">
        {video.posterUrl ? (
          <Image
            src={video.posterUrl}
            alt={video.title}
            fill
            className="object-cover"
            sizes="64px"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground">
            Aucun visuel
          </div>
        )}
      </div>
      <div className="space-y-1 text-sm">
        <h3 className="text-base font-semibold leading-tight">{video.title}</h3>
        <p className="text-xs text-muted-foreground line-clamp-2">
          {video.overview ?? "Aucune description disponible."}
        </p>
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span className="rounded-full bg-secondary/60 px-2 py-0.5">
            {video.mediaType === "MOVIE" ? "Film" : "Série"}
          </span>
          <span className="rounded-full bg-secondary/60 px-2 py-0.5">
            {video.status === "PUBLISHED" ? "Publié" : "Brouillon"}
          </span>
          <span className="rounded-full bg-secondary/60 px-2 py-0.5">
            {readableVisibility(video.visibility)}
          </span>
        </div>
        <div className="flex items-center gap-2 pt-1 text-xs text-muted-foreground">
          <span>Propriétaire :</span>
          <span className="font-medium">
            {video.owner?.nickname ?? video.owner?.email ?? "Inconnu"}
          </span>
        </div>
        <div className="pt-2 text-sm">
          <Link
            href={`/dashboard/videos/${video.id}`}
            className="text-primary underline-offset-4 hover:underline"
          >
            Gérer la vidéo
          </Link>
        </div>
      </div>
    </article>
  );
}

function readableVisibility(visibility: GraphQLVideo["visibility"]) {
  switch (visibility) {
    case "PUBLIC":
      return "Public";
    case "AUTHENTICATED":
      return "Utilisateurs connectés";
    case "FRIENDS":
      return "Amis";
    case "RESTRICTED":
      return "Restreint";
    case "PRIVATE":
    default:
      return "Privé";
  }
}

function TmdbResultsSection({
  query,
  videos,
  options,
  selectedGenreLabel,
  isLoading,
  error,
}: {
  query: string;
  videos: TmdbVideo[];
  options?: SearchOptions;
  selectedGenreLabel?: string | null;
  isLoading: boolean;
  error: unknown;
}) {
  if (isLoading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-8 w-64" />
        <VideoCarouselSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
        Échec de la recherche TMDB. Réessayez plus tard.
      </div>
    );
  }

  if (videos.length === 0) {
    return null;
  }

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">
          Résultats TMDB pour &quot;{query}&quot;
        </h2>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>
            {videos.length} résultat{videos.length > 1 ? "s" : ""}
          </span>
          {options?.mediaType && options.mediaType !== "multi" && (
            <span className="rounded-full bg-secondary px-3 py-1 text-xs text-secondary-foreground">
              Type : {options.mediaType === "movie" ? "Films" : "Séries"}
            </span>
          )}
          {selectedGenreLabel && (
            <span className="rounded-full bg-secondary px-3 py-1 text-xs text-secondary-foreground">
              Genre : {selectedGenreLabel}
            </span>
          )}
          {options?.sortBy && (
            <span className="rounded-full bg-secondary px-3 py-1 text-xs text-secondary-foreground">
              Tri : {getSortLabel(options.sortBy)}
            </span>
          )}
        </div>
      </div>
      <VideoGrid videos={videos} />
    </section>
  );
}

function getSortLabel(sort: SearchOptions["sortBy"]) {
  switch (sort) {
    case "popularity":
      return "Popularité";
    case "vote_average":
      return "Meilleures notes";
    case "release_date":
      return "Plus récents";
    default:
      return sort;
  }
}


