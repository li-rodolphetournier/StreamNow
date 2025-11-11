import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

const mockUseSearchVideos = jest.fn();
const mockUseLibrarySearch = jest.fn();

jest.mock("@/hooks/useSearch", () => ({
  useSearchVideos: (...args: unknown[]) => mockUseSearchVideos(...args),
}));

jest.mock("@/hooks/useLibrarySearch", () => ({
  useLibrarySearch: (...args: unknown[]) => mockUseLibrarySearch(...args),
}));

jest.mock("@/components/video/VideoGrid", () => ({
  VideoGrid: ({ videos }: { videos: Array<unknown> }) => (
    <div data-testid="video-grid">{videos.length} vidéos</div>
  ),
}));

import { SearchResults } from "@/components/search/SearchResults";

const renderWithQueryClient = (ui: React.ReactElement) => {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
};

describe("SearchResults", () => {
  beforeEach(() => {
    mockUseSearchVideos.mockReset();
    mockUseLibrarySearch.mockReset();
    mockUseLibrarySearch.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });
  });

  it("shows loading skeleton when fetching", () => {
    mockUseSearchVideos.mockReturnValue({ isLoading: true });

    const { container } = renderWithQueryClient(<SearchResults query="demo" />);
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("renders error message on failure", () => {
    mockUseSearchVideos.mockReturnValue({ isLoading: false, error: new Error("fail") });

    renderWithQueryClient(<SearchResults query="demo" />);
    expect(
      screen.getByText(/Échec de la recherche TMDB\. Réessayez plus tard\./i)
    ).toBeInTheDocument();
  });

  it("informs when no results", () => {
    mockUseSearchVideos.mockReturnValue({
      isLoading: false,
      error: null,
      data: { videos: [] },
    });

    renderWithQueryClient(<SearchResults query="demo" />);
    expect(screen.getByText("Aucun résultat")).toBeInTheDocument();
    expect(
      screen.getByText(/Aucune vidéo trouvée pour "demo"/i)
    ).toBeInTheDocument();
  });

  it("displays results and active filters", () => {
    mockUseSearchVideos.mockReturnValue({
      isLoading: false,
      error: null,
      data: {
        videos: [
          { id: 1, title: "Demo", voteAverage: 8, mediaType: "movie" },
          { id: 2, title: "Demo 2", voteAverage: 7, mediaType: "tv" },
        ],
      },
    });

    renderWithQueryClient(
      <SearchResults
        query="demo"
        options={{ mediaType: "movie", sortBy: "vote_average" }}
        selectedGenreLabel="Action"
      />
    );

    expect(screen.getByText('Résultats TMDB pour "demo"')).toBeInTheDocument();
    expect(screen.getByText("Type : Films")).toBeInTheDocument();
    expect(screen.getByText("Genre : Action")).toBeInTheDocument();
    expect(screen.getByText("Tri : Meilleures notes")).toBeInTheDocument();
    expect(screen.getByTestId("video-grid")).toHaveTextContent("2 vidéos");
  });
});


