/* eslint-disable @typescript-eslint/no-require-imports */
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ComponentType, ReactElement } from "react";
import { SearchResults } from "./SearchResults";
import { useSearchVideos, type SearchOptions } from "@/hooks/useSearch";
import { useLibrarySearch } from "@/hooks/useLibrarySearch";
import type { Video } from "@/types/video";

const renderWithQueryClient = (ui: ReactElement) => {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
};

jest.mock("@/hooks/useSearch", () => ({
  useSearchVideos: jest.fn(),
}));

const mockUseLibrarySearch = jest.fn();
jest.mock("@/hooks/useLibrarySearch", () => ({
  useLibrarySearch: (...args: unknown[]) => mockUseLibrarySearch(...args),
}));

jest.mock("@/components/video/VideoGrid", () => {
  const React = require("react") as typeof import("react");
  const MockVideoGrid: ComponentType<{ videos: Video[] }> = ({ videos }) => (
    <div data-testid="video-grid">
      {videos.map((video) => video.title).join(",")}
    </div>
  );
  MockVideoGrid.displayName = "MockVideoGrid";

  return {
    __esModule: true,
    VideoGrid: MockVideoGrid,
  };
});

jest.mock("@/components/video/VideoCarouselSkeleton", () => {
  const React = require("react") as typeof import("react");
  const MockVideoCarouselSkeleton: ComponentType = () => (
    <div data-testid="carousel-skeleton" />
  );
  MockVideoCarouselSkeleton.displayName = "MockVideoCarouselSkeleton";

  return {
    __esModule: true,
    VideoCarouselSkeleton: MockVideoCarouselSkeleton,
  };
});

const mockedUseSearchVideos =
  useSearchVideos as jest.MockedFunction<typeof useSearchVideos>;

const createVideo = (overrides: Partial<Video> = {}): Video => ({
  id: 1,
  title: "Example",
  overview: "Overview",
  posterPath: "/poster.jpg",
  backdropPath: "/backdrop.jpg",
  releaseDate: "2024-01-01",
  voteAverage: 7.5,
  voteCount: 100,
  genreIds: [1],
  mediaType: "movie",
  popularity: 10,
  ...overrides,
});

describe("SearchResults", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseLibrarySearch.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });
  });

  it("renders loading skeleton when fetching results", () => {
    mockedUseSearchVideos.mockReturnValue({
      data: undefined,
      error: null,
      isLoading: true,
    });

    renderWithQueryClient(<SearchResults query="matrix" />);

    expect(screen.getByTestId("carousel-skeleton")).toBeInTheDocument();
  });

  it("renders an error state when the query fails", () => {
    mockedUseSearchVideos.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error("Network error"),
    });

    renderWithQueryClient(<SearchResults query="matrix" />);

    expect(screen.getByText(/Échec de la recherche TMDB/i)).toBeInTheDocument();
  });

  it("renders an empty state when there are no videos", () => {
    mockedUseSearchVideos.mockReturnValue({
      data: { videos: [] },
      isLoading: false,
      error: null,
    });

    renderWithQueryClient(<SearchResults query="unknown" />);

    expect(screen.getByText(/Aucun résultat/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Aucune vidéo trouvée pour "unknown"/i)
    ).toBeInTheDocument();
  });

  it("shows results with filter chips when data is available", () => {
    const options: SearchOptions = {
      mediaType: "movie",
      sortBy: "vote_average",
    };
    const results = [
      createVideo({ id: 1, title: "Film A" }),
      createVideo({ id: 2, title: "Film B" }),
    ];

    mockedUseSearchVideos.mockReturnValue({
      data: { videos: results },
      isLoading: false,
      error: null,
    });

    renderWithQueryClient(
      <SearchResults
        query="matrix"
        options={options}
        selectedGenreLabel="Science-Fiction"
      />
    );

    expect(
      screen.getByRole("heading", { level: 2, name: /Résultats TMDB pour "matrix"/i })
    ).toBeInTheDocument();
    const metadataContainer = screen
      .getByText(/Type : Films/i)
      .parentElement as HTMLElement;
    expect(metadataContainer).toHaveTextContent(/2 résultat/i);
    expect(screen.getByText(/Type : Films/i)).toBeInTheDocument();
    expect(screen.getByText(/Genre : Science-Fiction/i)).toBeInTheDocument();
    expect(screen.getByText(/Tri : Meilleures notes/i)).toBeInTheDocument();
    expect(screen.getByTestId("video-grid")).toHaveTextContent("Film A,Film B");
  });
});
