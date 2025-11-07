"use client";

import { useMemo } from "react";
import type { TMDBGenre } from "@/types/api";
import type { SearchOptions } from "@/hooks/useSearch";
import { Button } from "@/components/ui/button";

interface SearchFiltersProps {
  mediaType: "movie" | "tv" | "multi";
  genreId?: number | null;
  sortBy?: SearchOptions["sortBy"];
  movieGenres: TMDBGenre[];
  tvGenres: TMDBGenre[];
  onMediaTypeChange: (value: "movie" | "tv" | "multi") => void;
  onGenreChange: (value: number | null) => void;
  onSortChange: (value: SearchOptions["sortBy"]) => void;
  onClear: () => void;
  isLoadingGenres?: boolean;
}

const sortOptions: Array<{ value: SearchOptions["sortBy"]; label: string }> = [
  { value: "popularity", label: "Popularité" },
  { value: "vote_average", label: "Meilleures notes" },
  { value: "release_date", label: "Plus récents" },
];

export function SearchFilters({
  mediaType,
  genreId,
  sortBy,
  movieGenres,
  tvGenres,
  onMediaTypeChange,
  onGenreChange,
  onSortChange,
  onClear,
  isLoadingGenres = false,
}: SearchFiltersProps) {
  const genreOptions = useMemo(() => {
    if (mediaType === "movie") return movieGenres;
    if (mediaType === "tv") return tvGenres;
    const map = new Map<number, TMDBGenre>();
    for (const genre of [...movieGenres, ...tvGenres]) {
      if (!map.has(genre.id)) {
        map.set(genre.id, genre);
      }
    }
    return Array.from(map.values());
  }, [mediaType, movieGenres, tvGenres]);

  return (
    <section
      aria-labelledby="search-filters-heading"
      className="mb-6 rounded-lg border bg-card p-4 shadow-sm"
    >
      <h2 id="search-filters-heading" className="sr-only">
        Filtres de recherche
      </h2>
      <form className="flex flex-wrap items-center gap-4" aria-describedby="search-filters-heading">
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Type</legend>
          <div className="flex items-center gap-2">
            <FilterChip
              label="Tous"
              active={mediaType === "multi"}
              onClick={() => onMediaTypeChange("multi")}
            />
            <FilterChip
              label="Films"
              active={mediaType === "movie"}
              onClick={() => onMediaTypeChange("movie")}
            />
            <FilterChip
              label="Séries"
              active={mediaType === "tv"}
              onClick={() => onMediaTypeChange("tv")}
            />
          </div>
        </fieldset>

        <div className="flex flex-col gap-2 min-w-[180px]">
          <label className="text-sm font-medium" htmlFor="genre-select">
            Genre
          </label>
          <select
            id="genre-select"
            className="h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            value={genreId ?? ""}
            onChange={(event) => {
              const value = event.target.value;
              onGenreChange(value ? Number(value) : null);
            }}
            aria-describedby="genre-helper"
            disabled={isLoadingGenres || genreOptions.length === 0}
          >
            <option value="">Tous les genres</option>
            {genreOptions.map((genre) => (
              <option key={`${genre.id}-${genre.name}`} value={genre.id}>
                {genre.name}
              </option>
            ))}
          </select>
          <span id="genre-helper" className="sr-only">
            Sélectionner un genre limite les résultats.
          </span>
        </div>

        <div className="flex flex-col gap-2 min-w-[180px]">
          <label className="text-sm font-medium" htmlFor="sort-select">
            Trier par
          </label>
          <select
            id="sort-select"
            className="h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            value={sortBy ?? "popularity"}
            onChange={(event) => onSortChange(event.target.value as SearchOptions["sortBy"])}
          >
            {sortOptions.map((sortOption) => (
              <option key={sortOption.value} value={sortOption.value}>
                {sortOption.label}
              </option>
            ))}
          </select>
        </div>

        <Button
          variant="ghost"
          onClick={(event) => {
            event.preventDefault();
            onClear();
          }}
          className="self-end"
          aria-label="Effacer tous les filtres"
        >
          Effacer les filtres
        </Button>
      </form>
    </section>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={
        "rounded-full px-3 py-1 text-sm transition-colors " +
        (active
          ? "bg-primary text-primary-foreground"
          : "bg-secondary text-secondary-foreground hover:bg-secondary/80")
      }
    >
      {label}
    </button>
  );
}


