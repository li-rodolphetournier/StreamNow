"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useUploadQueue } from "@/lib/store/useUploadQueue";
import { isHomeServerEnabled } from "@/lib/api/home";

const DEFAULT_CHUNK_SIZE = 5 * 1024 * 1024; // 5 MB

const createUploadId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

interface UploadRequestPayload {
  uploadId: string;
  file: File;
  name: string;
  relativePath: string;
  size: number;
  chunkSize: number;
  homeServerUrl: string;
  userId: string;
}

const hasActiveUploads = (items: ReturnType<typeof useUploadQueue.getState>["items"]) =>
  items.some((item) => item.status === "pending" || item.status === "uploading");

export function useUploadManager(userId: string) {
  const queryClient = useQueryClient();
  const items = useUploadQueue((state) => state.items);
  const upsertUpload = useUploadQueue((state) => state.upsertUpload);
  const updateProgress = useUploadQueue((state) => state.updateProgress);
  const setStatus = useUploadQueue((state) => state.setStatus);
  const clearCompleted = useUploadQueue((state) => state.clearCompleted);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    const handler = (event: MessageEvent) => {
      const data = event.data as
        | {
            type: "UPLOAD_STARTED";
            uploadId: string;
          }
        | {
            type: "UPLOAD_PROGRESS";
            uploadId: string;
            uploadedBytes: number;
          }
        | {
            type: "UPLOAD_COMPLETED";
            uploadId: string;
            relativePath: string;
          }
        | {
            type: "UPLOAD_FAILED";
            uploadId: string;
            error: string;
          }
        | {
            type: "UPLOAD_ABORTED";
            uploadId: string;
          }
        | undefined;

      if (!data) {
        return;
      }

      switch (data.type) {
        case "UPLOAD_STARTED": {
          setStatus(data.uploadId, "uploading");
          break;
        }
        case "UPLOAD_PROGRESS": {
          updateProgress(data.uploadId, data.uploadedBytes);
          break;
        }
        case "UPLOAD_COMPLETED": {
          setStatus(data.uploadId, "completed");
          void queryClient.invalidateQueries({
            queryKey: ["home-media-library", userId],
          });
          break;
        }
        case "UPLOAD_FAILED": {
          setStatus(data.uploadId, "error", data.error);
          break;
        }
        case "UPLOAD_ABORTED": {
          setStatus(data.uploadId, "aborted");
          break;
        }
        default:
          break;
      }
    };

    navigator.serviceWorker.addEventListener("message", handler);
    return () => {
      navigator.serviceWorker.removeEventListener("message", handler);
    };
  }, [queryClient, setStatus, updateProgress, userId]);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    const register = async () => {
      try {
        await navigator.serviceWorker.register("/sw-upload.js", { scope: "/" });
      } catch (error) {
        console.error("Service worker registration failed", error);
      }
    };

    void register();
  }, []);

  useEffect(() => {
    if (hasActiveUploads(items)) {
      const handler = (event: BeforeUnloadEvent) => {
        event.preventDefault();
        event.returnValue =
          "Des uploads sont en cours. Quitter la page annulera les transferts.";
      };

      window.addEventListener("beforeunload", handler);
      return () => {
        window.removeEventListener("beforeunload", handler);
      };
    }

    return undefined;
  }, [items]);

  const startUploads = useCallback(
    async (files: File[]) => {
      if (!files.length) {
        return;
      }

      if (!isHomeServerEnabled) {
        throw new Error("Le serveur StreamNow Home n'est pas configuré.");
      }

      if (!("serviceWorker" in navigator)) {
        throw new Error("Service Worker non disponible dans ce navigateur.");
      }

      const homeServerUrl = process.env.NEXT_PUBLIC_HOME_SERVER_URL;
      if (!homeServerUrl) {
        throw new Error("NEXT_PUBLIC_HOME_SERVER_URL n'est pas défini.");
      }

      const registration = await navigator.serviceWorker.ready;
      const controller = registration.active ?? navigator.serviceWorker.controller;

      if (!controller) {
        throw new Error("Service Worker non prêt. Réessayez dans un instant.");
      }

      const payload: UploadRequestPayload[] = files.map((file) => {
        const withRelativePath = file as File & { webkitRelativePath?: string };
        const relativePath =
          withRelativePath.webkitRelativePath && withRelativePath.webkitRelativePath.length > 0
            ? withRelativePath.webkitRelativePath
            : file.name;
        const uploadId = createUploadId();

        upsertUpload({
          id: uploadId,
          name: file.name,
          relativePath,
          size: file.size,
          uploadedBytes: 0,
          status: "pending",
        });

        return {
          uploadId,
          file,
          name: file.name,
          relativePath,
          size: file.size,
          chunkSize: DEFAULT_CHUNK_SIZE,
          homeServerUrl,
          userId,
        };
      });

      controller.postMessage({
        type: "UPLOAD_FILES",
        files: payload,
      });
    },
    [upsertUpload, userId]
  );

  const activeUploads = useMemo(
    () => items.filter((item) => item.status === "pending" || item.status === "uploading"),
    [items]
  );

  return {
    uploads: items,
    activeUploads,
    startUploads,
    clearCompleted,
  };
}

