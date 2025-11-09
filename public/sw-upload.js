const DEFAULT_CHUNK_SIZE = 5 * 1024 * 1024;
const activeUploads = new Map();

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

const broadcast = async (message) => {
  const clients = await self.clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });

  for (const client of clients) {
    client.postMessage(message);
  }
};

const encodeQuery = (value) => encodeURIComponent(value);

const createSession = async (homeServerUrl, payload, userId) => {
  const response = await fetch(`${homeServerUrl}/api/v1/upload/session`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-user-id": userId,
    },
    credentials: "include",
    body: JSON.stringify({
      filename: payload.name,
      relativePath: payload.relativePath,
      totalSize: payload.size,
      chunkSize: payload.chunkSize ?? DEFAULT_CHUNK_SIZE,
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(
      `Impossible de créer la session d'upload (${response.status})${
        message ? ` : ${message}` : ""
      }`
    );
  }

  return response.json();
};

const uploadChunk = async (homeServerUrl, sessionId, chunkIndex, chunkBlob, userId) => {
  const formData = new FormData();
  formData.append("chunk", chunkBlob);

  const response = await fetch(
    `${homeServerUrl}/api/v1/upload/chunk?sessionId=${encodeQuery(
      sessionId
    )}&chunkIndex=${encodeQuery(chunkIndex)}`,
    {
      method: "POST",
      body: formData,
      credentials: "include",
      headers: {
        "x-user-id": userId,
      },
    }
  );

  if (!response.ok) {
    const message = await response.text();
    throw new Error(
      `Erreur lors de l'envoi du fragment #${chunkIndex} (${response.status})${
        message ? ` : ${message}` : ""
      }`
    );
  }

  return response.json();
};

const completeSession = async (homeServerUrl, sessionId, userId) => {
  const response = await fetch(`${homeServerUrl}/api/v1/upload/complete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-user-id": userId,
    },
    credentials: "include",
    body: JSON.stringify({ sessionId }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(
      `Erreur lors de la finalisation de l'upload (${response.status})${
        message ? ` : ${message}` : ""
      }`
    );
  }

  return response.json();
};

const abortSession = async (homeServerUrl, sessionId, userId) => {
  try {
    await fetch(
      `${homeServerUrl}/api/v1/upload/session/${encodeQuery(sessionId)}`,
      {
        method: "DELETE",
        credentials: "include",
        headers: {
          "x-user-id": userId,
        },
      }
    );
  } catch (error) {
    console.error("Erreur lors de l'annulation de la session", error);
  }
};

const processUpload = async (payload) => {
  const { uploadId, file, relativePath, size, userId } = payload;
  if (!(file instanceof File)) {
    throw new Error("Fichier invalide.");
  }

  if (!userId) {
    throw new Error("Identifiant utilisateur manquant pour l'upload.");
  }

  await broadcast({ type: "UPLOAD_STARTED", uploadId });

  let sessionId;
  try {
    const session = await createSession(
      payload.homeServerUrl,
      {
      name: payload.name,
      relativePath,
      size,
      chunkSize: payload.chunkSize,
      },
      userId
    );

    sessionId = session.sessionId;
    const chunkSize = payload.chunkSize ?? DEFAULT_CHUNK_SIZE;
    const totalChunks =
      session.totalChunks ?? Math.max(1, Math.ceil(size / chunkSize));

    let uploadedBytes = 0;

    for (let index = 0; index < totalChunks; index += 1) {
      const start = index * chunkSize;
      const end = Math.min(size, start + chunkSize);
      const chunk = file.slice(start, end);

      await uploadChunk(payload.homeServerUrl, sessionId, index, chunk, userId);
      uploadedBytes = end;

      await broadcast({
        type: "UPLOAD_PROGRESS",
        uploadId,
        uploadedBytes,
      });
    }

    await completeSession(payload.homeServerUrl, sessionId, userId);

    await broadcast({
      type: "UPLOAD_PROGRESS",
      uploadId,
      uploadedBytes: size,
    });

    await broadcast({
      type: "UPLOAD_COMPLETED",
      uploadId,
      relativePath,
    });
  } catch (error) {
    await broadcast({
      type: "UPLOAD_FAILED",
      uploadId,
      error: error instanceof Error ? error.message : "Erreur inconnue.",
    });

    if (sessionId) {
      await abortSession(payload.homeServerUrl, sessionId, userId);
    }
  } finally {
    activeUploads.delete(uploadId);
  }
};

self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || typeof data !== "object") {
    return;
  }

  if (data.type === "UPLOAD_FILES" && Array.isArray(data.files)) {
    data.files.forEach((filePayload) => {
      if (!filePayload || typeof filePayload !== "object") {
        return;
      }

      const { uploadId } = filePayload;

      if (!uploadId || activeUploads.has(uploadId)) {
        return;
      }

      activeUploads.set(uploadId, { status: "queued" });

      processUpload(filePayload).catch((error) => {
        console.error("Unhandled upload error", error);
      });
    });
  }
});

