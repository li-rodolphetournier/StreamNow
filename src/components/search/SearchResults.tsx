"use client";

import { VideoGrid } from "@/components/video/VideoGrid";
import { Skeleton } from "@/components/shared/Skeleton";
import { useSearchVideos, type SearchOptions } from "@/hooks/useSearch";
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
  const { data, isLoading, error } = useSearchVideos(query, 1, options);

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
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          Une erreur est survenue lors de la recherche.
        </p>
      </div>
    );
  }

  if (!data || data.videos.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-lg font-semibold mb-2">Aucun résultat</p>
        <p className="text-muted-foreground">
          Aucune vidéo trouvée pour &quot;{query}&quot;
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">
          Résultats pour &quot;{query}&quot;
        </h2>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>
            {data.videos.length} résultat{data.videos.length > 1 ? "s" : ""}
            trouvé{data.videos.length > 1 ? "s" : ""}
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
      <VideoGrid videos={data.videos} />
    </div>
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

