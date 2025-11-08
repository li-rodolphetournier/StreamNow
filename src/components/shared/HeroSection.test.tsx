import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { PropsWithChildren } from "react";
import { HeroSection } from "./HeroSection";
import type { Video } from "@/types/video";

const mockFavorites = {
  add: jest.fn(),
  remove: jest.fn(),
  isFavorite: jest.fn(),
  isAuthenticated: true,
  favorites: [],
  favoritesByMediaType: { movies: [], series: [] },
  isLoading: false,
  isError: false,
  error: null,
  addFavoriteStatus: "idle" as const,
  removeFavoriteStatus: "idle" as const,
};

jest.mock("next/image", () => ({
  __esModule: true,
  default: ({ alt, priority, fill, ...props }: any) => {
    void priority;
    void fill;
    return (
      <span role="img" aria-label={alt} data-testid="next-image-mock" {...props} />
    );
  },
}));

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({
    href,
    children,
    prefetch: _prefetch,
    ...props
  }: PropsWithChildren<{ href: string; prefetch?: boolean }>) => (
    <>
      {void _prefetch}
      <a href={href} {...props}>
        {children}
      </a>
    </>
  ),
}));

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

const video: Video = {
  id: 7,
  title: "Demo film",
  overview: "Description",
  posterPath: "/poster.jpg",
  backdropPath: "/backdrop.jpg",
  releaseDate: "2024-01-01",
  voteAverage: 8,
  voteCount: 1000,
  genreIds: [1],
  mediaType: "movie",
  popularity: 50,
};

describe("HeroSection", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFavorites.add.mockReset();
    mockFavorites.remove.mockReset();
    mockFavorites.isFavorite.mockReset();
    mockFavorites.isAuthenticated = true;
    pushMock.mockReset();
  });

  it("renders hero information and primary link", () => {
    mockFavorites.isFavorite.mockReturnValue(false);

    render(<HeroSection video={video} />);

    expect(
      screen.getByRole("heading", { level: 1, name: /Demo film/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/Description/i)).toBeInTheDocument();

    const playLink = screen.getByRole("link", { name: /Regarder/i });
    expect(playLink).toHaveAttribute(
      "href",
      `/video/${video.id}?type=${video.mediaType}&play=true`
    );
  });

  it("adds video to favorites when not already present", async () => {
    mockFavorites.isFavorite.mockReturnValue(false);

    render(<HeroSection video={video} />);

    const favoriteButton = screen.getByRole("button", {
      name: /Ajouter aux favoris/i,
    });
    await userEvent.click(favoriteButton);

    expect(mockFavorites.add).toHaveBeenCalledWith(video);
    expect(mockFavorites.remove).not.toHaveBeenCalled();
  });

  it("removes video from favorites when already stored", async () => {
    mockFavorites.isFavorite.mockReturnValue(true);

    render(<HeroSection video={video} />);

    const favoriteButton = screen.getByRole("button", {
      name: /Retirer des favoris/i,
    });
    await userEvent.click(favoriteButton);

    expect(mockFavorites.remove).toHaveBeenCalledWith(video);
    expect(mockFavorites.add).not.toHaveBeenCalled();
  });

  it("redirects to sign-in when user is not authenticated", async () => {
    mockFavorites.isAuthenticated = false;
    mockFavorites.isFavorite.mockReturnValue(false);

    render(<HeroSection video={video} />);

    const favoriteButton = screen.getByRole("button", {
      name: /Ajouter aux favoris/i,
    });
    await userEvent.click(favoriteButton);

    expect(pushMock).toHaveBeenCalledWith("/auth/sign-in");
    expect(mockFavorites.add).not.toHaveBeenCalled();
  });
});
