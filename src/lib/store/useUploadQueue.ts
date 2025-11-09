import { create } from "zustand";

export type UploadStatus = "pending" | "uploading" | "completed" | "error" | "aborted";

export interface UploadItem {
  id: string;
  name: string;
  relativePath: string;
  size: number;
  uploadedBytes: number;
  status: UploadStatus;
  error?: string;
}

interface UploadState {
  items: UploadItem[];
  upsertUpload: (item: UploadItem) => void;
  updateProgress: (id: string, uploadedBytes: number) => void;
  setStatus: (id: string, status: UploadStatus, error?: string) => void;
  removeUpload: (id: string) => void;
  clearCompleted: () => void;
}

export const useUploadQueue = create<UploadState>((set) => ({
  items: [],
  upsertUpload: (item) =>
    set((state) => {
      const index = state.items.findIndex((candidate) => candidate.id === item.id);
      if (index === -1) {
        return { items: [...state.items, item] };
      }
      const items = state.items.slice();
      items[index] = { ...state.items[index], ...item };
      return { items };
    }),
  updateProgress: (id, uploadedBytes) =>
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id
          ? {
              ...item,
              uploadedBytes: Math.min(uploadedBytes, item.size),
              status: item.status === "pending" ? "uploading" : item.status,
            }
          : item
      ),
    })),
  setStatus: (id, status, error) =>
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id
          ? {
              ...item,
              status,
              error,
              uploadedBytes: status === "completed" ? item.size : item.uploadedBytes,
            }
          : item
      ),
    })),
  removeUpload: (id) =>
    set((state) => ({
      items: state.items.filter((item) => item.id !== id),
    })),
  clearCompleted: () =>
    set((state) => ({
      items: state.items.filter((item) => item.status !== "completed"),
    })),
}));

