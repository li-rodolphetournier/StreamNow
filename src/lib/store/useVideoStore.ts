import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Video } from "@/types/video";

interface WatchHistoryEntry {
  video: Video;
  watchedAt: number;
  progress?: number; // 0-100
}

interface VideoStore {
  watchHistory: WatchHistoryEntry[];
  addToWatchHistory: (video: Video, progress?: number) => void;
  getWatchProgress: (videoId: number) => number | undefined;
  removeFromWatchHistory: (videoId: number) => void;
  clearWatchHistory: () => void;
}

export const useVideoStore = create<VideoStore>()(
  persist(
    (set, get) => ({
      watchHistory: [],

      addToWatchHistory: (video, progress) => {
        // Si la progression est >= 95%, considérer la vidéo comme terminée et retirer l'entrée
        if (progress !== undefined && progress >= 95) {
          set((state) => ({
            watchHistory: state.watchHistory.filter(
              (entry) => entry.video.id !== video.id
            ),
          }));
          return;
        }

        set((state) => {
          const filtered = state.watchHistory.filter(
            (entry) => entry.video.id !== video.id
          );

          const newEntry: WatchHistoryEntry = {
            video,
            watchedAt: Date.now(),
            progress,
          };

          const nextHistory = [newEntry, ...filtered].sort(
            (a, b) => b.watchedAt - a.watchedAt
          );

          return {
            watchHistory: nextHistory.slice(0, 50),
          };
        });
      },

      getWatchProgress: (videoId) => {
        const entry = get().watchHistory.find((h) => h.video.id === videoId);
        return entry?.progress;
      },

      removeFromWatchHistory: (videoId) => {
        set((state) => ({
          watchHistory: state.watchHistory.filter(
            (entry) => entry.video.id !== videoId
          ),
        }));
      },

      clearWatchHistory: () => {
        set({ watchHistory: [] });
      },
    }),
    {
      name: "streamnow-storage",
      partialize: (state) => ({
        watchHistory: state.watchHistory,
      }),
    }
  )
);

