"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scanMediaLibrary = scanMediaLibrary;
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const env_1 = require("./env");
const VIDEO_EXTENSIONS = new Set([
    ".mp4",
    ".mkv",
    ".webm",
    ".mov",
    ".avi",
    ".wmv",
    ".flv",
    ".m4v",
]);
const AUDIO_EXTENSIONS = new Set([".mp3", ".aac", ".flac", ".wav", ".ogg"]);
const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);
const SUBTITLE_EXTENSIONS = new Set([".srt", ".vtt", ".ass", ".ssa"]);
const IGNORED_NAMES = new Set([".DS_Store", "Thumbs.db"]);
const initialStats = () => ({
    files: 0,
    videos: 0,
    directories: 0,
    totalSize: 0,
});
const classifyMediaType = (extension) => {
    if (!extension) {
        return "other";
    }
    if (VIDEO_EXTENSIONS.has(extension)) {
        return "video";
    }
    if (AUDIO_EXTENSIONS.has(extension)) {
        return "audio";
    }
    if (IMAGE_EXTENSIONS.has(extension)) {
        return "image";
    }
    if (SUBTITLE_EXTENSIONS.has(extension)) {
        return "subtitle";
    }
    return "other";
};
const normalizeRelativePath = (relativePath) => relativePath.replace(/\\/g, "/");
async function scanEntry(absolutePath, relativePath) {
    const stats = await fs_1.promises.stat(absolutePath);
    const normalizedRelativePath = normalizeRelativePath(relativePath);
    if (stats.isDirectory()) {
        const dirents = await fs_1.promises.readdir(absolutePath, { withFileTypes: true });
        const children = [];
        const aggregateStats = initialStats();
        for (const dirent of dirents) {
            if (IGNORED_NAMES.has(dirent.name) || dirent.name.startsWith(".")) {
                continue;
            }
            const childRelativePath = path_1.default.join(relativePath, dirent.name);
            const childAbsolutePath = path_1.default.join(absolutePath, dirent.name);
            const childResult = await scanEntry(childAbsolutePath, childRelativePath);
            children.push(childResult.node);
            aggregateStats.files += childResult.stats.files;
            aggregateStats.videos += childResult.stats.videos;
            aggregateStats.directories += childResult.stats.directories;
            aggregateStats.totalSize += childResult.stats.totalSize;
        }
        children.sort((a, b) => a.name.localeCompare(b.name));
        return {
            node: {
                id: normalizedRelativePath || "root",
                name: path_1.default.basename(absolutePath),
                relativePath: normalizedRelativePath,
                kind: "directory",
                children,
            },
            stats: {
                ...aggregateStats,
                directories: aggregateStats.directories + 1,
            },
        };
    }
    const extension = path_1.default.extname(absolutePath).toLowerCase() || null;
    const mediaType = classifyMediaType(extension);
    return {
        node: {
            id: normalizedRelativePath,
            name: path_1.default.basename(absolutePath),
            relativePath: normalizedRelativePath,
            kind: "file",
            extension,
            mediaType,
            size: stats.size,
            modifiedAt: stats.mtime.toISOString(),
        },
        stats: {
            files: 1,
            videos: mediaType === "video" ? 1 : 0,
            directories: 0,
            totalSize: stats.size,
        },
    };
}
async function scanMediaLibrary() {
    const absoluteRootPath = path_1.default.resolve(env_1.env.HOME_SERVER_MEDIA_ROOT);
    const exists = await fs_1.promises
        .access(absoluteRootPath)
        .then(() => true)
        .catch(() => false);
    if (!exists) {
        throw new Error(`Le dossier média configuré est introuvable: ${absoluteRootPath}`);
    }
    const { node, stats } = await scanEntry(absoluteRootPath, "");
    return {
        generatedAt: new Date().toISOString(),
        root: node,
        totalFiles: stats.files,
        totalVideos: stats.videos,
        totalDirectories: stats.directories,
        totalSize: stats.totalSize,
    };
}
