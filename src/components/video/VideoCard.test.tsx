import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

const mockFavorites = {
  isFavorite: jest.fn(() => false),
  add: jest.fn(),
  remove: jest.fn(),
  isAuthenticated: true,
  addFavoriteStatus: "idle" as const,
  removeFavoriteStatus: "idle" as const,
};

const pushMock = jest.fn();

jest.mock("next/navigation", () => ({
  __esModule: true,
  useRouter: () => ({
    push: pushMock,
  }),
}));

jest.mock("@/hooks/useFavorites", () => ({
  useFavorites: () => mockFavorites,
}));

describe("VideoCard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFavorites.isFavorite.mockImplementation(() => false);
    mockFavorites.isAuthenticated = true;
  });

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

  it("adds video to favorites when clicking heart", async () => {
    render(<VideoCard video={mockVideo} />);
    const button = screen.getByRole("button", { name: /Ajouter aux favoris/i });
    await userEvent.click(button);

    expect(mockFavorites.add).toHaveBeenCalledWith(mockVideo);
  });

  it("redirects to login when user is not authenticated", async () => {
    mockFavorites.isAuthenticated = false;
    render(<VideoCard video={mockVideo} />);
    const button = screen.getByRole("button", { name: /Ajouter aux favoris/i });
    await userEvent.click(button);

    expect(pushMock).toHaveBeenCalledWith("/auth/sign-in");
    expect(mockFavorites.add).not.toHaveBeenCalled();
  });
});

