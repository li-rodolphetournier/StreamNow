import { act, renderHook } from "@testing-library/react";

const mockAddToWatchHistory = jest.fn();
const mockGetWatchProgress = jest.fn();

jest.mock("@/lib/store/useVideoStore", () => ({
  useVideoStore: () => ({
    addToWatchHistory: mockAddToWatchHistory,
    getWatchProgress: mockGetWatchProgress,
  }),
}));

import { useVideoPlayer } from "@/hooks/useVideoPlayer";
import type { Video } from "@/types/video";

const video: Video = {
  id: 1,
  title: "Demo Video",
  overview: "Overview",
  posterPath: "/poster.jpg",
  backdropPath: "/backdrop.jpg",
  releaseDate: "2024-01-01",
  voteAverage: 7.5,
  voteCount: 100,
  genreIds: [1],
  mediaType: "movie",
  popularity: 10,
};

describe("useVideoPlayer", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockAddToWatchHistory.mockReset();
    mockGetWatchProgress.mockReset();
    Object.defineProperty(document, "fullscreenElement", {
      writable: true,
      value: null,
    });
    document.documentElement.requestFullscreen = jest
      .fn()
      .mockResolvedValue(undefined);
    document.exitFullscreen = jest.fn().mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it("initializes playing state when autoPlay is true", () => {
    const { result } = renderHook(() =>
      useVideoPlayer({ video, videoUrl: "https://example.com", autoPlay: true })
    );

    expect(result.current.isPlaying).toBe(true);
  });

  it("saves progress on unmount when enough watched", () => {
    const { result, unmount } = renderHook(() =>
      useVideoPlayer({ video, videoUrl: "https://example.com", autoPlay: false })
    );

    act(() => {
      result.current.setDuration(200);
      result.current.setPlayedSeconds(100);
    });

    unmount();

    expect(mockAddToWatchHistory).toHaveBeenCalledWith(video, 50);
  });

  it("toggles fullscreen state", () => {
    const { result } = renderHook(() =>
      useVideoPlayer({ video, videoUrl: "https://example.com", autoPlay: false })
    );

    act(() => {
      result.current.toggleFullscreen();
    });

    expect(document.documentElement.requestFullscreen).toHaveBeenCalled();
    expect(result.current.isFullscreen).toBe(true);
  });
});


