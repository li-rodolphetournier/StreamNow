import { renderHook, act } from "@testing-library/react";
import { useVideoPlayer } from "./useVideoPlayer";
import { useVideoStore } from "@/lib/store/useVideoStore";
import type { Video } from "@/types/video";

const video: Video = {
  id: 123,
  title: "Sample video",
  overview: "Overview",
  posterPath: "/poster.jpg",
  backdropPath: "/backdrop.jpg",
  releaseDate: "2024-05-20",
  voteAverage: 7.2,
  voteCount: 500,
  genreIds: [1, 2],
  mediaType: "movie",
  popularity: 99,
};

beforeEach(() => {
  jest.useFakeTimers();
  useVideoStore.setState({ favorites: [], watchHistory: [] });
  localStorage.clear();
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe("useVideoPlayer", () => {
  it("initialises playback state based on autoPlay", () => {
    const { result: autoResult } = renderHook(() =>
      useVideoPlayer({ video, videoUrl: "https://example.com", autoPlay: true })
    );
    expect(autoResult.current.isPlaying).toBe(true);

    const { result: manualResult } = renderHook(() =>
      useVideoPlayer({ video, videoUrl: "https://example.com", autoPlay: false })
    );
    expect(manualResult.current.isPlaying).toBe(false);
  });

  it("saves playback progress periodically and on unmount", () => {
    const addToWatchHistorySpy = jest.spyOn(
      useVideoStore.getState(),
      "addToWatchHistory"
    );

    const { result, unmount } = renderHook(() =>
      useVideoPlayer({ video, videoUrl: "https://example.com", autoPlay: true })
    );

    act(() => {
      result.current.setDuration(120);
      result.current.setPlayedSeconds(60);
    });

    act(() => {
      jest.advanceTimersByTime(10_000);
    });

    expect(addToWatchHistorySpy).toHaveBeenCalledWith(
      expect.objectContaining({ id: video.id }),
      50
    );

    act(() => {
      result.current.setPlayedSeconds(90);
    });

    unmount();

    expect(addToWatchHistorySpy).toHaveBeenCalledWith(
      expect.objectContaining({ id: video.id }),
      75
    );
  });

  it("hides controls after inactivity while playing", () => {
    const { result } = renderHook(() =>
      useVideoPlayer({ video, videoUrl: "https://example.com", autoPlay: true })
    );

    expect(result.current.showControls).toBe(true);

    act(() => {
      result.current.resetControlsTimeout();
      jest.advanceTimersByTime(3_200);
    });

    expect(result.current.showControls).toBe(false);
  });

  it("responds to keyboard shortcuts", () => {
    const requestFullscreen = jest.fn().mockResolvedValue(undefined);
    const exitFullscreen = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(document, "fullscreenElement", {
      configurable: true,
      get: () => null,
    });
    Object.defineProperty(document.documentElement, "requestFullscreen", {
      configurable: true,
      value: requestFullscreen,
    });
    Object.defineProperty(document, "exitFullscreen", {
      configurable: true,
      value: exitFullscreen,
    });

    const { result } = renderHook(() =>
      useVideoPlayer({ video, videoUrl: "https://example.com", autoPlay: false })
    );

    act(() => {
      const spaceEvent = new KeyboardEvent("keydown", { key: " " });
      window.dispatchEvent(spaceEvent);
    });
    expect(result.current.isPlaying).toBe(true);

    act(() => {
      const fEvent = new KeyboardEvent("keydown", { key: "f" });
      window.dispatchEvent(fEvent);
    });
    expect(requestFullscreen).toHaveBeenCalled();
    expect(exitFullscreen).not.toHaveBeenCalled();
  });
});

