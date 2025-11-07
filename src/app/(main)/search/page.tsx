import { Suspense } from "react";
import { SearchPageClient } from "@/components/search/SearchPageClient";
import { VideoCarouselSkeleton } from "@/components/video/VideoCarouselSkeleton";
import { Skeleton } from "@/components/shared/Skeleton";

function SearchPageFallback() {
  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8 space-y-8">
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-12 w-full max-w-2xl" />
        </div>
        <VideoCarouselSkeleton />
      </div>
    </div>
  );
}

export default function SearchPage({
  searchParams,
}: {
  searchParams: {
    q?: string;
    type?: string;
    genre?: string;
    sort?: string;
  };
}) {
  return (
    <Suspense fallback={<SearchPageFallback />}>
      <SearchPageClient
        initialQuery={searchParams.q ?? ""}
        initialMediaType={
          (searchParams.type as "movie" | "tv" | "multi") ?? "multi"
        }
        initialGenre={searchParams.genre ? Number(searchParams.genre) : null}
        initialSort={
          (searchParams.sort as
            | "popularity"
            | "vote_average"
            | "release_date"
            | undefined) ?? "popularity"
        }
      />
    </Suspense>
  );
}

