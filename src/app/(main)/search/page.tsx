import { Suspense } from "react";
import { SearchBar } from "@/components/search/SearchBar";
import { SearchResults } from "@/components/search/SearchResults";
import { VideoCarouselSkeleton } from "@/components/video/VideoCarouselSkeleton";

async function SearchResultsWrapper({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const query = params.q || "";

  if (!query) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          Entrez un terme de recherche pour commencer.
        </p>
      </div>
    );
  }

  return <SearchResults query={query} />;
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const query = params.q || "";

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4">Recherche</h1>
          <SearchBar autoFocus defaultValue={query} />
        </div>
        <Suspense
          fallback={
            <div className="space-y-8">
              <div className="h-8 w-64 bg-muted animate-pulse rounded" />
              <VideoCarouselSkeleton />
            </div>
          }
        >
          <SearchResultsWrapper searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}
