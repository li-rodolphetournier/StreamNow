import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { env } from "./env";

export interface UploadSession {
  id: string;
  originalName: string;
  relativePath: string;
  absolutePath: string;
  tmpPath: string;
  totalSize: number;
  chunkSize: number;
  totalChunks: number;
  receivedChunks: Set<number>;
  receivedBytes: number;
  createdAt: number;
}

const sessions = new Map<string, UploadSession>();
const TEMP_DIRECTORY = ".tmp_uploads";

const ensureTempDirectory = async (): Promise<string> => {
  const root = path.resolve(env.HOME_SERVER_MEDIA_ROOT);
  const tempDir = path.join(root, TEMP_DIRECTORY);
  await fs.mkdir(tempDir, { recursive: true });
  return tempDir;
};

export const createUploadSession = async (input: {
  originalName: string;
  relativePath: string;
  absolutePath: string;
  totalSize: number;
  chunkSize: number;
  totalChunks: number;
}): Promise<UploadSession> => {
  const { originalName, relativePath, absolutePath, totalSize, chunkSize, totalChunks } = input;

  if (sessions.size > 10_000) {
    // Basic safeguard to avoid unbounded memory usage
    throw new Error("Trop de sessions d'upload actives. Réessayez plus tard.");
  }

  const id = randomUUID();
  const tempDir = await ensureTempDirectory();
  const tmpPath = path.join(tempDir, `${id}.part`);

  await fs.writeFile(tmpPath, Buffer.alloc(0));

  const session: UploadSession = {
    id,
    originalName,
    relativePath,
    absolutePath,
    tmpPath,
    totalSize,
    chunkSize,
    totalChunks,
    receivedChunks: new Set(),
    receivedBytes: 0,
    createdAt: Date.now(),
  };

  sessions.set(id, session);

  return session;
};

export const getUploadSession = (sessionId: string): UploadSession => {
  const session = sessions.get(sessionId);
  if (!session) {
    throw new Error("Session introuvable.");
  }
  return session;
};

export const recordChunkForSession = async (
  sessionId: string,
  chunkIndex: number,
  chunk: Buffer
): Promise<{
  receivedChunks: number;
  totalChunks: number;
  receivedBytes: number;
  totalSize: number;
}> => {
  const session = getUploadSession(sessionId);

  if (chunkIndex < 0 || chunkIndex >= session.totalChunks) {
    throw new Error("Index de fragment invalide.");
  }

  const offset = chunkIndex * session.chunkSize;

  const handle = await fs.open(session.tmpPath, "r+");
  try {
    await handle.write(chunk, 0, chunk.length, offset);
  } finally {
    await handle.close();
  }

  if (!session.receivedChunks.has(chunkIndex)) {
    session.receivedChunks.add(chunkIndex);
    session.receivedBytes = Math.min(
      session.totalSize,
      session.receivedBytes + chunk.length
    );
  }

  return {
    receivedChunks: session.receivedChunks.size,
    totalChunks: session.totalChunks,
    receivedBytes: session.receivedBytes,
    totalSize: session.totalSize,
  };
};

export const finalizeUploadSession = async (
  sessionId: string
): Promise<UploadSession> => {
  const session = getUploadSession(sessionId);

  if (session.receivedChunks.size !== session.totalChunks) {
    throw new Error("Fragments manquants, impossible de finaliser l'upload.");
  }

  await fs.mkdir(path.dirname(session.absolutePath), { recursive: true });
  await fs.rename(session.tmpPath, session.absolutePath);

  sessions.delete(sessionId);

  return session;
};

export const abortUploadSession = async (sessionId: string): Promise<void> => {
  const session = sessions.get(sessionId);
  if (!session) {
    return;
  }

  sessions.delete(sessionId);
  await fs.rm(session.tmpPath, { force: true });
};

export const cleanupStaleUploadSessions = async (maxAgeMs: number): Promise<void> => {
  const now = Date.now();
  const staleSessions = Array.from(sessions.values()).filter(
    (session) => now - session.createdAt > maxAgeMs
  );

  await Promise.all(staleSessions.map((session) => abortUploadSession(session.id)));
};

