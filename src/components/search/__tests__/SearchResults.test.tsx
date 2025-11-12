import { render, screen } from "@testing-library/react";
import type { UseQueryResult } from "@tanstack/react-query";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import type { Video } from "@/types/video";

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

const createTmdbQueryResult = (
  overrides: Partial<
    UseQueryResult<{ videos: Video[]; totalPages: number }, Error>
  >
): UseQueryResult<{ videos: Video[]; totalPages: number }, Error> =>
  ({
    data: undefined,
    error: null,
    isLoading: false,
    isError: false,
    isPending: false,
    isSuccess: true,
    status: "success",
    fetchStatus: "idle",
    isLoadingError: false,
    isRefetchError: false,
    isFetching: false,
    isFetched: true,
    isRefetching: false,
    isStale: false,
    isPaused: false,
    isPlaceholderData: false,
    refetch: jest.fn(),
    remove: jest.fn(),
    dataUpdatedAt: 0,
    errorUpdatedAt: 0,
    failureCount: 0,
    failureReason: null,
    errorUpdateCount: 0,
    ...overrides,
  }) as UseQueryResult<{ videos: Video[]; totalPages: number }, Error>;

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
    const mockLoadingQuery = createTmdbQueryResult({
      data: undefined,
      isLoading: true,
      isPending: true,
      isSuccess: false,
      status: "pending",
      fetchStatus: "fetching",
      isFetching: true,
      isFetched: false,
    });

    mockUseSearchVideos.mockReturnValue(mockLoadingQuery);

    const { container } = renderWithQueryClient(<SearchResults query="demo" />);
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("renders error message on failure", () => {
    const testError = new Error("fail");
    const mockErrorQuery = createTmdbQueryResult({
      data: undefined,
      error: testError,
      isLoading: false,
      isError: true,
      isPending: false,
      isSuccess: false,
      status: "error",
      fetchStatus: "idle",
      isLoadingError: true,
      isFetching: false,
      isFetched: true,
      failureCount: 1,
      failureReason: testError,
      errorUpdatedAt: Date.now(),
      errorUpdateCount: 1,
    });

    mockUseSearchVideos.mockReturnValue(mockErrorQuery);

    renderWithQueryClient(<SearchResults query="demo" />);
    expect(
      screen.getByText(/Échec de la recherche TMDB\. Réessayez plus tard\./i)
    ).toBeInTheDocument();
  });

  it("informs when no results", () => {
    const mockData = {
      videos: [],
      totalPages: 0,
    };
    mockUseSearchVideos.mockReturnValue(
      createTmdbQueryResult({
        data: mockData,
        isLoading: false,
        isSuccess: true,
        isFetched: true,
      })
    );

    renderWithQueryClient(<SearchResults query="demo" />);
    expect(screen.getByText("Aucun résultat")).toBeInTheDocument();
    expect(
      screen.getByText(/Aucune vidéo trouvée pour "demo"/i)
    ).toBeInTheDocument();
  });

  it("displays results and active filters", () => {
    const mockData = {
      videos: [
        { id: 1, title: "Demo", voteAverage: 8, mediaType: "movie" },
        { id: 2, title: "Demo 2", voteAverage: 7, mediaType: "tv" },
      ] as unknown as Video[],
      totalPages: 5,
    };
    mockUseSearchVideos.mockReturnValue(
      createTmdbQueryResult({
        data: mockData,
      })
    );

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


