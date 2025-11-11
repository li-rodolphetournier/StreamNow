"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createServer = createServer;
const cors_1 = __importDefault(require("@fastify/cors"));
const helmet_1 = __importDefault(require("@fastify/helmet"));
const multipart_1 = __importDefault(require("@fastify/multipart"));
const fastify_1 = __importDefault(require("fastify"));
const fs_1 = require("fs");
const fs_2 = require("fs");
const path_1 = __importDefault(require("path"));
const promises_1 = require("stream/promises");
const stream_1 = require("stream");
const env_1 = require("./env");
const mediaScanner_1 = require("./mediaScanner");
const uploadSessions_1 = require("./uploadSessions");
const sharePermissions_1 = require("./sharePermissions");
const sanitizeRelativePath = (rawValue) => {
    if (!rawValue) {
        return null;
    }
    const trimmed = rawValue.trim();
    if (!trimmed) {
        return null;
    }
    const normalized = path_1.default.normalize(trimmed).replace(/\\/g, "/");
    if (normalized === "." ||
        normalized.startsWith("/") ||
        normalized.startsWith("\\") ||
        path_1.default.isAbsolute(normalized) ||
        normalized.split("/").some((segment) => segment === ".." || segment === "")) {
        return null;
    }
    return normalized;
};
const discardStream = async (stream) => {
    if (!stream) {
        return;
    }
    const sink = new stream_1.Writable({
        write(_chunk, _encoding, callback) {
            callback();
        },
    });
    await (0, promises_1.pipeline)(stream, sink);
};
const USER_ID_HEADER = "x-user-id";
const extractUserId = (request) => {
    const raw = request.headers[USER_ID_HEADER];
    if (!raw) {
        return null;
    }
    if (Array.isArray(raw)) {
        return raw.length > 0 ? raw[0] ?? null : null;
    }
    if (typeof raw !== "string") {
        return null;
    }
    const trimmed = raw.trim();
    return trimmed.length > 0 ? trimmed : null;
};
const emptyStats = () => ({
    files: 0,
    videos: 0,
    directories: 0,
    totalSize: 0,
});
const buildShareLookups = (shares) => {
    const directories = shares
        .filter((share) => share.isDirectory)
        .map((share) => share.path)
        .filter((pathValue, index, array) => array.indexOf(pathValue) === index);
    const files = new Set(shares.filter((share) => !share.isDirectory).map((share) => share.path));
    const hasGlobalAccess = directories.includes("") || directories.includes("./");
    return {
        directories,
        files,
        hasGlobalAccess,
    };
};
const isDirectoryCovered = (pathValue, lookups) => {
    if (pathValue === "") {
        return true;
    }
    return lookups.directories.some((directory) => {
        if (!directory) {
            return true;
        }
        return (pathValue === directory ||
            pathValue.startsWith(directory.endsWith("/") ? directory : `${directory}/`));
    });
};
const isFileAllowed = (pathValue, lookups) => {
    if (lookups.files.has(pathValue)) {
        return true;
    }
    return isDirectoryCovered(pathValue, lookups);
};
const filterChildNode = (node, lookups) => {
    if (node.kind === "file") {
        if (!isFileAllowed(node.relativePath, lookups)) {
            return null;
        }
        const size = node.size ?? 0;
        return {
            node: { ...node },
            stats: {
                files: 1,
                videos: node.mediaType === "video" ? 1 : 0,
                directories: 0,
                totalSize: size,
            },
        };
    }
    const filteredChildren = (node.children ?? [])
        .map((child) => filterChildNode(child, lookups))
        .filter((child) => child !== null);
    const directoryAllowed = isDirectoryCovered(node.relativePath, lookups);
    if (!directoryAllowed && filteredChildren.length === 0) {
        return null;
    }
    const aggregated = filteredChildren.reduce((accumulator, child) => {
        accumulator.files += child.stats.files;
        accumulator.videos += child.stats.videos;
        accumulator.directories += child.stats.directories;
        accumulator.totalSize += child.stats.totalSize;
        return accumulator;
    }, emptyStats());
    return {
        node: {
            ...node,
            children: filteredChildren.map((child) => child.node),
        },
        stats: {
            ...aggregated,
            directories: aggregated.directories + 1,
        },
    };
};
const filterLibraryForShares = (library, shares) => {
    const lookups = buildShareLookups(shares);
    if (lookups.hasGlobalAccess) {
        return {
            node: { ...library.root },
            stats: {
                files: library.totalFiles,
                videos: library.totalVideos,
                directories: library.totalDirectories,
                totalSize: library.totalSize,
            },
        };
    }
    const filteredChildren = (library.root.children ?? [])
        .map((child) => filterChildNode(child, lookups))
        .filter((child) => child !== null);
    const aggregated = filteredChildren.reduce((accumulator, child) => {
        accumulator.files += child.stats.files;
        accumulator.videos += child.stats.videos;
        accumulator.directories += child.stats.directories;
        accumulator.totalSize += child.stats.totalSize;
        return accumulator;
    }, emptyStats());
    return {
        node: {
            ...library.root,
            children: filteredChildren.map((child) => child.node),
        },
        stats: {
            ...aggregated,
            directories: aggregated.directories + 1,
        },
    };
};
async function createServer() {
    const app = (0, fastify_1.default)({
        logger: {
            level: env_1.env.HOME_SERVER_LOG_LEVEL,
        },
    });
    await app.register(helmet_1.default, {
        contentSecurityPolicy: false,
        hidePoweredBy: true,
    });
    await app.register(cors_1.default, {
        origin: true,
        credentials: true,
    });
    await app.register(multipart_1.default, {
        limits: {
            fieldNameSize: 100,
            fieldSize: 2 * 1024 * 1024,
            fields: 10,
            fileSize: 8 * 1024 * 1024 * 1024, // 8 GB
            files: 200,
            headerPairs: 2000,
        },
    });
    const cleanupInterval = setInterval(() => {
        (0, uploadSessions_1.cleanupStaleUploadSessions)(60 * 60 * 1000).catch((error) => {
            app.log.error({ err: error }, "Failed to cleanup stale upload sessions");
        });
    }, 45 * 60 * 1000);
    app.addHook("onClose", async () => {
        clearInterval(cleanupInterval);
    });
    app.get("/health", async () => ({
        status: "ok",
        uptime: process.uptime(),
        mediaRoot: env_1.env.HOME_SERVER_MEDIA_ROOT,
    }));
    app.get("/", async () => ({
        name: "StreamNow Home",
        version: "0.1.0",
        status: "ready",
        timestamp: new Date().toISOString(),
    }));
    app.get("/api/v1/ping", async () => ({
        message: "pong",
        timestamp: new Date().toISOString(),
    }));
    app.get("/api/v1/media", async (request, reply) => {
        const userId = extractUserId(request);
        if (!userId) {
            reply.code(401);
            return {
                status: "error",
                message: "Authentification requise.",
            };
        }
        try {
            const payload = await (0, mediaScanner_1.scanMediaLibrary)();
            if (userId === env_1.env.HOME_SERVER_OWNER_ID) {
                return {
                    ...payload,
                    access: "owner",
                    allowedPaths: [],
                };
            }
            const shares = await (0, sharePermissions_1.getSharesForRecipient)(userId);
            if (shares.length === 0) {
                return {
                    generatedAt: payload.generatedAt,
                    root: {
                        ...payload.root,
                        children: [],
                    },
                    totalFiles: 0,
                    totalVideos: 0,
                    totalDirectories: 1,
                    totalSize: 0,
                    access: "shared",
                    allowedPaths: [],
                };
            }
            const filtered = filterLibraryForShares(payload, shares);
            return {
                generatedAt: payload.generatedAt,
                root: filtered.node,
                totalFiles: filtered.stats.files,
                totalVideos: filtered.stats.videos,
                totalDirectories: filtered.stats.directories,
                totalSize: filtered.stats.totalSize,
                access: "shared",
                allowedPaths: shares.map((share) => share.path),
            };
        }
        catch (error) {
            app.log.error({ err: error }, "Failed to scan media library");
            reply.code(500);
            return {
                status: "error",
                message: "Impossible de récupérer la bibliothèque locale",
            };
        }
    });
    app.delete("/api/v1/media", async (request, reply) => {
        const userId = extractUserId(request);
        if (!userId) {
            reply.code(401);
            return {
                status: "error",
                message: "Authentification requise.",
            };
        }
        if (userId !== env_1.env.HOME_SERVER_OWNER_ID) {
            reply.code(403);
            return {
                status: "error",
                message: "Action réservée au propriétaire du serveur.",
            };
        }
        const mediaRoot = path_1.default.resolve(env_1.env.HOME_SERVER_MEDIA_ROOT);
        const query = request.query;
        const sanitizedPath = sanitizeRelativePath(query.path ?? undefined);
        if (!sanitizedPath) {
            reply.code(400);
            return {
                status: "error",
                message: "Chemin invalide.",
            };
        }
        const absolutePath = path_1.default.join(mediaRoot, sanitizedPath);
        if (!absolutePath.startsWith(mediaRoot)) {
            reply.code(400);
            return {
                status: "error",
                message: "Chemin en dehors du dossier média.",
            };
        }
        try {
            await fs_2.promises.rm(absolutePath, { recursive: true, force: true });
            return {
                status: "ok",
                deleted: sanitizedPath,
            };
        }
        catch (error) {
            app.log.error({ err: error, sanitizedPath }, "Failed to delete media item");
            reply.code(500);
            return {
                status: "error",
                message: "Impossible de supprimer l'élément demandé.",
            };
        }
    });
    app.post("/api/v1/media/move", async (request, reply) => {
        const userId = extractUserId(request);
        if (!userId) {
            reply.code(401);
            return {
                status: "error",
                message: "Authentification requise.",
            };
        }
        if (userId !== env_1.env.HOME_SERVER_OWNER_ID) {
            reply.code(403);
            return {
                status: "error",
                message: "Action réservée au propriétaire du serveur.",
            };
        }
        const mediaRoot = path_1.default.resolve(env_1.env.HOME_SERVER_MEDIA_ROOT);
        const body = request.body;
        const sourcePath = typeof body?.sourcePath === "string" ? body.sourcePath : undefined;
        const destinationPath = typeof body?.destinationPath === "string" ? body.destinationPath : undefined;
        const sanitizedSource = sanitizeRelativePath(sourcePath);
        const sanitizedDestination = sanitizeRelativePath(destinationPath);
        if (!sanitizedSource || !sanitizedDestination) {
            reply.code(400);
            return {
                status: "error",
                message: "Chemins source ou destination invalides.",
            };
        }
        const sourceAbsolute = path_1.default.join(mediaRoot, sanitizedSource);
        const destinationAbsolute = path_1.default.join(mediaRoot, sanitizedDestination);
        if (!sourceAbsolute.startsWith(mediaRoot) ||
            !destinationAbsolute.startsWith(mediaRoot)) {
            reply.code(400);
            return {
                status: "error",
                message: "Chemins en dehors du dossier média.",
            };
        }
        if (sourceAbsolute === destinationAbsolute) {
            reply.code(400);
            return {
                status: "error",
                message: "Les chemins source et destination sont identiques.",
            };
        }
        try {
            const sourceStat = await fs_2.promises.stat(sourceAbsolute).catch(() => null);
            if (!sourceStat) {
                reply.code(404);
                return {
                    status: "error",
                    message: "Le chemin source est introuvable.",
                };
            }
            const destinationParent = path_1.default.dirname(destinationAbsolute);
            await fs_2.promises.mkdir(destinationParent, { recursive: true });
            await fs_2.promises.rename(sourceAbsolute, destinationAbsolute);
            return {
                status: "ok",
                source: sanitizedSource,
                destination: sanitizedDestination,
            };
        }
        catch (error) {
            app.log.error({ err: error, source: sanitizedSource, destination: sanitizedDestination }, "Failed to move media item");
            reply.code(500);
            return {
                status: "error",
                message: "Impossible de déplacer ou renommer l'élément.",
            };
        }
    });
    app.post("/api/v1/media/upload", async (request, reply) => {
        const userId = extractUserId(request);
        if (!userId) {
            reply.code(401);
            return {
                status: "error",
                message: "Authentification requise.",
                savedFiles: [],
                errors: [],
            };
        }
        if (userId !== env_1.env.HOME_SERVER_OWNER_ID) {
            reply.code(403);
            return {
                status: "error",
                message: "Action réservée au propriétaire du serveur.",
                savedFiles: [],
                errors: [],
            };
        }
        const mediaRoot = path_1.default.resolve(env_1.env.HOME_SERVER_MEDIA_ROOT);
        await fs_2.promises.mkdir(mediaRoot, { recursive: true });
        const savedFiles = [];
        const errors = [];
        let processedFiles = 0;
        const parts = request.parts();
        for await (const part of parts) {
            if (part.type !== "file") {
                continue;
            }
            const filePart = part;
            processedFiles += 1;
            const sanitizedPath = sanitizeRelativePath(filePart.filename ?? filePart.fieldname ?? undefined);
            if (!sanitizedPath) {
                errors.push({
                    relativePath: filePart.filename ?? "(inconnu)",
                    reason: "Chemin invalide ou non autorisé.",
                });
                await discardStream(filePart.file);
                continue;
            }
            const absoluteTarget = path_1.default.join(mediaRoot, sanitizedPath);
            if (!absoluteTarget.startsWith(mediaRoot)) {
                errors.push({
                    relativePath: sanitizedPath,
                    reason: "Chemin en dehors du dossier média.",
                });
                await discardStream(filePart.file);
                continue;
            }
            try {
                await fs_2.promises.mkdir(path_1.default.dirname(absoluteTarget), { recursive: true });
                const writeStream = (0, fs_1.createWriteStream)(absoluteTarget);
                await (0, promises_1.pipeline)(filePart.file, writeStream);
                const stats = await fs_2.promises.stat(absoluteTarget);
                savedFiles.push({
                    relativePath: sanitizedPath,
                    size: stats.size,
                });
            }
            catch (error) {
                request.log.error({
                    err: error,
                    relativePath: sanitizedPath,
                }, "Failed to persist uploaded media file");
                errors.push({
                    relativePath: sanitizedPath,
                    reason: "Échec de l'écriture du fichier.",
                });
            }
        }
        if (processedFiles === 0) {
            reply.code(400);
            return {
                status: "error",
                message: "Aucun fichier reçu.",
                savedFiles,
                errors,
            };
        }
        const statusCode = errors.length > 0 ? 207 : 201;
        reply.code(statusCode);
        return {
            status: errors.length > 0 ? "partial" : "ok",
            savedFiles,
            errors,
        };
    });
    app.post("/api/v1/upload/session", async (request, reply) => {
        const userId = extractUserId(request);
        if (!userId) {
            reply.code(401);
            return {
                status: "error",
                message: "Authentification requise.",
            };
        }
        if (userId !== env_1.env.HOME_SERVER_OWNER_ID) {
            reply.code(403);
            return {
                status: "error",
                message: "Action réservée au propriétaire du serveur.",
            };
        }
        const mediaRoot = path_1.default.resolve(env_1.env.HOME_SERVER_MEDIA_ROOT);
        await fs_2.promises.mkdir(mediaRoot, { recursive: true });
        const body = request.body;
        const filename = typeof body?.filename === "string" ? body.filename : undefined;
        const explicitRelativePath = typeof body?.relativePath === "string" ? body.relativePath : undefined;
        const totalSize = typeof body?.totalSize === "number" && Number.isFinite(body.totalSize)
            ? body.totalSize
            : undefined;
        const chunkSize = typeof body?.chunkSize === "number" && Number.isFinite(body.chunkSize)
            ? body.chunkSize
            : undefined;
        const totalChunks = typeof body?.totalChunks === "number" && Number.isFinite(body.totalChunks)
            ? Math.trunc(body.totalChunks)
            : undefined;
        if (!filename || !totalSize || !chunkSize) {
            reply.code(400);
            return {
                status: "error",
                message: "Données d'initialisation d'upload invalides.",
            };
        }
        const sanitizedRelativePath = sanitizeRelativePath(explicitRelativePath ?? filename) ?? sanitizeRelativePath(filename);
        if (!sanitizedRelativePath) {
            reply.code(400);
            return {
                status: "error",
                message: "Chemin de destination invalide.",
            };
        }
        const computedTotalChunks = totalChunks && totalChunks > 0
            ? totalChunks
            : Math.max(1, Math.ceil(totalSize / chunkSize));
        const absolutePath = path_1.default.join(mediaRoot, sanitizedRelativePath);
        if (!absolutePath.startsWith(mediaRoot)) {
            reply.code(400);
            return {
                status: "error",
                message: "Chemin en dehors du dossier média.",
            };
        }
        try {
            const session = await (0, uploadSessions_1.createUploadSession)({
                originalName: filename,
                relativePath: sanitizedRelativePath,
                absolutePath,
                totalSize,
                chunkSize,
                totalChunks: computedTotalChunks,
            });
            reply.code(201);
            return {
                status: "ok",
                sessionId: session.id,
                relativePath: session.relativePath,
                totalChunks: session.totalChunks,
                chunkSize: session.chunkSize,
            };
        }
        catch (error) {
            app.log.error({ err: error }, "Failed to create upload session");
            reply.code(500);
            return {
                status: "error",
                message: "Impossible de créer la session d'upload.",
            };
        }
    });
    app.post("/api/v1/upload/chunk", async (request, reply) => {
        const userId = extractUserId(request);
        if (!userId) {
            reply.code(401);
            return {
                status: "error",
                message: "Authentification requise.",
            };
        }
        if (userId !== env_1.env.HOME_SERVER_OWNER_ID) {
            reply.code(403);
            return {
                status: "error",
                message: "Action réservée au propriétaire du serveur.",
            };
        }
        const query = request.query;
        const sessionId = query.sessionId;
        const chunkIndex = query.chunkIndex !== undefined ? Number.parseInt(query.chunkIndex, 10) : NaN;
        if (!sessionId || Number.isNaN(chunkIndex)) {
            reply.code(400);
            return {
                status: "error",
                message: "Paramètres de fragment invalides.",
            };
        }
        try {
            const file = await request.file();
            if (!file) {
                reply.code(400);
                return {
                    status: "error",
                    message: "Aucun fragment reçu.",
                };
            }
            const buffer = await file.toBuffer();
            const progress = await (0, uploadSessions_1.recordChunkForSession)(sessionId, chunkIndex, buffer);
            return {
                status: "ok",
                ...progress,
            };
        }
        catch (error) {
            app.log.error({ err: error, sessionId, chunkIndex }, "Failed to record upload chunk");
            reply.code(400);
            return {
                status: "error",
                message: "Impossible d'enregistrer le fragment.",
            };
        }
    });
    app.post("/api/v1/upload/complete", async (request, reply) => {
        const userId = extractUserId(request);
        if (!userId) {
            reply.code(401);
            return {
                status: "error",
                message: "Authentification requise.",
            };
        }
        if (userId !== env_1.env.HOME_SERVER_OWNER_ID) {
            reply.code(403);
            return {
                status: "error",
                message: "Action réservée au propriétaire du serveur.",
            };
        }
        const body = request.body;
        const sessionId = typeof body?.sessionId === "string" ? body.sessionId : undefined;
        if (!sessionId) {
            reply.code(400);
            return {
                status: "error",
                message: "Session invalide.",
            };
        }
        try {
            const session = await (0, uploadSessions_1.finalizeUploadSession)(sessionId);
            return {
                status: "ok",
                relativePath: session.relativePath,
            };
        }
        catch (error) {
            app.log.error({ err: error, sessionId }, "Failed to finalize upload session");
            reply.code(400);
            return {
                status: "error",
                message: "Impossible de finaliser la session d'upload.",
            };
        }
    });
    app.delete("/api/v1/upload/session/:sessionId", async (request, reply) => {
        const userId = extractUserId(request);
        if (!userId) {
            reply.code(401);
            return {
                status: "error",
                message: "Authentification requise.",
            };
        }
        if (userId !== env_1.env.HOME_SERVER_OWNER_ID) {
            reply.code(403);
            return {
                status: "error",
                message: "Action réservée au propriétaire du serveur.",
            };
        }
        const { sessionId } = request.params;
        if (!sessionId) {
            reply.code(400);
            return {
                status: "error",
                message: "Session invalide.",
            };
        }
        try {
            await (0, uploadSessions_1.abortUploadSession)(sessionId);
            return {
                status: "ok",
            };
        }
        catch (error) {
            app.log.error({ err: error, sessionId }, "Failed to abort upload session");
            reply.code(500);
            return {
                status: "error",
                message: "Impossible d'annuler la session d'upload.",
            };
        }
    });
    return app;
}
