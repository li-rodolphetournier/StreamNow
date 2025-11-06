import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Video } from "@/types/video";

interface VideoStore {
  favorites: Video[];
  watchHistory: Array<{
    video: Video;
    watchedAt: number;
    progress?: number; // 0-100
  }>;
  addToFavorites: (video: Video) => void;
  removeFromFavorites: (videoId: number) => void;
  isFavorite: (videoId: number) => boolean;
  addToWatchHistory: (video: Video, progress?: number) => void;
  getWatchProgress: (videoId: number) => number | undefined;
  clearWatchHistory: () => void;
}

export const useVideoStore = create<VideoStore>()(
  persist(
    (set, get) => ({
      favorites: [],
      watchHistory: [],

      addToFavorites: (video) => {
        set((state) => {
          if (state.favorites.some((f) => f.id === video.id)) {
            return state;
          }
          return {
            favorites: [...state.favorites, video],
          };
        });
      },

      removeFromFavorites: (videoId) => {
        set((state) => ({
          favorites: state.favorites.filter((f) => f.id !== videoId),
        }));
      },

      isFavorite: (videoId) => {
        return get().favorites.some((f) => f.id === videoId);
      },

      addToWatchHistory: (video, progress) => {
        set((state) => {
          const existingIndex = state.watchHistory.findIndex(
            (h) => h.video.id === video.id
          );

          const newEntry = {
            video,
            watchedAt: Date.now(),
            progress,
          };

          if (existingIndex >= 0) {
            // Mettre à jour l'entrée existante
            const updated = [...state.watchHistory];
            updated[existingIndex] = newEntry;
            return { watchHistory: updated };
          }

          // Ajouter une nouvelle entrée
          return {
            watchHistory: [...state.watchHistory, newEntry],
          };
        });
      },

      getWatchProgress: (videoId) => {
        const entry = get().watchHistory.find((h) => h.video.id === videoId);
        return entry?.progress;
      },

      clearWatchHistory: () => {
        set({ watchHistory: [] });
      },
    }),
    {
      name: "streamnow-storage",
      partialize: (state) => ({
        favorites: state.favorites,
        watchHistory: state.watchHistory,
      }),
    }
  )
);

