import type { MutableRefObject, ReactNode } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ReactPlayer from "react-player";
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

type VideoPlayerHookState = ReturnType<typeof useVideoPlayer>;

const createHookState = (
  overrides: Partial<VideoPlayerHookState> = {}
): VideoPlayerHookState => {
  const mockReactPlayer = {
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
  } as unknown as ReactPlayer;

  const base: VideoPlayerHookState = {
    isPlaying: false,
    setIsPlaying: jest.fn() as VideoPlayerHookState["setIsPlaying"],
    volume: 1,
    setVolume: jest.fn() as VideoPlayerHookState["setVolume"],
    isMuted: false,
    setIsMuted: jest.fn() as VideoPlayerHookState["setIsMuted"],
    played: 0,
    setPlayed: jest.fn() as VideoPlayerHookState["setPlayed"],
    playedSeconds: 0,
    setPlayedSeconds: jest.fn() as VideoPlayerHookState["setPlayedSeconds"],
    duration: 0,
    setDuration: jest.fn() as VideoPlayerHookState["setDuration"],
    isFullscreen: false,
    toggleFullscreen: jest.fn() as VideoPlayerHookState["toggleFullscreen"],
    showControls: true,
    setShowControls: jest.fn() as VideoPlayerHookState["setShowControls"],
    resetControlsTimeout: jest.fn() as VideoPlayerHookState["resetControlsTimeout"],
    playerRef: { current: mockReactPlayer } as MutableRefObject<ReactPlayer | null>,
  };

  return {
    ...base,
    ...overrides,
  };
};

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
