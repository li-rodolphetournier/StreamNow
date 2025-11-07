import { render, screen, fireEvent } from "@testing-library/react";
import { VideoCard } from "./VideoCard";

const mockVideo = {
  id: 1,
  title: "Test Video",
  overview: "An overview",
  posterPath: "/poster.jpg",
  backdropPath: "/backdrop.jpg",
  releaseDate: "2024-01-01",
  voteAverage: 8.2,
  voteCount: 100,
  genreIds: [12],
  mediaType: "movie" as const,
  popularity: 150,
};

const addToFavorites = jest.fn();
const removeFromFavorites = jest.fn();

jest.mock("@/lib/store/useVideoStore", () => ({
  useVideoStore: () => ({
    isFavorite: () => false,
    addToFavorites,
    removeFromFavorites,
  }),
}));

describe("VideoCard", () => {
  it("renders title and rating", () => {
    render(<VideoCard video={mockVideo} />);

    expect(screen.getByText("Test Video")).toBeInTheDocument();
    expect(screen.getByText("⭐ 8.2")).toBeInTheDocument();
  });

  it("shows progress when provided", () => {
    render(<VideoCard video={mockVideo} progress={40} />);

    expect(screen.getByText("40% regardé")).toBeInTheDocument();
  });

  it("calls onRemove when clicking retirer", () => {
    const handler = jest.fn();
    render(<VideoCard video={mockVideo} progress={40} onRemove={handler} />);

    fireEvent.click(screen.getByText("Retirer"));
    expect(handler).toHaveBeenCalledTimes(1);
  });
});

