import { promises as fs } from "fs";
import path from "path";
import { env } from "./env";
import {
  readMediaTypeOverrides,
  HomeLibraryMediaType,
  getMediaTypeDefinitions,
  MediaTypeDefinition,
} from "./mediaTypes";

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

export type MediaNodeKind = "directory" | "file";
export type MediaFileType = "video" | "audio" | "image" | "subtitle" | "other";

export interface MediaNode {
  id: string;
  name: string;
  relativePath: string;
  kind: MediaNodeKind;
  extension?: string | null;
  mediaType?: MediaFileType;
  size?: number;
  modifiedAt?: string;
  customMediaType?: HomeLibraryMediaType | null;
  inheritedMediaType?: HomeLibraryMediaType | null;
  children?: MediaNode[];
}

interface ScanStats {
  files: number;
  videos: number;
  directories: number;
  totalSize: number;
}

interface ScanResult {
  node: MediaNode;
  stats: ScanStats;
}

const initialStats = (): ScanStats => ({
  files: 0,
  videos: 0,
  directories: 0,
  totalSize: 0,
});

const classifyMediaType = (extension: string | null): MediaFileType => {
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

const normalizeRelativePath = (relativePath: string): string =>
  relativePath.replace(/\\/g, "/");

async function scanEntry(
  absolutePath: string,
  relativePath: string,
  overrides: Map<string, HomeLibraryMediaType>,
  inheritedType: HomeLibraryMediaType | null
): Promise<ScanResult> {
  const stats = await fs.stat(absolutePath);
  const normalizedRelativePath = normalizeRelativePath(relativePath);

  if (stats.isDirectory()) {
    const dirents = await fs.readdir(absolutePath, { withFileTypes: true });
    const children: MediaNode[] = [];
    const aggregateStats = initialStats();

    const overrideForDirectory = overrides.get(normalizedRelativePath || "");
    const effectiveType = overrideForDirectory ?? inheritedType;

    for (const dirent of dirents) {
      if (IGNORED_NAMES.has(dirent.name) || dirent.name.startsWith(".")) {
        continue;
      }

      const childRelativePath = path.join(relativePath, dirent.name);
      const childAbsolutePath = path.join(absolutePath, dirent.name);
      const childResult = await scanEntry(
        childAbsolutePath,
        childRelativePath,
        overrides,
        effectiveType
      );

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
        name: path.basename(absolutePath),
        relativePath: normalizedRelativePath,
        kind: "directory",
        children,
        customMediaType: overrideForDirectory ?? null,
        inheritedMediaType: inheritedType,
      },
      stats: {
        ...aggregateStats,
        directories: aggregateStats.directories + 1,
      },
    };
  }

  const extension = path.extname(absolutePath).toLowerCase() || null;
  const mediaType = classifyMediaType(extension);
  const override = overrides.get(normalizedRelativePath);

  return {
    node: {
      id: normalizedRelativePath,
      name: path.basename(absolutePath),
      relativePath: normalizedRelativePath,
      kind: "file",
      extension,
      mediaType,
      customMediaType: override ?? null,
      inheritedMediaType: inheritedType,
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

export interface MediaLibraryPayload {
  generatedAt: string;
  root: MediaNode;
  totalFiles: number;
  totalVideos: number;
  totalDirectories: number;
  totalSize: number;
  availableMediaTypes: MediaTypeDefinition[];
}

export async function scanMediaLibrary(): Promise<MediaLibraryPayload> {
  const absoluteRootPath = path.resolve(env.HOME_SERVER_MEDIA_ROOT);
  const exists = await fs
    .access(absoluteRootPath)
    .then(() => true)
    .catch(() => false);

  if (!exists) {
    throw new Error(
      `Le dossier média configuré est introuvable: ${absoluteRootPath}`
    );
  }

  const overrides = await readMediaTypeOverrides();
  const overrideMap = new Map<string, HomeLibraryMediaType>(
    Object.entries(overrides)
  );

  const { node, stats } = await scanEntry(
    absoluteRootPath,
    "",
    overrideMap,
    null
  );

  const definitions = await getMediaTypeDefinitions();

  return {
    generatedAt: new Date().toISOString(),
    root: node,
    totalFiles: stats.files,
    totalVideos: stats.videos,
    totalDirectories: stats.directories,
    totalSize: stats.totalSize,
    availableMediaTypes: definitions,
  };
}

