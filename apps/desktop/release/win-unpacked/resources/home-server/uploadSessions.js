"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanupStaleUploadSessions = exports.abortUploadSession = exports.finalizeUploadSession = exports.recordChunkForSession = exports.getUploadSession = exports.createUploadSession = void 0;
const crypto_1 = require("crypto");
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const env_1 = require("./env");
const sessions = new Map();
const TEMP_DIRECTORY = ".tmp_uploads";
const ensureTempDirectory = async () => {
    const root = path_1.default.resolve(env_1.env.HOME_SERVER_MEDIA_ROOT);
    const tempDir = path_1.default.join(root, TEMP_DIRECTORY);
    await fs_1.promises.mkdir(tempDir, { recursive: true });
    return tempDir;
};
const createUploadSession = async (input) => {
    const { originalName, relativePath, absolutePath, totalSize, chunkSize, totalChunks } = input;
    if (sessions.size > 10_000) {
        // Basic safeguard to avoid unbounded memory usage
        throw new Error("Trop de sessions d'upload actives. Réessayez plus tard.");
    }
    const id = (0, crypto_1.randomUUID)();
    const tempDir = await ensureTempDirectory();
    const tmpPath = path_1.default.join(tempDir, `${id}.part`);
    await fs_1.promises.writeFile(tmpPath, Buffer.alloc(0));
    const session = {
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
exports.createUploadSession = createUploadSession;
const getUploadSession = (sessionId) => {
    const session = sessions.get(sessionId);
    if (!session) {
        throw new Error("Session introuvable.");
    }
    return session;
};
exports.getUploadSession = getUploadSession;
const recordChunkForSession = async (sessionId, chunkIndex, chunk) => {
    const session = (0, exports.getUploadSession)(sessionId);
    if (chunkIndex < 0 || chunkIndex >= session.totalChunks) {
        throw new Error("Index de fragment invalide.");
    }
    const offset = chunkIndex * session.chunkSize;
    const handle = await fs_1.promises.open(session.tmpPath, "r+");
    try {
        await handle.write(chunk, 0, chunk.length, offset);
    }
    finally {
        await handle.close();
    }
    if (!session.receivedChunks.has(chunkIndex)) {
        session.receivedChunks.add(chunkIndex);
        session.receivedBytes = Math.min(session.totalSize, session.receivedBytes + chunk.length);
    }
    return {
        receivedChunks: session.receivedChunks.size,
        totalChunks: session.totalChunks,
        receivedBytes: session.receivedBytes,
        totalSize: session.totalSize,
    };
};
exports.recordChunkForSession = recordChunkForSession;
const finalizeUploadSession = async (sessionId) => {
    const session = (0, exports.getUploadSession)(sessionId);
    if (session.receivedChunks.size !== session.totalChunks) {
        throw new Error("Fragments manquants, impossible de finaliser l'upload.");
    }
    await fs_1.promises.mkdir(path_1.default.dirname(session.absolutePath), { recursive: true });
    await fs_1.promises.rename(session.tmpPath, session.absolutePath);
    sessions.delete(sessionId);
    return session;
};
exports.finalizeUploadSession = finalizeUploadSession;
const abortUploadSession = async (sessionId) => {
    const session = sessions.get(sessionId);
    if (!session) {
        return;
    }
    sessions.delete(sessionId);
    await fs_1.promises.rm(session.tmpPath, { force: true });
};
exports.abortUploadSession = abortUploadSession;
const cleanupStaleUploadSessions = async (maxAgeMs) => {
    const now = Date.now();
    const staleSessions = Array.from(sessions.values()).filter((session) => now - session.createdAt > maxAgeMs);
    await Promise.all(staleSessions.map((session) => (0, exports.abortUploadSession)(session.id)));
};
exports.cleanupStaleUploadSessions = cleanupStaleUploadSessions;
