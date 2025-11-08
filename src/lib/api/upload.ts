export const resolveApiBaseUrl = (): string => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) {
    throw new Error("NEXT_PUBLIC_API_URL is not defined");
  }

  try {
    const url = new URL(apiUrl);
    url.pathname = url.pathname.replace(/\/graphql\/?$/, "/");
    return url.toString().replace(/\/$/, "");
  } catch (error) {
    throw new Error("Invalid NEXT_PUBLIC_API_URL");
  }
};

export interface UploadResponse {
  fileUrl: string;
  originalName: string;
  size: number;
  mimeType: string;
}

export const uploadVideoFile = async (file: File): Promise<UploadResponse> => {
  const baseUrl = resolveApiBaseUrl();
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${baseUrl}/upload`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error("Échec de l'upload du fichier");
  }

  const payload = (await response.json()) as UploadResponse;
  return {
    ...payload,
    fileUrl: payload.fileUrl.startsWith("http")
      ? payload.fileUrl
      : `${baseUrl}${payload.fileUrl}`,
  };
};
