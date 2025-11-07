"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SearchBar } from "@/components/search/SearchBar";
import { SearchResults } from "@/components/search/SearchResults";
import { SearchFilters } from "@/components/search/SearchFilters";
import { useGenres } from "@/hooks/useGenres";
import type { SearchOptions } from "@/hooks/useSearch";

interface SearchPageClientProps {
  initialQuery?: string;
  initialMediaType?: "movie" | "tv" | "multi";
  initialGenre?: number | null;
  initialSort?: SearchOptions["sortBy"];
}

export function SearchPageClient({
  initialQuery = "",
  initialMediaType = "multi",
  initialGenre = null,
  initialSort = "popularity",
}: SearchPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: genresData, isLoading: isLoadingGenres } = useGenres();

  const query = searchParams.get("q") ?? initialQuery ?? "";
  const mediaTypeParam =
    (searchParams.get("type") as "movie" | "tv" | "multi" | null) ??
    initialMediaType ??
    "multi";
  const sortParam =
    (searchParams.get("sort") as SearchOptions["sortBy"] | null) ??
    initialSort ??
    "popularity";
  const genreParam = searchParams.get("genre");
  const genreId = genreParam ? Number(genreParam) : initialGenre;

  const updateQueryParams = useCallback(
    (updates: Record<string, string | null | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === undefined || value === "") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      });
      router.replace(`/search?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  const handleMediaTypeChange = (value: "movie" | "tv" | "multi") => {
    // Réinitialiser le genre si on change de type
    updateQueryParams({ type: value, genre: null });
  };

  const handleGenreChange = (value: number | null) => {
    updateQueryParams({ genre: value ? String(value) : null });
  };

  const handleSortChange = (value: SearchOptions["sortBy"]) => {
    updateQueryParams({ sort: value });
  };

  const handleClearFilters = () => {
    updateQueryParams({ type: null, genre: null, sort: null });
  };

  const selectedGenreLabel = (() => {
    if (!genresData || !genreId) return null;
    const list =
      mediaTypeParam === "tv" ? genresData.tvGenres : genresData.movieGenres;
    const match = list.find((genre) => genre.id === genreId);
    return match?.name ?? null;
  })();

  const options: SearchOptions = {
    mediaType: mediaTypeParam,
    genre: genreId ?? undefined,
    sortBy: sortParam ?? "popularity",
  };

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-4">Recherche</h1>
          <SearchBar autoFocus defaultValue={query} />
        </div>

        <SearchFilters
          mediaType={mediaTypeParam}
          genreId={genreId}
          sortBy={sortParam}
          movieGenres={genresData?.movieGenres ?? []}
          tvGenres={genresData?.tvGenres ?? []}
          onMediaTypeChange={handleMediaTypeChange}
          onGenreChange={handleGenreChange}
          onSortChange={handleSortChange}
          onClear={handleClearFilters}
          isLoadingGenres={isLoadingGenres}
        />

        {query.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              Entrez un terme de recherche pour commencer.
            </p>
          </div>
        ) : (
          <SearchResults
            query={query}
            options={options}
            selectedGenreLabel={selectedGenreLabel}
          />
        )}
      </div>
    </div>
  );
}


