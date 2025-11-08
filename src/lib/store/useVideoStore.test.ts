import { act } from "@testing-library/react";
import { useVideoStore } from "./useVideoStore";
import type { Video } from "@/types/video";

const baseVideo: Video = {
  id: 1,
  title: "Test video",
  overview: "Overview",
  posterPath: "/poster.jpg",
  backdropPath: "/backdrop.jpg",
  releaseDate: "2024-01-01",
  voteAverage: 8.1,
  voteCount: 100,
  genreIds: [1, 2],
  mediaType: "movie",
  popularity: 120,
};

const createVideo = (overrides: Partial<Video>): Video => ({
  ...baseVideo,
  ...overrides,
});

beforeEach(() => {
  useVideoStore.setState({ favorites: [], watchHistory: [] });
  localStorage.clear();
  jest.spyOn(Date, "now").mockRestore();
});

describe("useVideoStore favorites", () => {
  it("adds videos to favorites and avoids duplicates", () => {
    const first = createVideo({ id: 1, title: "First" });
    const duplicate = createVideo({ id: 1, title: "First duplicate" });
    const second = createVideo({ id: 2, title: "Second" });

    act(() => {
      useVideoStore.getState().addToFavorites(first);
      useVideoStore.getState().addToFavorites(second);
      useVideoStore.getState().addToFavorites(duplicate);
    });

    const { favorites, isFavorite } = useVideoStore.getState();
    expect(favorites).toHaveLength(2);
    expect(favorites[0].id).toBe(duplicate.id);
    expect(isFavorite(first.id)).toBe(true);
    expect(isFavorite(999)).toBe(false);
  });

  it("removes and clears favorites", () => {
    const video = createVideo({ id: 7 });

    act(() => {
      useVideoStore.getState().addToFavorites(video);
    });

    expect(useVideoStore.getState().favorites).toHaveLength(1);

    act(() => {
      useVideoStore.getState().removeFromFavorites(video.id);
    });

    expect(useVideoStore.getState().favorites).toHaveLength(0);

    act(() => {
      useVideoStore.getState().addToFavorites(video);
      useVideoStore.getState().clearFavorites();
    });

    expect(useVideoStore.getState().favorites).toHaveLength(0);
  });
});

describe("useVideoStore watch history", () => {
  it("adds entries to history with ordering and progress tracking", () => {
    const first = createVideo({ id: 10, title: "First" });
    const second = createVideo({ id: 11, title: "Second" });

    jest
      .spyOn(Date, "now")
      .mockReturnValueOnce(1000)
      .mockReturnValueOnce(2000);

    act(() => {
      useVideoStore.getState().addToWatchHistory(first, 25);
      useVideoStore.getState().addToWatchHistory(second, 50);
    });

    const { watchHistory, getWatchProgress } = useVideoStore.getState();
    expect(watchHistory).toHaveLength(2);
    expect(watchHistory[0].video.id).toBe(second.id);
    expect(getWatchProgress(second.id)).toBe(50);
    expect(getWatchProgress(first.id)).toBe(25);
  });

  it("replaces existing history entries and respects 95% threshold", () => {
    const video = createVideo({ id: 42 });

    jest.spyOn(Date, "now").mockReturnValue(5000);

    act(() => {
      useVideoStore.getState().addToWatchHistory(video, 40);
    });
    expect(useVideoStore.getState().watchHistory).toHaveLength(1);

    act(() => {
      useVideoStore.getState().addToWatchHistory(video, 45);
    });
    expect(useVideoStore.getState().watchHistory).toHaveLength(1);
    expect(useVideoStore.getState().getWatchProgress(video.id)).toBe(45);

    act(() => {
      useVideoStore.getState().addToWatchHistory(video, 95);
    });
    expect(useVideoStore.getState().watchHistory).toHaveLength(0);
  });

  it("removes entries explicitly and trims history length", () => {
    const videos = Array.from({ length: 55 }, (_, index) =>
      createVideo({ id: index + 1 })
    );

    jest.spyOn(Date, "now").mockImplementation(() => 1000);

    act(() => {
      videos.forEach((video) => {
        useVideoStore.getState().addToWatchHistory(video, 10);
      });
    });

    expect(useVideoStore.getState().watchHistory).toHaveLength(50);

    const { watchHistory } = useVideoStore.getState();
    const toRemove = watchHistory[0]?.video.id;

    act(() => {
      if (toRemove) {
        useVideoStore.getState().removeFromWatchHistory(toRemove);
      }
    });

    expect(
      useVideoStore.getState().watchHistory.find((entry) => entry.video.id === toRemove)
    ).toBeUndefined();

    act(() => {
      useVideoStore.getState().clearWatchHistory();
    });
    expect(useVideoStore.getState().watchHistory).toHaveLength(0);
  });
});
