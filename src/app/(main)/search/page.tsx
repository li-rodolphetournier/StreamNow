import { SearchPageClient } from "@/components/search/SearchPageClient";

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
    <SearchPageClient
      initialQuery={searchParams.q ?? ""}
      initialMediaType={(searchParams.type as "movie" | "tv" | "multi") ?? "multi"}
      initialGenre={searchParams.genre ? Number(searchParams.genre) : null}
      initialSort={
        (searchParams.sort as
          | "popularity"
          | "vote_average"
          | "release_date"
          | undefined) ?? "popularity"
      }
    />
  );
}

