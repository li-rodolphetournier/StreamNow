import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import multipart, { MultipartFile } from "@fastify/multipart";
import fastify, { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { createWriteStream } from "fs";
import { promises as fs } from "fs";
import path from "path";
import { pipeline } from "stream/promises";
import { Writable } from "stream";
import { env } from "./env";
import { scanMediaLibrary } from "./mediaScanner";
import { sanitizeRelativePath } from "./utils";
import type { MediaLibraryPayload, MediaNode } from "./mediaScanner";
import {
  addMediaTypeDefinition,
  getMediaTypeDefinitions,
  removeMediaTypeDefinition,
  setMediaTypeForPath,
  type HomeLibraryMediaType,
} from "./mediaTypes";
import {
  abortUploadSession,
  cleanupStaleUploadSessions,
  createUploadSession,
  finalizeUploadSession,
  getUploadSession,
  recordChunkForSession,
} from "./uploadSessions";
import { getSharesForRecipient, SharePermission } from "./sharePermissions";

interface UploadSummary {
  relativePath: string;
  size: number;
}

interface UploadError {
  relativePath: string;
  reason: string;
}

const sanitizeDirectoryName = (rawValue: string | undefined | null): string | null => {
  if (typeof rawValue !== "string") {
    return null;
  }

  const trimmed = rawValue.trim();

  if (!trimmed) {
    return null;
  }

  if (/[\\/]/.test(trimmed)) {
    return null;
  }

  if (trimmed === "." || trimmed === "..") {
    return null;
  }

  return trimmed;
};

const discardStream = async (stream?: NodeJS.ReadableStream) => {
  if (!stream) {
    return;
  }

  const sink = new Writable({
    write(_chunk, _encoding, callback) {
      callback();
    },
  });

  await pipeline(stream, sink);
};

const USER_ID_HEADER = "x-user-id";

const extractUserId = (request: FastifyRequest): string | null => {
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

const IGNORED_NAMES = new Set([".DS_Store", "Thumbs.db"]);

interface AggregateStats {
  files: number;
  videos: number;
  directories: number;
  totalSize: number;
}

const emptyStats = (): AggregateStats => ({
  files: 0,
  videos: 0,
  directories: 0,
  totalSize: 0,
});

const USERS_DIRECTORY = "users";

const ownerId = env.HOME_SERVER_OWNER_ID;

const getPersonalRelativePath = (userId: string): string =>
  `${USERS_DIRECTORY}/${userId}`;

const getPersonalAbsolutePath = (userId: string): string =>
  path.join(path.resolve(env.HOME_SERVER_MEDIA_ROOT), getPersonalRelativePath(userId));

const resolveManageableRoots = async (userId: string): Promise<string[]> => {
  if (!userId) {
    return [];
  }

  if (userId === ownerId) {
    return [""];
  }

  await ensurePersonalRoot(userId);
  return [getPersonalRelativePath(userId)];
};

const collectManageableRoots = async (userId: string): Promise<string[]> => {
  const rawRoots = await resolveManageableRoots(userId);

  if (userId === ownerId) {
    return rawRoots.length > 0 ? rawRoots : [""];
  }

  const personalRoot = getPersonalRelativePath(userId);
  if (rawRoots.includes(personalRoot)) {
    return rawRoots;
  }

  const filtered = rawRoots.filter((root) => root.length > 0 && root !== personalRoot);
  return [...filtered, personalRoot];
};

const isPathWithinManageableRoots = (
  relativePath: string,
  manageableRoots: string[]
): boolean => {
  if (!relativePath) {
    return manageableRoots.some((root) => root.length === 0);
  }

  return manageableRoots.some((root) => pathStartsWithRoot(relativePath, root));
};

const normalizeRelativePathForUser = (
  relativePath: string,
  manageableRoots: string[]
): string | null => {
  const sanitized = sanitizeRelativePath(relativePath);
  if (!sanitized) {
    return null;
  }

  for (const root of manageableRoots) {
    if (!root || pathStartsWithRoot(sanitized, root)) {
      return sanitized;
    }
  }

  const primaryRoot = manageableRoots.find((root) => root.length > 0);
  if (!primaryRoot) {
    return sanitized;
  }

  return sanitizeRelativePath(`${primaryRoot}/${sanitized}`);
};

const pathStartsWithRoot = (pathValue: string, root: string): boolean => {
  if (!root) {
    return true;
  }
  return pathValue === root || pathValue.startsWith(`${root}/`);
};

const ensurePersonalRoot = async (userId: string): Promise<void> => {
  if (!userId || userId === ownerId) {
    return;
  }

  const personalAbsolute = getPersonalAbsolutePath(userId);
  await fs.mkdir(personalAbsolute, { recursive: true });
};

const cloneNode = (node: MediaNode): MediaNode => ({
  ...node,
  children: node.children ? node.children.map(cloneNode) : undefined,
});

const computeNodeStats = (node: MediaNode): AggregateStats => {
  if (node.kind === "file") {
    const size = node.size ?? 0;
    return {
      files: 1,
      videos: node.mediaType === "video" ? 1 : 0,
      directories: 0,
      totalSize: size,
    };
  }

  const aggregated = (node.children ?? []).reduce<AggregateStats>(
    (accumulator, child) => {
      const childStats = computeNodeStats(child);
      accumulator.files += childStats.files;
      accumulator.videos += childStats.videos;
      accumulator.directories += childStats.directories;
      accumulator.totalSize += childStats.totalSize;
      return accumulator;
    },
    emptyStats()
  );

  return {
    files: aggregated.files,
    videos: aggregated.videos,
    directories: aggregated.directories + 1,
    totalSize: aggregated.totalSize,
  };
};

const computeChildrenStats = (nodes: MediaNode[]): AggregateStats =>
  nodes.reduce<AggregateStats>((accumulator, child) => {
    const childStats = computeNodeStats(child);
    accumulator.files += childStats.files;
    accumulator.videos += childStats.videos;
    accumulator.directories += childStats.directories;
    accumulator.totalSize += childStats.totalSize;
    return accumulator;
  }, emptyStats());

const findNodeByPath = (root: MediaNode, targetPath: string): MediaNode | null => {
  if (!targetPath) {
    return cloneNode(root);
  }

  const visit = (node: MediaNode): MediaNode | null => {
    if (node.relativePath === targetPath) {
      return cloneNode(node);
    }

    for (const child of node.children ?? []) {
      const result = visit(child);
      if (result) {
        return result;
      }
    }

    return null;
  };

  return visit(root);
};

interface ShareLookups {
  directories: string[];
  files: Set<string>;
  hasGlobalAccess: boolean;
}

const buildShareLookups = (shares: SharePermission[]): ShareLookups => {
  const directories = shares
    .filter((share) => share.isDirectory)
    .map((share) => share.path)
    .filter((pathValue, index, array) => array.indexOf(pathValue) === index);

  const files = new Set(
    shares.filter((share) => !share.isDirectory).map((share) => share.path)
  );

  const hasGlobalAccess =
    directories.includes("") || directories.includes("./");

  return {
    directories,
    files,
    hasGlobalAccess,
  };
};

const isDirectoryCovered = (pathValue: string, lookups: ShareLookups): boolean => {
  if (pathValue === "") {
    return true;
  }

  return lookups.directories.some((directory) => {
    if (!directory) {
      return true;
    }

    return (
      pathValue === directory ||
      pathValue.startsWith(directory.endsWith("/") ? directory : `${directory}/`)
    );
  });
};

const isFileAllowed = (pathValue: string, lookups: ShareLookups): boolean => {
  if (lookups.files.has(pathValue)) {
    return true;
  }

  return isDirectoryCovered(pathValue, lookups);
};

interface FilteredNode {
  node: MediaNode;
  stats: AggregateStats;
}

const filterChildNode = (
  node: MediaNode,
  lookups: ShareLookups
): FilteredNode | null => {
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
    .filter((child): child is FilteredNode => child !== null);

  const directoryAllowed = isDirectoryCovered(node.relativePath, lookups);

  if (!directoryAllowed && filteredChildren.length === 0) {
    return null;
  }

  const aggregated = filteredChildren.reduce<AggregateStats>(
    (accumulator, child) => {
      accumulator.files += child.stats.files;
      accumulator.videos += child.stats.videos;
      accumulator.directories += child.stats.directories;
      accumulator.totalSize += child.stats.totalSize;
      return accumulator;
    },
    emptyStats()
  );

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

const filterLibraryForShares = (
  library: MediaLibraryPayload,
  shares: SharePermission[]
): FilteredNode => {
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
    .filter((child): child is FilteredNode => child !== null);

  const aggregated = filteredChildren.reduce<AggregateStats>(
    (accumulator, child) => {
      accumulator.files += child.stats.files;
      accumulator.videos += child.stats.videos;
      accumulator.directories += child.stats.directories;
      accumulator.totalSize += child.stats.totalSize;
      return accumulator;
    },
    emptyStats()
  );

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

export async function createServer(): Promise<FastifyInstance> {
  const app = fastify({
    logger: {
      level: env.HOME_SERVER_LOG_LEVEL,
    },
  });

  await app.register(helmet, {
    contentSecurityPolicy: false,
    hidePoweredBy: true,
  });

  await app.register(cors, {
    origin: true,
    credentials: true,
  });

  await app.register(multipart, {
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
    cleanupStaleUploadSessions(60 * 60 * 1000).catch((error) => {
      app.log.error({ err: error }, "Failed to cleanup stale upload sessions");
    });
  }, 45 * 60 * 1000);

  app.addHook("onClose", async () => {
    clearInterval(cleanupInterval);
  });

  app.get("/health", async () => ({
    status: "ok",
    uptime: process.uptime(),
    mediaRoot: env.HOME_SERVER_MEDIA_ROOT,
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
      const payload = await scanMediaLibrary();
      const isOwnerRequest = userId === ownerId;

      if (isOwnerRequest) {
        return {
          ...payload,
          access: "owner" as const,
          allowedPaths: [] as string[],
          personalRootPath: "",
          manageableRoots: [""],
        };
      }

      await ensurePersonalRoot(userId);

      const personalRelativePath = getPersonalRelativePath(userId);
      const existingPersonal =
        findNodeByPath(payload.root, personalRelativePath) ?? {
          id: personalRelativePath,
          name: path.basename(personalRelativePath),
          relativePath: personalRelativePath,
          kind: "directory" as const,
          children: [],
          customMediaType: null,
          inheritedMediaType: null,
        };

      const personalNode: MediaNode = {
        ...existingPersonal,
        name: "Mes fichiers",
      };

      const personalStats = computeNodeStats(personalNode);

      const shares = await getSharesForRecipient(userId);
      const sharedFiltered =
        shares.length > 0 ? filterLibraryForShares(payload, shares) : null;

      const sharedChildren = (sharedFiltered?.node.children ?? []).filter(
        (child) => child.relativePath !== personalRelativePath
      );

      const sharedStats = computeChildrenStats(sharedChildren);

      const combinedChildren = [personalNode, ...sharedChildren];
      const combinedStats = computeChildrenStats(combinedChildren);

      return {
        generatedAt: payload.generatedAt,
        root: {
          ...payload.root,
          children: combinedChildren,
        },
        totalFiles: combinedStats.files,
        totalVideos: combinedStats.videos,
        totalDirectories: combinedStats.directories + 1,
        totalSize: combinedStats.totalSize,
        access: "shared" as const,
        allowedPaths: shares.map((share) => share.path),
        availableMediaTypes: payload.availableMediaTypes,
        personalRootPath: personalRelativePath,
        manageableRoots: [personalRelativePath],
      };
    } catch (error) {
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

    const mediaRoot = path.resolve(env.HOME_SERVER_MEDIA_ROOT);
    const query = request.query as { path?: string };
    const sanitizedPath = sanitizeRelativePath(query.path ?? undefined);

    if (!sanitizedPath) {
      reply.code(400);
      return {
        status: "error",
        message: "Chemin invalide.",
      };
    }

    const manageableRoots = await collectManageableRoots(userId);
    if (!isPathWithinManageableRoots(sanitizedPath, manageableRoots)) {
      reply.code(403);
      return {
        status: "error",
        message: "Action réservée à votre espace personnel.",
      };
    }

    const absolutePath = path.join(mediaRoot, sanitizedPath);

    if (!absolutePath.startsWith(mediaRoot)) {
      reply.code(400);
      return {
        status: "error",
        message: "Chemin en dehors du dossier média.",
      };
    }

    try {
      await fs.rm(absolutePath, { recursive: true, force: true });
      return {
        status: "ok",
        deleted: sanitizedPath,
      };
    } catch (error) {
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

    const mediaRoot = path.resolve(env.HOME_SERVER_MEDIA_ROOT);
    const body = request.body as Partial<{
      sourcePath: unknown;
      destinationPath: unknown;
    }>;

    const sourcePath =
      typeof body?.sourcePath === "string" ? body.sourcePath : undefined;
    const destinationPath =
      typeof body?.destinationPath === "string" ? body.destinationPath : undefined;

    const sanitizedSource = sanitizeRelativePath(sourcePath);
    const sanitizedDestination = sanitizeRelativePath(destinationPath);

    if (!sanitizedSource || !sanitizedDestination) {
      reply.code(400);
      return {
        status: "error",
        message: "Chemins source ou destination invalides.",
      };
    }

    const manageableRoots = await collectManageableRoots(userId);
    if (
      !isPathWithinManageableRoots(sanitizedSource, manageableRoots) ||
      !isPathWithinManageableRoots(sanitizedDestination, manageableRoots)
    ) {
      reply.code(403);
      return {
        status: "error",
        message: "Action réservée à votre espace personnel.",
      };
    }

    const sourceAbsolute = path.join(mediaRoot, sanitizedSource);
    const destinationAbsolute = path.join(mediaRoot, sanitizedDestination);

    if (
      !sourceAbsolute.startsWith(mediaRoot) ||
      !destinationAbsolute.startsWith(mediaRoot)
    ) {
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
      const sourceStat = await fs.stat(sourceAbsolute).catch(() => null);
      if (!sourceStat) {
        reply.code(404);
        return {
          status: "error",
          message: "Le chemin source est introuvable.",
        };
      }

      const destinationParent = path.dirname(destinationAbsolute);
      await fs.mkdir(destinationParent, { recursive: true });

      await fs.rename(sourceAbsolute, destinationAbsolute);

      return {
        status: "ok",
        source: sanitizedSource,
        destination: sanitizedDestination,
      };
    } catch (error) {
      app.log.error(
        { err: error, source: sanitizedSource, destination: sanitizedDestination },
        "Failed to move media item"
      );
      reply.code(500);
      return {
        status: "error",
        message: "Impossible de déplacer ou renommer l'élément.",
      };
    }
  });

  app.post("/api/v1/media/directory", async (request, reply) => {
    const userId = extractUserId(request);

    if (!userId) {
      reply.code(401);
      return {
        status: "error",
        message: "Authentification requise.",
      };
    }

    const mediaRoot = path.resolve(env.HOME_SERVER_MEDIA_ROOT);
    await fs.mkdir(mediaRoot, { recursive: true });

    const body = request.body as Partial<{
      parentPath: unknown;
      name: unknown;
      ensureAvailable: unknown;
    }>;

    const parentPathRaw =
      typeof body?.parentPath === "string" && body.parentPath.trim().length > 0
        ? body.parentPath
        : "";
    const sanitizedParent =
      parentPathRaw.length > 0 ? sanitizeRelativePath(parentPathRaw) : "";

    if (sanitizedParent === null) {
      reply.code(400);
      return {
        status: "error",
        message: "Chemin parent invalide.",
      };
    }

    const manageableRoots = await collectManageableRoots(userId);
    let effectiveParent =
      typeof sanitizedParent === "string" && sanitizedParent.length > 0
        ? sanitizedParent
        : "";

    if (!manageableRoots.length) {
      reply.code(403);
      return {
        status: "error",
        message: "Espace personnel indisponible pour cet utilisateur.",
      };
    }

    if (userId !== ownerId) {
      const primaryRoot =
        manageableRoots.find((root) => root.length > 0) ?? getPersonalRelativePath(userId);

      if (!manageableRoots.includes(primaryRoot)) {
        manageableRoots.push(primaryRoot);
      }

      if (!effectiveParent) {
        effectiveParent = primaryRoot;
      } else if (!isPathWithinManageableRoots(effectiveParent, manageableRoots)) {
        reply.code(403);
        return {
          status: "error",
          message: "Impossible de créer un dossier en dehors de votre espace personnel.",
        };
      }
    }

    if (!isPathWithinManageableRoots(effectiveParent, manageableRoots)) {
      reply.code(403);
      return {
        status: "error",
        message: "Chemin parent non autorisé.",
      };
    }

    const sanitizedName = sanitizeDirectoryName(
      typeof body?.name === "string" ? body.name : undefined
    );

    if (!sanitizedName) {
      reply.code(400);
      return {
        status: "error",
        message: "Nom de dossier invalide.",
      };
    }

    const parentAbsolute =
      effectiveParent && effectiveParent.length > 0
        ? path.join(mediaRoot, effectiveParent)
        : mediaRoot;

    if (!parentAbsolute.startsWith(mediaRoot)) {
      reply.code(400);
      return {
        status: "error",
        message: "Chemin parent en dehors du dossier média.",
      };
    }

    await fs.mkdir(parentAbsolute, { recursive: true });

    const ensureAvailable = body?.ensureAvailable !== false;

    const buildRelativePath = (name: string): string | null => {
      const candidate =
        effectiveParent && effectiveParent.length > 0
          ? `${effectiveParent}/${name}`
          : name;
      return sanitizeRelativePath(candidate);
    };

    const baseRelativePath = buildRelativePath(sanitizedName);

    if (!baseRelativePath) {
      reply.code(400);
      return {
        status: "error",
        message: "Chemin de dossier invalide.",
      };
    }

    if (!isPathWithinManageableRoots(baseRelativePath, manageableRoots)) {
      reply.code(403);
      return {
        status: "error",
        message: "Chemin de dossier en dehors de votre espace personnel.",
      };
    }

    let finalName = sanitizedName;
    let finalRelativePath = baseRelativePath;

    const ensureUniquePath = async () => {
      if (!ensureAvailable) {
        return;
      }

      let suffix = 1;
      while (true) {
        const absoluteCandidate = path.join(mediaRoot, finalRelativePath);
        try {
          const stats = await fs.stat(absoluteCandidate);
          if (stats.isDirectory() || stats.isFile()) {
            finalName = `${sanitizedName}-${suffix}`;
            const nextRelativePath = buildRelativePath(finalName);
            if (!nextRelativePath) {
              throw new Error("Échec de la génération d'un nom de dossier disponible.");
            }
            finalRelativePath = nextRelativePath;
            suffix += 1;
            continue;
          }
          return;
        } catch (error) {
          if ((error as NodeJS.ErrnoException)?.code === "ENOENT") {
            return;
          }
          throw error;
        }
      }
    };

    try {
      await ensureUniquePath();

      const absoluteTarget = path.join(mediaRoot, finalRelativePath);

      if (!absoluteTarget.startsWith(mediaRoot)) {
        reply.code(400);
        return {
          status: "error",
          message: "Chemin de dossier en dehors du dossier média.",
        };
      }

      try {
        await fs.mkdir(absoluteTarget, { recursive: false });
      } catch (mkdirError) {
        if ((mkdirError as NodeJS.ErrnoException)?.code === "EEXIST") {
          reply.code(409);
          return {
            status: "error",
            message: "Un dossier portant ce nom existe déjà.",
          };
        }
        throw mkdirError;
      }

      reply.code(201);
      return {
        status: "ok",
        name: finalName,
        relativePath: finalRelativePath,
      };
    } catch (error) {
      app.log.error({ err: error, parent: sanitizedParent, name: sanitizedName }, "Failed to create directory");
      reply.code(500);
      return {
        status: "error",
        message: "Impossible de créer le dossier demandé.",
      };
    }
  });

  app.post("/api/v1/media/type-definition", async (request, reply) => {
    const userId = extractUserId(request);

    if (!userId) {
      reply.code(401);
      return {
        status: "error",
        message: "Authentification requise.",
      };
    }

    if (userId !== env.HOME_SERVER_OWNER_ID) {
      reply.code(403);
      return {
        status: "error",
        message: "Action réservée au propriétaire du serveur.",
      };
    }

    const body = request.body as Partial<{
      id?: unknown;
      label?: unknown;
      icon?: unknown;
    }>;

    const label =
      typeof body?.label === "string" && body.label.trim().length > 0
        ? body.label.trim()
        : null;

    if (!label) {
      reply.code(400);
      return {
        status: "error",
        message: "Le libellé du type de média est requis.",
      };
    }

    const icon =
      typeof body?.icon === "string" && body.icon.trim().length > 0
        ? body.icon.trim()
        : undefined;

    const identifier =
      typeof body?.id === "string" && body.id.trim().length > 0
        ? body.id.trim()
        : undefined;

    try {
      const definition = await addMediaTypeDefinition({
        id: identifier,
        label,
        icon,
      });
      const definitions = await getMediaTypeDefinitions();

      reply.code(201).send({
        status: "ok",
        definition,
        definitions,
      });
    } catch (error) {
      if (error instanceof Error) {
        reply.code(400);
        return {
          status: "error",
          message: error.message,
        };
      }

      app.log.error({ err: error }, "Failed to create media type definition");
      reply.code(500);
      return {
        status: "error",
        message: "Impossible de créer le type de média.",
      };
    }
  });

  app.delete("/api/v1/media/type-definition/:id", async (request, reply) => {
    const userId = extractUserId(request);

    if (!userId) {
      reply.code(401);
      return {
        status: "error",
        message: "Authentification requise.",
      };
    }

    if (userId !== env.HOME_SERVER_OWNER_ID) {
      reply.code(403);
      return {
        status: "error",
        message: "Action réservée au propriétaire du serveur.",
      };
    }

    const rawId = request.params as { id?: string };
    const identifier = typeof rawId?.id === "string" ? rawId.id.trim() : "";

    if (!identifier) {
      reply.code(400);
      return {
        status: "error",
        message: "Identifiant de type de média manquant.",
      };
    }

    try {
      const definitions = await removeMediaTypeDefinition(identifier);
      reply.code(200).send({
        status: "ok",
        definitions,
      });
    } catch (error) {
      if (error instanceof Error) {
        const message = error.message.includes("système")
          ? error.message
          : "Impossible de supprimer ce type de média.";

        reply.code(error.message.includes("système") ? 400 : 404);
        return {
          status: "error",
          message,
        };
      }

      app.log.error({ err: error, identifier }, "Failed to delete media type definition");
      reply.code(500);
      return {
        status: "error",
        message: "Erreur inattendue lors de la suppression du type de média.",
      };
    }
  });

  app.post("/api/v1/media/type", async (request, reply) => {
    const userId = extractUserId(request);

    if (!userId) {
      reply.code(401);
      return {
        status: "error",
        message: "Authentification requise.",
      };
    }

    const body = request.body as Partial<{
      path: unknown;
      mediaType: unknown;
      applyToChildren?: unknown;
    }>;

    const rawPath =
      typeof body?.path === "string" && body.path.trim().length > 0
        ? body.path
        : "";
    const sanitizedPath =
      rawPath.length > 0 ? sanitizeRelativePath(rawPath) : "";

    if (sanitizedPath === null) {
      reply.code(400);
      return {
        status: "error",
        message: "Chemin invalide.",
      };
    }

    const rawMediaType =
      typeof body?.mediaType === "string" ? body.mediaType.trim() : undefined;
    const definitions = await getMediaTypeDefinitions();
    const validTypeIds = new Set(definitions.map((definition) => definition.id));

    let mediaType: HomeLibraryMediaType | null;
    if (rawMediaType === undefined || rawMediaType === null || rawMediaType === "") {
      mediaType = null;
    } else if (validTypeIds.has(rawMediaType)) {
      mediaType = rawMediaType;
    } else {
      reply.code(400);
      return {
        status: "error",
        message: "Type de média non autorisé.",
      };
    }

    const applyToChildrenRaw =
      typeof body?.applyToChildren === "boolean" ? body.applyToChildren : undefined;

    const mediaRoot = path.resolve(env.HOME_SERVER_MEDIA_ROOT);
    const targetRelative = sanitizedPath ?? "";
    const targetAbsolute =
      targetRelative.length > 0 ? path.join(mediaRoot, targetRelative) : mediaRoot;

    const manageableRoots = await collectManageableRoots(userId);
    if (targetRelative.length === 0 && userId !== ownerId) {
      reply.code(403);
      return {
        status: "error",
        message: "Impossible de modifier le type du dossier racine.",
      };
    }

    if (targetRelative.length > 0 && !isPathWithinManageableRoots(targetRelative, manageableRoots)) {
      reply.code(403);
      return {
        status: "error",
        message: "Chemin de média non autorisé pour ce compte.",
      };
    }

    if (!targetAbsolute.startsWith(mediaRoot)) {
      reply.code(400);
      return {
        status: "error",
        message: "Chemin en dehors du dossier média.",
      };
    }

    try {
      const stats = await fs.stat(targetAbsolute);

      if (!stats.isDirectory() && applyToChildrenRaw === true) {
        reply.code(400);
        return {
          status: "error",
          message: "Le mode récursif est uniquement disponible pour les dossiers.",
        };
      }

      const applyToChildren =
        stats.isDirectory() ? applyToChildrenRaw ?? true : false;

      const updates: Array<{ relativePath: string; mediaType: string | null }> = [];

      const schedule = (relativePath: string, value: string | null) => {
        if (relativePath.length === 0) {
          return;
        }
        updates.push({ relativePath, mediaType: value });
      };

      if (stats.isDirectory() && applyToChildren) {
        const traverse = async (absoluteDir: string, relativeDir: string) => {
          const dirents = await fs.readdir(absoluteDir, { withFileTypes: true });

          for (const dirent of dirents) {
            if (dirent.name.startsWith(".") || IGNORED_NAMES.has(dirent.name)) {
              continue;
            }

            const nextRelative = relativeDir
              ? `${relativeDir}/${dirent.name}`
              : dirent.name;
            const normalized = sanitizeRelativePath(nextRelative);
            if (!normalized) {
              continue;
            }

            if (!isPathWithinManageableRoots(normalized, manageableRoots)) {
              continue;
            }

            const nextAbsolute = path.join(absoluteDir, dirent.name);
            schedule(normalized, mediaType);

            if (dirent.isDirectory()) {
              await traverse(nextAbsolute, normalized);
            }
          }
        };

        if (targetRelative.length > 0) {
          schedule(targetRelative, mediaType);
          await traverse(targetAbsolute, targetRelative);
        } else {
          await traverse(targetAbsolute, "");
        }
      } else {
        if (targetRelative.length === 0) {
          reply.code(400);
          return {
            status: "error",
            message: "Impossible de modifier le type du dossier racine.",
          };
        }

        schedule(targetRelative, mediaType);
      }

      for (const entry of updates) {
        await setMediaTypeForPath(entry.relativePath, entry.mediaType);
      }

      reply.code(200);
      return {
        status: "ok",
        updated: updates.length,
      };
    } catch (error) {
      app.log.error(
        { err: error, path: sanitizedPath ?? "", mediaType },
        "Failed to set media type"
      );
      reply.code(500);
      return {
        status: "error",
        message: "Impossible de définir le type de média.",
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
        savedFiles: [] as UploadSummary[],
        errors: [] as UploadError[],
      };
    }

    const mediaRoot = path.resolve(env.HOME_SERVER_MEDIA_ROOT);
    await fs.mkdir(mediaRoot, { recursive: true });

    const manageableRoots = await collectManageableRoots(userId);
    if (!manageableRoots.length) {
      reply.code(403);
      return {
        status: "error",
        message: "Espace personnel indisponible pour cet utilisateur.",
        savedFiles: [] as UploadSummary[],
        errors: [] as UploadError[],
      };
    }

    const savedFiles: UploadSummary[] = [];
    const errors: UploadError[] = [];
    let processedFiles = 0;

    const parts = request.parts();

    for await (const part of parts) {
      if (part.type !== "file") {
        continue;
      }

      const filePart = part as MultipartFile;

      processedFiles += 1;

      const sanitizedPath = sanitizeRelativePath(
        filePart.filename ?? filePart.fieldname ?? undefined
      );

      if (!sanitizedPath) {
        errors.push({
          relativePath: filePart.filename ?? "(inconnu)",
          reason: "Chemin invalide ou non autorisé.",
        });
        await discardStream(filePart.file);
        continue;
      }

      const normalizedRelative = normalizeRelativePathForUser(sanitizedPath, manageableRoots);

      if (!normalizedRelative || !isPathWithinManageableRoots(normalizedRelative, manageableRoots)) {
        errors.push({
          relativePath: sanitizedPath,
          reason: "Chemin de destination non autorisé.",
        });
        await discardStream(filePart.file);
        continue;
      }

      const absoluteTarget = path.join(mediaRoot, normalizedRelative);

      if (!absoluteTarget.startsWith(mediaRoot)) {
        errors.push({
          relativePath: sanitizedPath,
          reason: "Chemin en dehors du dossier média.",
        });
        await discardStream(filePart.file);
        continue;
      }

      try {
        await fs.mkdir(path.dirname(absoluteTarget), { recursive: true });
        const writeStream = createWriteStream(absoluteTarget);
        await pipeline(filePart.file, writeStream);
        const stats = await fs.stat(absoluteTarget);
        savedFiles.push({
          relativePath: normalizedRelative,
          size: stats.size,
        });
      } catch (error) {
        request.log.error(
          {
            err: error,
            relativePath: normalizedRelative,
          },
          "Failed to persist uploaded media file"
        );
        errors.push({
          relativePath: normalizedRelative,
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

    const mediaRoot = path.resolve(env.HOME_SERVER_MEDIA_ROOT);
    await fs.mkdir(mediaRoot, { recursive: true });

    const manageableRoots = await collectManageableRoots(userId);
    if (!manageableRoots.length) {
      reply.code(403);
      return {
        status: "error",
        message: "Espace personnel indisponible pour cet utilisateur.",
      };
    }

    const body = request.body as Partial<{
      filename: unknown;
      relativePath: unknown;
      totalSize: unknown;
      chunkSize: unknown;
      totalChunks: unknown;
    }>;

    const filename = typeof body?.filename === "string" ? body.filename : undefined;
    const explicitRelativePath =
      typeof body?.relativePath === "string" ? body.relativePath : undefined;

    const parseNumeric = (value: unknown): number | undefined => {
      if (typeof value === "number") {
        return Number.isFinite(value) ? value : undefined;
      }
      if (typeof value === "string" && value.trim().length > 0) {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : undefined;
      }
      return undefined;
    };

    const totalSize = parseNumeric(body?.totalSize);
    const chunkSize = parseNumeric(body?.chunkSize);

    const totalChunksRaw = parseNumeric(body?.totalChunks);
    const totalChunks =
      typeof totalChunksRaw === "number" && totalChunksRaw > 0
        ? Math.trunc(totalChunksRaw)
        : undefined;

    if (!filename || !totalSize || !chunkSize) {
      reply.code(400);
      return {
        status: "error",
        message: "Données d'initialisation d'upload invalides.",
      };
    }

    const desiredPath =
      sanitizeRelativePath(explicitRelativePath ?? filename) ?? sanitizeRelativePath(filename);

    const finalRelativePath =
      desiredPath !== null && desiredPath !== undefined
        ? normalizeRelativePathForUser(desiredPath, manageableRoots)
        : null;

    if (!finalRelativePath) {
      reply.code(400);
      return {
        status: "error",
        message: "Chemin de destination invalide.",
      };
    }

    if (!isPathWithinManageableRoots(finalRelativePath, manageableRoots)) {
      reply.code(403);
      return {
        status: "error",
        message: "Chemin de destination non autorisé pour ce compte.",
      };
    }

    const computedTotalChunks =
      totalChunks && totalChunks > 0
        ? totalChunks
        : Math.max(1, Math.ceil(totalSize / chunkSize));

    const absolutePath = path.join(mediaRoot, finalRelativePath);

    if (!absolutePath.startsWith(mediaRoot)) {
      reply.code(400);
      return {
        status: "error",
        message: "Chemin en dehors du dossier média.",
      };
    }

    try {
      const session = await createUploadSession({
        originalName: filename,
        relativePath: finalRelativePath,
        absolutePath,
        totalSize,
        chunkSize,
        userId,
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
    } catch (error) {
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

    const query = request.query as { sessionId?: string; chunkIndex?: string };
    const sessionId = query.sessionId;
    const chunkIndex =
      query.chunkIndex !== undefined ? Number.parseInt(query.chunkIndex, 10) : NaN;

    if (!sessionId || Number.isNaN(chunkIndex)) {
      reply.code(400);
      return {
        status: "error",
        message: "Paramètres de fragment invalides.",
      };
    }

    try {
      const session = getUploadSession(sessionId);
      if (session.userId !== userId && userId !== ownerId) {
        reply.code(403);
        return {
          status: "error",
          message: "Session d'upload non accessible.",
        };
      }

      const file = await request.file();

      if (!file) {
        reply.code(400);
        return {
          status: "error",
          message: "Aucun fragment reçu.",
        };
      }

      const buffer = await file.toBuffer();
      const progress = await recordChunkForSession(sessionId, chunkIndex, buffer);

      return {
        status: "ok",
        ...progress,
      };
    } catch (error) {
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

    const body = request.body as Partial<{ sessionId: unknown }>;
    const sessionId = typeof body?.sessionId === "string" ? body.sessionId : undefined;

    if (!sessionId) {
      reply.code(400);
      return {
        status: "error",
        message: "Session invalide.",
      };
    }

    try {
      const existingSession = getUploadSession(sessionId);
      if (existingSession.userId !== userId && userId !== ownerId) {
        reply.code(403);
        return {
          status: "error",
          message: "Session d'upload non accessible.",
        };
      }

      const session = await finalizeUploadSession(sessionId);
      return {
        status: "ok",
        relativePath: session.relativePath,
      };
    } catch (error) {
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

    const { sessionId } = request.params as { sessionId?: string };
    if (!sessionId) {
      reply.code(400);
      return {
        status: "error",
        message: "Session invalide.",
      };
    }

    try {
      const session = getUploadSession(sessionId);
      if (session.userId !== userId && userId !== ownerId) {
        reply.code(403);
        return {
          status: "error",
          message: "Session d'upload non accessible.",
        };
      }

      await abortUploadSession(sessionId);
      return {
        status: "ok",
        aborted: sessionId,
      };
    } catch (error) {
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


