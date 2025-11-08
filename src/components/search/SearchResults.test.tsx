/* eslint-disable @typescript-eslint/no-require-imports */
import { render, screen } from "@testing-library/react";
import type { ComponentType } from "react";
import { SearchResults } from "./SearchResults";
import { useSearchVideos, type SearchOptions } from "@/hooks/useSearch";
import type { Video } from "@/types/video";

jest.mock("@/hooks/useSearch", () => ({
  useSearchVideos: jest.fn(),
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
  });

  it("renders loading skeleton when fetching results", () => {
    mockedUseSearchVideos.mockReturnValue({
      data: undefined,
      error: null,
      isLoading: true,
    });

    render(<SearchResults query="matrix" />);

    expect(screen.getByTestId("carousel-skeleton")).toBeInTheDocument();
  });

  it("renders an error state when the query fails", () => {
    mockedUseSearchVideos.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error("Network error"),
    });

    render(<SearchResults query="matrix" />);

    expect(screen.getByText(/une erreur est survenue/i)).toBeInTheDocument();
  });

  it("renders an empty state when there are no videos", () => {
    mockedUseSearchVideos.mockReturnValue({
      data: { videos: [] },
      isLoading: false,
      error: null,
    });

    render(<SearchResults query="unknown" />);

    expect(screen.getByText(/aucun résultat/i)).toBeInTheDocument();
    expect(
      screen.getByText(/aucune vidéo trouvée pour "unknown"/i)
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

    render(
      <SearchResults
        query="matrix"
        options={options}
        selectedGenreLabel="Science-Fiction"
      />
    );

    expect(
      screen.getByRole("heading", { level: 2, name: /résultats pour "matrix"/i })
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
