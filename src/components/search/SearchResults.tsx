"use client";

import { VideoGrid } from "@/components/video/VideoGrid";
import { Skeleton } from "@/components/shared/Skeleton";
import { useSearchVideos } from "@/hooks/useSearch";
import { VideoCarouselSkeleton } from "@/components/video/VideoCarouselSkeleton";

interface SearchResultsProps {
  query: string;
}

export function SearchResults({ query }: SearchResultsProps) {
  const { data, isLoading, error } = useSearchVideos(query, 1);

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
        <p className="text-muted-foreground">
          {data.videos.length} résultat{data.videos.length > 1 ? "s" : ""} trouvé
          {data.videos.length > 1 ? "s" : ""}
        </p>
      </div>
      <VideoGrid videos={data.videos} />
    </div>
  );
}

