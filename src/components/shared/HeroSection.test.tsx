import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps, PropsWithChildren } from "react";
import { HeroSection } from "./HeroSection";
import type { Video } from "@/types/video";

const mockStore = {
  addToFavorites: jest.fn(),
  removeFromFavorites: jest.fn(),
  isFavorite: jest.fn(),
};

jest.mock("next/image", () => ({
  __esModule: true,
  default: ({ alt, priority, fill, ...props }: ComponentProps<"img">) => {
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

jest.mock("@/lib/store/useVideoStore", () => ({
  useVideoStore: () => mockStore,
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
    mockStore.addToFavorites.mockReset();
    mockStore.removeFromFavorites.mockReset();
    mockStore.isFavorite.mockReset();
  });

  it("renders hero information and primary link", () => {
    mockStore.isFavorite.mockReturnValue(false);

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
    mockStore.isFavorite.mockReturnValue(false);

    render(<HeroSection video={video} />);

    const favoriteButton = screen.getByRole("button", {
      name: /Ajouter aux favoris/i,
    });
    await userEvent.click(favoriteButton);

    expect(mockStore.addToFavorites).toHaveBeenCalledWith(video);
    expect(mockStore.removeFromFavorites).not.toHaveBeenCalled();
  });

  it("removes video from favorites when already stored", async () => {
    mockStore.isFavorite.mockReturnValue(true);

    render(<HeroSection video={video} />);

    const favoriteButton = screen.getByRole("button", {
      name: /Retirer des favoris/i,
    });
    await userEvent.click(favoriteButton);

    expect(mockStore.removeFromFavorites).toHaveBeenCalledWith(video.id);
    expect(mockStore.addToFavorites).not.toHaveBeenCalled();
  });
});
