import type { ReactNode } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { VideoPlayer } from "./VideoPlayer";
import type { Video } from "@/types/video";
import { useVideoPlayer } from "@/hooks/useVideoPlayer";
import { getMovieVideos, getTVShowVideos } from "@/lib/api/tmdb";

jest.mock("react-player", () => ({
  __esModule: true,
  default: jest.fn(() => <div data-testid="mock-react-player" />),
}));

jest.mock("@/hooks/useVideoPlayer");
jest.mock("@/lib/api/tmdb");

const mockedUseVideoPlayer = jest.mocked(useVideoPlayer);
const mockedGetMovieVideos = jest.mocked(getMovieVideos);
const mockedGetTVShowVideos = jest.mocked(getTVShowVideos);

interface MockPlayerRef {
  current: {
    seekTo: jest.Mock;
    getCurrentTime: jest.Mock;
    getSecondsLoaded: jest.Mock;
    getDuration: jest.Mock;
    getInternalPlayer: jest.Mock;
    showPreview: jest.Mock;
    wrapper: unknown;
    props: unknown;
    state: unknown;
    handleClickPreview: jest.Mock;
    handleMouseMove: jest.Mock;
    isReady: boolean;
  };
}

interface MockHookState {
  isPlaying: boolean;
  setIsPlaying: jest.Mock;
  volume: number;
  setVolume: jest.Mock;
  isMuted: boolean;
  setIsMuted: jest.Mock;
  played: number;
  setPlayed: jest.Mock;
  playedSeconds: number;
  setPlayedSeconds: jest.Mock;
  duration: number;
  setDuration: jest.Mock;
  isFullscreen: boolean;
  toggleFullscreen: jest.Mock;
  showControls: boolean;
  setShowControls: jest.Mock;
  resetControlsTimeout: jest.Mock;
  playerRef: MockPlayerRef;
}

const createMockPlayerRef = (): MockPlayerRef => ({
  current: {
    seekTo: jest.fn(),
    getCurrentTime: jest.fn(() => 0),
    getSecondsLoaded: jest.fn(() => 0),
    getDuration: jest.fn(() => 0),
    getInternalPlayer: jest.fn(() => null),
    showPreview: jest.fn(),
    wrapper: null,
    props: {},
    state: {},
    handleClickPreview: jest.fn(),
    handleMouseMove: jest.fn(),
    isReady: false,
  },
});

const createHookState = (overrides: Partial<MockHookState> = {}): MockHookState => ({
  isPlaying: false,
  setIsPlaying: jest.fn(),
  volume: 1,
  setVolume: jest.fn(),
  isMuted: false,
  setIsMuted: jest.fn(),
  played: 0,
  setPlayed: jest.fn(),
  playedSeconds: 0,
  setPlayedSeconds: jest.fn(),
  duration: 0,
  setDuration: jest.fn(),
  isFullscreen: false,
  toggleFullscreen: jest.fn(),
  showControls: true,
  setShowControls: jest.fn(),
  resetControlsTimeout: jest.fn(),
  playerRef: createMockPlayerRef(),
  ...overrides,
});

const renderWithQueryClient = (ui: ReactNode) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
};

const baseVideo: Video = {
  id: 5,
  title: "Example film",
  overview: "Overview",
  posterPath: "/poster.jpg",
  backdropPath: "/backdrop.jpg",
  releaseDate: "2023-01-01",
  voteAverage: 8.3,
  voteCount: 123,
  genreIds: [1],
  mediaType: "movie",
  popularity: 90,
};

describe("VideoPlayer component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders a loading state while fetching the video url", () => {
    const pending = new Promise<string | null>(() => {
      // intentionally unresolved promise to simulate loading
    });
    mockedGetMovieVideos.mockReturnValue(pending);
    mockedUseVideoPlayer.mockReturnValue(createHookState());

    renderWithQueryClient(<VideoPlayer video={baseVideo} />);

    expect(
      screen.getByText(/chargement de la vidéo/i)
    ).toBeInTheDocument();
  });

  it("shows a fallback when no trailer is available", async () => {
    mockedGetMovieVideos.mockResolvedValueOnce(null);
    mockedUseVideoPlayer.mockReturnValue(createHookState());

    renderWithQueryClient(<VideoPlayer video={baseVideo} />);

    await waitFor(() =>
      expect(
        screen.getByText(/aucune vidéo disponible/i)
      ).toBeInTheDocument()
    );
  });

  it("calls onClose when the close button is clicked", async () => {
    const onClose = jest.fn();
    mockedGetMovieVideos.mockResolvedValueOnce("https://youtu.be/demo");
    const toggleFullscreen = jest.fn();
    mockedUseVideoPlayer.mockReturnValue(
      createHookState({
        showControls: true,
        isPlaying: true,
        toggleFullscreen,
      })
    );

    renderWithQueryClient(
      <VideoPlayer video={baseVideo} autoPlay onClose={onClose} />
    );

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /fermer/i })).toBeInTheDocument()
    );

    await userEvent.click(screen.getByRole("button", { name: /fermer/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it("delegates fullscreen toggle to the hook", async () => {
    mockedGetMovieVideos.mockResolvedValueOnce("https://youtu.be/demo");
    const toggleFullscreen = jest.fn();
    mockedUseVideoPlayer.mockReturnValue(
      createHookState({
        toggleFullscreen,
        showControls: true,
      })
    );

    renderWithQueryClient(<VideoPlayer video={baseVideo} />);

    const fullscreenButton = await screen.findByRole("button", {
      name: /plein écran/i,
    });

    await userEvent.click(fullscreenButton);
    expect(toggleFullscreen).toHaveBeenCalled();
  });

  it("requests TV trailers when media type is tv", async () => {
    const tvVideo: Video = { ...baseVideo, id: 99, mediaType: "tv" };
    mockedGetTVShowVideos.mockResolvedValueOnce("https://youtu.be/tv-demo");
    mockedUseVideoPlayer.mockReturnValue(createHookState());

    renderWithQueryClient(<VideoPlayer video={tvVideo} />);

    await waitFor(() => {
      expect(mockedGetTVShowVideos).toHaveBeenCalledWith(tvVideo.id);
    });
  });
});
