import {
  HomeMediaLibrary,
  HomeMediaUploadResponse,
} from "@/types/home";

const homeEndpoint = process.env.NEXT_PUBLIC_HOME_SERVER_URL;

export interface HomeHealthResponse {
  status: string;
  uptime: number;
  mediaRoot?: string;
  version?: string;
  timestamp?: string;
}

export const isHomeServerEnabled = Boolean(homeEndpoint);

const assertHomeEndpoint = () => {
  if (!homeEndpoint) {
    throw new Error("NEXT_PUBLIC_HOME_SERVER_URL is not configured.");
  }

  return homeEndpoint;
};

export async function fetchHomeHealth(): Promise<HomeHealthResponse> {
  const endpoint = assertHomeEndpoint();

  const response = await fetch(`${endpoint}/health`, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(
      `Home server health check failed with status ${response.status}`
    );
  }

  return (await response.json()) as HomeHealthResponse;
}

export async function fetchHomeMediaLibrary(): Promise<HomeMediaLibrary> {
  const endpoint = assertHomeEndpoint();

  const response = await fetch(`${endpoint}/api/v1/media`, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(
      `Home media library fetch failed with status ${response.status}`
    );
  }

  return (await response.json()) as HomeMediaLibrary;
}

export async function uploadHomeMedia(
  files: File[]
): Promise<HomeMediaUploadResponse> {
  const endpoint = assertHomeEndpoint();

  if (!files.length) {
    throw new Error("Aucun fichier sélectionné.");
  }

  const formData = new FormData();

  files.forEach((file) => {
    const withRelative = file as File & { webkitRelativePath?: string };
    const relativePath =
      withRelative.webkitRelativePath && withRelative.webkitRelativePath.length > 0
        ? withRelative.webkitRelativePath
        : file.name;

    formData.append("files", file, relativePath);
  });

  const response = await fetch(`${endpoint}/api/v1/media/upload`, {
    method: "POST",
    body: formData,
    credentials: "include",
  });

  if (!response.ok && response.status !== 207) {
    const message = await response.text();
    throw new Error(
      `Échec de l'upload vers StreamNow Home (statut ${response.status})${message ? ` : ${message}` : ""}`
    );
  }

  return (await response.json()) as HomeMediaUploadResponse;
}
