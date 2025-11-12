"use client";
/* eslint-disable @next/next/no-img-element, react-hooks/set-state-in-effect */

import {
  Fragment,
  FormEvent,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Folder,
  Film,
  HardDrive,
  Loader2,
  RefreshCcw,
  Trash2,
  PencilLine,
  Share2,
  FolderPlus,
  Tag,
  PlusCircle,
  Search,
} from "lucide-react";
import { Icon as IconifyIcon } from "@iconify/react";
import { toast } from "react-toastify";
import { cn } from "@/lib/utils";
import { useHomeServerHealth } from "@/hooks/useHomeServerHealth";
import { useHomeMediaLibrary } from "@/hooks/useHomeMediaLibrary";
import {
  HomeLibraryMediaType,
  HomeMediaNode,
  HomeMediaTypeDefinition,
} from "@/types/home";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  createHomeDirectory,
  deleteHomeMedia,
  moveHomeMedia,
  setHomeMediaType,
  createHomeMediaTypeDefinition,
  deleteHomeMediaTypeDefinition,
  buildHomeMediaContentUrl,
  type CreateHomeMediaTypeDefinitionInput,
} from "@/lib/api/home";
import { confirmToast } from "@/components/shared/confirmToast";
import { useFriendsOverview } from "@/hooks/useFriends";
import {
  useLocalMediaShares,
  useShareLocalMedia,
} from "@/hooks/useLocalMediaShares";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface MediaSummary {
  files: number;
  videos: number;
  size: number;
}

const summaryCache = new WeakMap<HomeMediaNode, MediaSummary>();

interface HomeMediaExplorerProps {
  userId: string;
  isOwner: boolean;
  ownerDisplayName: string;
  ownerId: string | null;
  currentUserLabel: string;
}

const mediaTypeMetadata: Record<
  HomeLibraryMediaType,
  { label: string; icon: string }
> = {
  movie: {
    label: "Film",
    icon: "noto:clapper-board",
  },
  tv: {
    label: "Série",
    icon: "noto:television",
  },
  documentary: {
    label: "Documentaire",
    icon: "noto:bookmark-tabs",
  },
  short: {
    label: "Court-métrage",
    icon: "noto:movie-camera",
  },
  clip: {
    label: "Clip",
    icon: "noto:studio-microphone",
  },
  music: {
    label: "Musique",
    icon: "noto:musical-notes",
  },
  other: {
    label: "Autre",
    icon: "noto:open-file-folder",
  },
};

const DEFAULT_MEDIA_ICON = "noto:open-file-folder";

const PRESET_ICON_OPTIONS: Array<{ label: string; icon: string }> = [
  { label: "🎬 Clap de film", icon: "noto:clapper-board" },
  { label: "📺 Télévision", icon: "noto:television" },
  { label: "🎵 Notes musicales", icon: "noto:musical-notes" },
  { label: "🎙️ Micro studio", icon: "noto:studio-microphone" },
  { label: "🎧 Casque audio", icon: "noto:headphone" },
  { label: "📁 Dossier", icon: "noto:open-file-folder" },
  { label: "📚 Collection", icon: "noto:books" },
  { label: "🧩 Divers", icon: "noto:puzzle-piece" },
];

const isIconifyIcon = (icon?: string): boolean =>
  Boolean(icon && !icon.startsWith("/") && !icon.startsWith("http"));

const DEFAULT_MEDIA_TYPE_IDS = new Set(["movie", "tv"]);

const MediaIcon = ({
  icon,
  className,
}: {
  icon?: string | null;
  className?: string;
}) => {
  if (!icon) {
    return null;
  }

  if (isIconifyIcon(icon)) {
    return <IconifyIcon icon={icon} className={className} />;
  }

  return (
    <img
      src={icon}
      alt=""
      aria-hidden="true"
      className={cn("object-contain", className)}
    />
  );
};

const slugify = (input: string): string =>
  input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");

function summarizeMedia(node: HomeMediaNode): MediaSummary {
  const cached = summaryCache.get(node);
  if (cached) {
    return cached;
  }

  if (node.kind === "file") {
    const summary: MediaSummary = {
      files: 1,
      videos: node.mediaType === "video" ? 1 : 0,
      size: node.size ?? 0,
    };
    summaryCache.set(node, summary);
    return summary;
  }

  const base: MediaSummary = { files: 0, videos: 0, size: 0 };
  const result = (node.children ?? []).reduce<MediaSummary>(
    (accumulator, child) => {
      const summary = summarizeMedia(child);
      accumulator.files += summary.files;
      accumulator.videos += summary.videos;
      accumulator.size += summary.size;
      return accumulator;
    },
    base
  );

  summaryCache.set(node, result);
  return result;
}

const formatBytes = (value: number): string => {
  if (!Number.isFinite(value)) {
    return "—";
  }

  if (value === 0) {
    return "0 o";
  }

  const units = ["o", "Ko", "Mo", "Go", "To"];
  const index = Math.min(
    Math.floor(Math.log(value) / Math.log(1024)),
    units.length - 1
  );
  const sized = value / Math.pow(1024, index);
  return `${sized.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
};

interface ResolvedMediaType {
  type: HomeLibraryMediaType;
  label: string;
  icon: string;
  source: "custom" | "inherited";
}

function MediaNodeRow({
  node,
  depth = 0,
  onDelete,
  onRename,
  onShare,
  onDrop,
  onDragChange,
  deletingPath,
  movingPath,
  currentDrag,
  shareTargetPath,
  canManage,
  canShare,
  canDrag,
  onEditType,
  resolveMediaType,
  resolveOwnerLabel,
  isPersonalRoot = false,
  onPreview,
}: {
  node: HomeMediaNode;
  depth?: number;
  onDelete: (media: HomeMediaNode) => void | Promise<void>;
  onRename: (media: HomeMediaNode) => void;
  onShare: (media: HomeMediaNode) => void;
  onDrop: (source: HomeMediaNode, target: HomeMediaNode) => void;
  onDragChange: (media: HomeMediaNode | null) => void;
  deletingPath: string | null;
  movingPath: string | null;
  currentDrag: HomeMediaNode | null;
  shareTargetPath: string | null;
  canManage: boolean;
  canShare: boolean;
  canDrag: boolean;
  onEditType: (media: HomeMediaNode) => void;
  resolveMediaType: (media: HomeMediaNode) => ResolvedMediaType | null;
  resolveOwnerLabel: (media: HomeMediaNode) => string;
  isPersonalRoot?: boolean;
  onPreview: (media: HomeMediaNode) => void;
}) {
  const canDelete = canManage && Boolean(node.relativePath);
  const isDeleting = deletingPath === node.relativePath;
  const isMoving = movingPath === node.relativePath;
  const isShareTarget = canShare && shareTargetPath === node.relativePath;
  const resolvedMediaType = resolveMediaType(node);
  const ownerLabel = resolveOwnerLabel(node);

  if (node.kind === "directory") {
    const resolvedType = resolveMediaType(node);
    const summary = summarizeMedia(node);
    const palette =
      depth === 0
        ? isPersonalRoot
          ? { border: "var(--primary)", bg: "rgba(var(--primary), 0.14)" }
          : { border: "var(--secondary)", bg: "rgba(var(--secondary), 0.1)" }
        : depth === 1
        ? { border: "var(--secondary)", bg: "rgba(var(--secondary), 0.08)" }
        : { border: "var(--muted-foreground)", bg: "rgba(var(--muted-foreground), 0.08)" };

    return (
      <div className="space-y-2">
        <div
          className={cn(
            "flex items-center justify-between rounded-md border-l-4 px-3 py-2 transition-colors",
            isShareTarget && "ring-2 ring-primary/40",
            isPersonalRoot && "ring-1 ring-primary/30"
          )}
          style={{
            marginLeft: depth * 24,
            borderColor: `rgb(${palette.border})`,
            backgroundColor: palette.bg,
          }}
          draggable={canDelete && canDrag}
          onDragStart={(event) => {
            if (!canDelete || !canDrag) {
              return;
            }
            event.dataTransfer.setData(
              "application/json",
              JSON.stringify({ relativePath: node.relativePath, type: node.kind })
            );
            onDragChange(node);
          }}
          onDragEnd={() => onDragChange(null)}
          onDragOver={(event) => {
            if (
              canDrag &&
              currentDrag &&
              currentDrag.relativePath !== node.relativePath
            ) {
              event.preventDefault();
            }
          }}
          onDrop={(event) => {
            event.preventDefault();
            if (
              !canDrag ||
              !currentDrag ||
              currentDrag.relativePath === node.relativePath
            ) {
              return;
            }
            onDrop(currentDrag, node);
            onDragChange(null);
          }}
        >
          <div className="flex items-center gap-2">
            <Folder
              className="h-4 w-4"
              aria-hidden="true"
              style={{
                color:
                  depth === 0
                    ? isPersonalRoot
                      ? `rgb(var(--primary))`
                      : `rgb(var(--secondary))`
                    : depth === 1
                    ? `rgb(var(--secondary))`
                    : `rgb(var(--muted-foreground))`,
              }}
            />
            <span className="font-medium">{node.name}</span>
            {isPersonalRoot ? (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                Votre espace
              </span>
            ) : null}
            {resolvedType ? (
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
                  resolvedType.source === "custom"
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground"
                )}
                title={
                  resolvedType.source === "custom"
                    ? "Type défini pour ce dossier"
                    : "Type hérité du parent"
                }
              >
                <MediaIcon icon={resolvedType.icon} className="h-3 w-3" />
                {resolvedType.label}
                <span className="sr-only">
                  {resolvedType.source === "custom" ? "Type défini" : "Type hérité"}
                </span>
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>
                {summary.files} fichier{summary.files > 1 ? "s" : ""}
              </span>
              <span>
                {summary.videos} vidéo{summary.videos > 1 ? "s" : ""}
              </span>
              <span>{formatBytes(summary.size)}</span>
              <span className="rounded-full bg-muted px-2 py-0.5">
                Propriétaire : {ownerLabel}
              </span>
            </div>
            <div className="flex items-center gap-1">
              {canManage && node.relativePath ? (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Définir le type de média"
                  onClick={() => onEditType(node)}
                  disabled={isMoving || isDeleting}
                >
                  <Tag className="h-4 w-4" aria-hidden="true" />
                </Button>
              ) : null}
              {canDelete ? (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Renommer ou déplacer"
                  onClick={() => onRename(node)}
                  disabled={isMoving || isDeleting}
                >
                  {isMoving ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <PencilLine className="h-4 w-4" aria-hidden="true" />
                  )}
                </Button>
              ) : null}
                {canShare && canDelete ? (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Partager"
                  onClick={() => onShare(node)}
                  disabled={isMoving || isDeleting}
                >
                  <Share2 className="h-4 w-4" aria-hidden="true" />
                </Button>
              ) : null}
                {canDelete ? (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Supprimer"
                  onClick={() => void onDelete(node)}
                  disabled={isDeleting || isMoving}
                >
                  {isDeleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  )}
                </Button>
              ) : null}
            </div>
          </div>
        </div>
        {(node.children ?? []).map((child) => (
          <MediaNodeRow
            key={`${child.kind}-${child.id}`}
            node={child}
            depth={depth + 1}
            onDelete={onDelete}
            onRename={onRename}
            onShare={onShare}
            onDrop={onDrop}
            onDragChange={onDragChange}
            deletingPath={deletingPath}
            movingPath={movingPath}
            currentDrag={currentDrag}
            shareTargetPath={shareTargetPath}
            canManage={canManage}
            canShare={canShare}
            canDrag={canDrag}
            onEditType={onEditType}
            resolveMediaType={resolveMediaType}
            resolveOwnerLabel={resolveOwnerLabel}
            isPersonalRoot={isPersonalRoot}
            onPreview={onPreview}
          />
        ))}
      </div>
    );
  }

  const Icon = node.mediaType === "video" ? Film : HardDrive;
  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-md border px-3 py-2 transition-colors",
        isShareTarget && "ring-2 ring-primary/40"
      )}
      style={{
        marginLeft: depth * 24,
        borderColor:
          depth === 0
            ? "rgba(var(--primary), 0.4)"
            : depth === 1
            ? "rgba(var(--secondary), 0.4)"
            : "rgba(var(--muted-foreground), 0.2)",
        backgroundColor:
          depth === 0
            ? "rgba(var(--primary), 0.05)"
            : depth === 1
            ? "rgba(var(--secondary), 0.05)"
            : "rgba(var(--muted-foreground), 0.04)",
      }}
      draggable={canDelete && canDrag}
      onDragStart={(event) => {
        if (!canDelete || !canDrag) {
          return;
        }
        event.dataTransfer.setData(
          "application/json",
          JSON.stringify({ relativePath: node.relativePath, type: node.kind })
        );
        onDragChange(node);
      }}
      onDragEnd={() => onDragChange(null)}
      onDragOver={(event) => {
        if (
          canDrag &&
          currentDrag &&
          currentDrag.relativePath !== node.relativePath
        ) {
          event.preventDefault();
        }
      }}
      onDrop={(event) => {
        event.preventDefault();
        if (
          !canDrag ||
          !currentDrag ||
          currentDrag.relativePath === node.relativePath
        ) {
          return;
        }
        onDrop(currentDrag, node);
        onDragChange(null);
      }}
    >
      <div className="flex min-w-0 items-center gap-2">
        {resolvedMediaType ? (
          <MediaIcon
            icon={resolvedMediaType.icon}
            className="h-5 w-5 text-primary"
          />
        ) : (
          <Icon
            className="h-4 w-4"
            aria-hidden="true"
            style={{
              color:
                node.mediaType === "video"
                  ? "rgb(var(--primary))"
                  : "rgb(var(--muted-foreground))",
            }}
          />
        )}
        <button
          type="button"
          onClick={() => onPreview(node)}
          className="truncate rounded-sm border-0 bg-transparent p-0 text-left text-sm font-medium text-primary underline-offset-2 transition hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          title={`Ouvrir ${node.name}`}
        >
          {node.name}
        </button>
      </div>
      <div className="ml-4 flex shrink-0 items-center gap-2">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {resolvedMediaType ? (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
                resolvedMediaType.source === "custom"
                  ? "bg-primary/10 text-primary"
                  : "bg-muted text-muted-foreground"
              )}
              title={
                resolvedMediaType.source === "custom"
                  ? "Type défini pour ce fichier"
                  : "Type hérité du dossier parent"
              }
            >
              <MediaIcon icon={resolvedMediaType.icon} className="h-3 w-3" />
              {resolvedMediaType.label}
            </span>
          ) : (
            <span className="uppercase">{node.mediaType ?? "autre"}</span>
          )}
          {node.size ? <span>{formatBytes(node.size)}</span> : null}
          {node.modifiedAt ? (
            <time dateTime={node.modifiedAt}>
              {new Date(node.modifiedAt).toLocaleDateString()}
            </time>
          ) : null}
          <span className="rounded-full bg-muted px-2 py-0.5">
            Propriétaire : {ownerLabel}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {canManage && node.relativePath ? (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Définir le type de média"
              onClick={() => onEditType(node)}
              disabled={isMoving || isDeleting}
            >
              <Tag className="h-4 w-4" aria-hidden="true" />
            </Button>
          ) : null}
          {canDelete ? (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Renommer ou déplacer"
              onClick={() => onRename(node)}
              disabled={isMoving || isDeleting}
            >
              {isMoving ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <PencilLine className="h-4 w-4" aria-hidden="true" />
              )}
            </Button>
          ) : null}
          {canShare && canDelete ? (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Partager"
              onClick={() => onShare(node)}
              disabled={isMoving || isDeleting}
            >
              <Share2 className="h-4 w-4" aria-hidden="true" />
            </Button>
          ) : null}
          {canDelete ? (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Supprimer"
              onClick={() => void onDelete(node)}
              disabled={isDeleting || isMoving}
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              )}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

type PreviewMode = "image" | "video" | "audio" | "pdf" | "text" | "unsupported";

const IMAGE_PREVIEW_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".bmp",
  ".svg",
]);

const VIDEO_PREVIEW_EXTENSIONS = new Set([".mp4", ".webm", ".mkv", ".mov", ".avi", ".m4v"]);

const AUDIO_PREVIEW_EXTENSIONS = new Set([".mp3", ".wav", ".flac", ".ogg", ".m4a", ".aac"]);

const TEXT_PREVIEW_EXTENSIONS = new Set([
  ".txt",
  ".md",
  ".srt",
  ".vtt",
  ".json",
  ".csv",
  ".log",
  ".yaml",
  ".yml",
  ".xml",
  ".ini",
  ".env",
]);

const PDF_PREVIEW_EXTENSIONS = new Set([".pdf"]);

const resolvePreviewMode = (media: HomeMediaNode): PreviewMode => {
  if (media.mediaType === "image") {
    return "image";
  }
  if (media.mediaType === "video") {
    return "video";
  }
  if (media.mediaType === "audio") {
    return "audio";
  }
  if (media.mediaType === "subtitle") {
    return "text";
  }

  const extension = media.extension?.toLowerCase() ?? "";
  if (PDF_PREVIEW_EXTENSIONS.has(extension)) {
    return "pdf";
  }
  if (IMAGE_PREVIEW_EXTENSIONS.has(extension)) {
    return "image";
  }
  if (VIDEO_PREVIEW_EXTENSIONS.has(extension)) {
    return "video";
  }
  if (AUDIO_PREVIEW_EXTENSIONS.has(extension)) {
    return "audio";
  }
  if (TEXT_PREVIEW_EXTENSIONS.has(extension)) {
    return "text";
  }

  return "unsupported";
};

const MAX_TEXT_PREVIEW_BYTES = 1_000_000; // ~1 Mo

interface HomeMediaPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  media: HomeMediaNode | null;
  contentUrl: string | null;
}

function HomeMediaPreviewDialog({
  open,
  onOpenChange,
  media,
  contentUrl,
}: HomeMediaPreviewDialogProps) {
  const mode = useMemo<PreviewMode | null>(() => (media ? resolvePreviewMode(media) : null), [media]);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [isTextLoading, setIsTextLoading] = useState(false);
  const [textError, setTextError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !media || mode !== "text" || !contentUrl) {
      setTextContent(null);
      setTextError(null);
      setIsTextLoading(false);
      return;
    }

    if (typeof media.size === "number" && media.size > MAX_TEXT_PREVIEW_BYTES) {
      setTextContent(null);
      setTextError("Fichier trop volumineux pour un aperçu rapide.");
      setIsTextLoading(false);
      return;
    }

    const controller = new AbortController();

    setIsTextLoading(true);
    setTextError(null);

    fetch(contentUrl, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Statut ${response.status}`);
        }
        return response.text();
      })
      .then((payload) => {
        setTextContent(payload);
      })
      .catch((error) => {
        if (controller.signal.aborted) {
          return;
        }
        setTextError("Impossible de charger le contenu du fichier.");
        setTextContent(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsTextLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [open, media, mode, contentUrl]);

  const description = useMemo(() => {
    if (!media) {
      return "Sélectionnez un fichier pour afficher un aperçu.";
    }

    const parts: string[] = [];
    if (media.extension) {
      parts.push(media.extension);
    }
    if (typeof media.size === "number") {
      parts.push(formatBytes(media.size));
    }
    if (media.modifiedAt) {
      parts.push(`Modifié le ${new Date(media.modifiedAt).toLocaleString()}`);
    }

    return parts.join(" • ") || "Aucun détail disponible";
  }, [media]);

  let body: ReactNode;

  if (!media || !contentUrl) {
    body = (
      <p className="text-sm text-muted-foreground">
        Sélectionnez un fichier dans la bibliothèque pour afficher un aperçu.
      </p>
    );
  } else if (mode === "image") {
    body = (
      <div className="flex max-h-[65vh] w-full items-center justify-center overflow-hidden rounded-md border bg-background">
        <img
          src={contentUrl}
          alt={media.name}
          className="max-h-[65vh] w-full object-contain"
          loading="lazy"
        />
      </div>
    );
  } else if (mode === "video") {
    body = (
      <video
        key={contentUrl}
        controls
        className="h-[65vh] w-full rounded-md bg-black"
        preload="metadata"
      >
        <source src={contentUrl} />
        Votre navigateur ne supporte pas la lecture vidéo.
      </video>
    );
  } else if (mode === "audio") {
    body = (
      <audio key={contentUrl} controls className="w-full rounded-md border bg-background/60 p-3">
        <source src={contentUrl} />
        Votre navigateur ne supporte pas la lecture audio.
      </audio>
    );
  } else if (mode === "pdf") {
    body = (
      <iframe
        key={contentUrl}
        src={contentUrl}
        title={`Aperçu ${media.name}`}
        className="h-[65vh] w-full rounded-md border bg-background"
      />
    );
  } else if (mode === "text") {
    if (isTextLoading) {
      body = (
        <div className="flex h-[48vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
        </div>
      );
    } else if (textError) {
      body = (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {textError}
        </div>
      );
    } else if (textContent !== null) {
      body = (
        <pre className="max-h-[48vh] overflow-auto rounded-md border bg-muted/20 p-4 text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
          {textContent}
        </pre>
      );
    } else {
      body = (
        <p className="text-sm text-muted-foreground">
          Aucun contenu à afficher pour ce fichier texte.
        </p>
      );
    }
  } else {
    body = (
      <div className="space-y-2 text-sm text-muted-foreground">
        <p>Aucun aperçu n&rsquo;est disponible pour ce type de fichier.</p>
        <p>
          Vous pouvez cependant{" "}
          <a
            href={contentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary underline underline-offset-2"
          >
            l&rsquo;ouvrir dans un nouvel onglet
          </a>{" "}
          pour le consulter.
        </p>
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-4xl space-y-4 md:w-[80vw] lg:w-[70vw]">
        <DialogHeader>
          <DialogTitle>{media?.name ?? "Aucun fichier sélectionné"}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="min-h-[220px]">{body}</div>
        {contentUrl ? (
          <DialogFooter className="flex flex-col items-stretch gap-2 border-t border-border/60 pt-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-xs text-muted-foreground">
              L&rsquo;aperçu est généré depuis votre StreamNow Home Server.
            </span>
            <Button asChild variant="outline" size="sm">
              <a href={contentUrl} target="_blank" rel="noopener noreferrer">
                Ouvrir dans un nouvel onglet
              </a>
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

export function HomeMediaExplorer({
  userId,
  isOwner,
  ownerDisplayName,
  ownerId,
  currentUserLabel,
}: HomeMediaExplorerProps) {
  const healthQuery = useHomeServerHealth();
  const isHomeConfigured = healthQuery.enabled;
  const isHomeReachable =
    isHomeConfigured && !healthQuery.isError && Boolean(healthQuery.data);

  const mediaQuery = useHomeMediaLibrary(userId, isHomeReachable);
  const queryClient = useQueryClient();
  const availableMediaTypes = mediaQuery.data?.availableMediaTypes ?? [];
  const definitionMap = useMemo(() => {
    const map = new Map<HomeLibraryMediaType, { label: string; icon?: string }>();
    for (const definition of availableMediaTypes) {
      const fallback = mediaTypeMetadata[definition.id];
      map.set(definition.id, {
        label: definition.label ?? fallback?.label ?? definition.id,
        icon: definition.icon ?? fallback?.icon,
      });
    }
    return map;
  }, [availableMediaTypes]);
  const customMediaTypeDefinitions = useMemo(
    () => availableMediaTypes.filter((definition) => !DEFAULT_MEDIA_TYPE_IDS.has(definition.id)),
    [availableMediaTypes]
  );

  const manageableRoots = useMemo(
    () => mediaQuery.data?.manageableRoots ?? (isOwner ? [""] : []),
    [isOwner, mediaQuery.data?.manageableRoots]
  );

  const personalRootPath = mediaQuery.data?.personalRootPath ?? (isOwner ? "" : "");

  const canManagePath = useCallback(
    (relativePath?: string | null) => {
      if (isOwner) {
        return true;
      }
      if (!relativePath) {
        return false;
      }

      return manageableRoots.some((root) => {
        if (!root) {
          return true;
        }
        return relativePath === root || relativePath.startsWith(`${root}/`);
      });
    },
    [isOwner, manageableRoots]
  );

  const normalizeDestinationPath = useCallback(
    (value: string) => {
      const trimmed = value.trim().replace(/^[\\/]+/, "").replace(/\\/g, "/");
      if (!trimmed) {
        return "";
      }

      if (isOwner || !personalRootPath) {
        return trimmed;
      }

      if (
        trimmed === personalRootPath ||
        trimmed.startsWith(`${personalRootPath}/`)
      ) {
        return trimmed;
      }

      return `${personalRootPath}/${trimmed}`.replace(/\/{2,}/g, "/");
    },
    [isOwner, personalRootPath]
  );

  const canCreateDirectories = manageableRoots.length > 0;

  const [pendingDeletePath, setPendingDeletePath] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [moveError, setMoveError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [draggedNode, setDraggedNode] = useState<HomeMediaNode | null>(null);
  const [shareTarget, setShareTarget] = useState<HomeMediaNode | null>(null);
  const [isCreateDirectoryDialogOpen, setIsCreateDirectoryDialogOpen] = useState(false);
  const [newDirectoryName, setNewDirectoryName] = useState("");
  const [renameDialogNode, setRenameDialogNode] = useState<HomeMediaNode | null>(null);
  const [renamePath, setRenamePath] = useState("");
  const [renameError, setRenameError] = useState<string | null>(null);
  const [deleteTypeError, setDeleteTypeError] = useState<string | null>(null);
  const [typeDialogNode, setTypeDialogNode] = useState<HomeMediaNode | null>(null);
  const [selectedMediaType, setSelectedMediaType] = useState<HomeLibraryMediaType | "">("");
  const [applyTypeToChildren, setApplyTypeToChildren] = useState(true);
  const [typeErrorMessage, setTypeErrorMessage] = useState<string | null>(null);
  const [isCreateTypeDialogOpen, setIsCreateTypeDialogOpen] = useState(false);
  const [newTypeLabel, setNewTypeLabel] = useState("");
  const [newTypeId, setNewTypeId] = useState("");
  const [newTypeIcon, setNewTypeIcon] = useState("");
  const [createTypeError, setCreateTypeError] = useState<string | null>(null);
  const [isTypeIdEditedManually, setIsTypeIdEditedManually] = useState(false);
  const [iconSearchQuery, setIconSearchQuery] = useState("");
  const [iconSearchResults, setIconSearchResults] = useState<string[]>([]);
  const [isIconSearchLoading, setIsIconSearchLoading] = useState(false);
  const [iconSearchError, setIconSearchError] = useState<string | null>(null);
  const [previewTarget, setPreviewTarget] = useState<HomeMediaNode | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const friendsOverviewQuery = useFriendsOverview(true);
  const friendUsers = friendsOverviewQuery.data?.friends ?? [];

  const ownerLabelMap = useMemo(() => {
    const map = new Map<string, string>();

    const register = (id: string | null | undefined, ...labels: Array<string | null | undefined>) => {
      if (!id) {
        return;
      }
      for (const label of labels) {
        if (typeof label === "string") {
          const trimmed = label.trim();
          if (trimmed.length > 0) {
            map.set(id, trimmed);
            return;
          }
        }
      }
      map.set(id, id.slice(0, 8));
    };

    register(userId, currentUserLabel);
    if (ownerId && ownerId !== userId) {
      register(ownerId, ownerDisplayName);
    }

    for (const entry of friendUsers) {
      const friendUser = entry.friend;
      if (!friendUser) {
        continue;
      }
      register(friendUser.id, friendUser.nickname ?? undefined, friendUser.email ?? undefined);
    }

    return map;
  }, [friendUsers, currentUserLabel, ownerDisplayName, ownerId, userId]);

  const resolveOwnerIdForNode = useCallback(
    (media: HomeMediaNode): string => {
      const relativePath = media.relativePath ?? "";
      const segments = relativePath.split("/").filter(Boolean);

      if (segments.length >= 2 && segments[0] === "users") {
        return segments[1];
      }

      return ownerId ?? userId;
    },
    [ownerId, userId]
  );

  const resolveOwnerLabel = useCallback(
    (media: HomeMediaNode): string => {
      const ownerKey = resolveOwnerIdForNode(media);
      const mapped = ownerLabelMap.get(ownerKey);
      if (mapped) {
        return mapped;
      }
      if (ownerKey === userId) {
        return currentUserLabel;
      }
      if (ownerKey === (ownerId ?? "")) {
        return ownerDisplayName;
      }
      return ownerKey?.slice(0, 8) ?? ownerDisplayName;
    },
    [currentUserLabel, ownerDisplayName, ownerId, ownerLabelMap, resolveOwnerIdForNode, userId]
  );

  const handlePreview = useCallback((media: HomeMediaNode) => {
    if (media.kind !== "file") {
      return;
    }
    setPreviewTarget(media);
    setIsPreviewOpen(true);
  }, []);

  const previewContentUrl = useMemo(() => {
    if (!previewTarget?.relativePath) {
      return null;
    }

    return buildHomeMediaContentUrl(previewTarget.relativePath, userId);
  }, [previewTarget, userId]);

  useEffect(() => {
    if (!isCreateTypeDialogOpen) {
      setNewTypeLabel("");
      setNewTypeId("");
      setNewTypeIcon("");
      setCreateTypeError(null);
      setIsTypeIdEditedManually(false);
      setIconSearchQuery("");
      setIconSearchResults([]);
      setIconSearchError(null);
      setDeleteTypeError(null);
    }
  }, [isCreateTypeDialogOpen]);

  useEffect(() => {
    if (!isCreateDirectoryDialogOpen) {
      setNewDirectoryName("");
      setCreateError(null);
    }
  }, [isCreateDirectoryDialogOpen]);

  const setMediaTypeMutation = useMutation({
    mutationFn: ({
      path,
      mediaType,
      applyToChildren,
    }: {
      path: string;
      mediaType: HomeLibraryMediaType | null;
      applyToChildren?: boolean;
    }) => setHomeMediaType({ path, mediaType, applyToChildren }, userId),
  });
  const isSavingMediaType = setMediaTypeMutation.isPending;

  const createTypeMutation = useMutation({
    mutationFn: (payload: CreateHomeMediaTypeDefinitionInput) =>
      createHomeMediaTypeDefinition(payload, userId),
  });
  const isCreatingType = createTypeMutation.isPending;

  const deleteTypeMutation = useMutation({
    mutationFn: (typeId: string) => deleteHomeMediaTypeDefinition(typeId, userId),
  });
  const isDeletingType = deleteTypeMutation.isPending;

  const createDirectoryMutation = useMutation({
    mutationFn: ({
      name,
      parentPath,
    }: {
      name: string;
      parentPath?: string;
    }) => createHomeDirectory(name, userId, parentPath),
  });

  const deleteMutation = useMutation({
    mutationFn: (path: string) => deleteHomeMedia(path, userId),
  });

  const resolveMediaType = useCallback(
    (media: HomeMediaNode): ResolvedMediaType | null => {
      const explicit = media.customMediaType ?? null;
      const inherited = media.inheritedMediaType ?? null;
      const effective = explicit ?? inherited;

      if (!effective) {
        return null;
      }

      const definition = definitionMap.get(effective);
      const fallback = mediaTypeMetadata[effective];
      const label = definition?.label ?? fallback?.label ?? effective;
      const icon = definition?.icon ?? fallback?.icon ?? DEFAULT_MEDIA_ICON;

      return {
        type: effective,
        label,
        icon,
        source: explicit ? "custom" : "inherited",
      };
    },
    [definitionMap]
  );

  const openTypeDialog = useCallback(
    (node: HomeMediaNode) => {
      if (!node.relativePath || !canManagePath(node.relativePath)) {
        toast.error("Action réservée à votre espace personnel.");
        return;
      }

      const currentType = node.customMediaType ?? node.inheritedMediaType ?? null;
      setSelectedMediaType(currentType ?? "");
      setApplyTypeToChildren(node.kind === "directory");
      setTypeErrorMessage(null);
      setTypeDialogNode(node);
    },
    [canManagePath, toast]
  );

  const closeTypeDialog = useCallback(() => {
    setTypeDialogNode(null);
    setTypeErrorMessage(null);
  }, []);

  const handleCreateTypeDialogOpenChange = useCallback((open: boolean) => {
    setIsCreateTypeDialogOpen(open);
    if (!open) {
      setCreateTypeError(null);
    } else {
      setCreateTypeError(null);
    }
  }, []);

  const handleOpenCreateTypeDialog = useCallback(() => {
    setCreateTypeError(null);
    setIsTypeIdEditedManually(false);
    setIsCreateTypeDialogOpen(true);
  }, []);

  const handleNewTypeLabelChange = useCallback(
    (value: string) => {
      setNewTypeLabel(value);
      if (!isTypeIdEditedManually) {
        setNewTypeId(value ? slugify(value) : "");
      }
    },
    [isTypeIdEditedManually]
  );

  const handleNewTypeIdChange = useCallback((value: string) => {
    setNewTypeId(value);
    setIsTypeIdEditedManually(true);
  }, []);

  const handleSelectIcon = useCallback((icon: string) => {
    setNewTypeIcon(icon);
    setIconSearchError(null);
  }, []);

  const handleIconSearch = useCallback(
    async (event?: React.FormEvent<HTMLFormElement>) => {
      if (event) {
        event.preventDefault();
      }

      const query = iconSearchQuery.trim();
      if (!query) {
        setIconSearchError("Saisissez un mot-clé pour rechercher des icônes.");
        setIconSearchResults([]);
        return;
      }

      setIsIconSearchLoading(true);
      setIconSearchError(null);

      try {
        const response = await fetch(
          `https://api.iconify.design/search?query=${encodeURIComponent(query)}&limit=48`
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = (await response.json()) as { icons?: string[] };
        const results = Array.isArray(data.icons) ? data.icons.slice(0, 48) : [];

        if (results.length === 0) {
          setIconSearchError("Aucune icône trouvée pour ce mot-clé.");
        }

        setIconSearchResults(results);
      } catch (error) {
        console.error("Iconify search error", error);
        setIconSearchError(
          "Impossible de contacter Iconify. Vérifiez votre connexion ou réessayez plus tard."
        );
        setIconSearchResults([]);
      } finally {
        setIsIconSearchLoading(false);
      }
    },
    [iconSearchQuery]
  );

  const handleDeleteTypeDefinition = useCallback(
    async (definition: HomeMediaTypeDefinition) => {
      if (!definition?.id) {
        return;
      }

      const confirmed = await confirmToast({
        title: `Supprimer « ${definition.label} » ?`,
        description:
          "Les éléments qui utilisaient ce type reviendront au type par défaut. Cette action est irréversible.",
        confirmLabel: "Supprimer",
        cancelLabel: "Annuler",
        variant: "danger",
      });

      if (!confirmed) {
        return;
      }

      setDeleteTypeError(null);

      deleteTypeMutation.mutate(definition.id, {
        onSuccess: async () => {
          setDeleteTypeError(null);
          await queryClient.invalidateQueries({
            queryKey: ["home-media-library", userId],
          });
          if (selectedMediaType === definition.id) {
            setSelectedMediaType("");
          }
          toast.success(`Type « ${definition.label} » supprimé.`);
        },
        onError: (error) => {
          const message =
            error instanceof Error
              ? error.message
              : "Impossible de supprimer ce type de média.";
          setDeleteTypeError(message);
          toast.error(message);
        },
      });
    },
    [confirmToast, deleteTypeMutation, queryClient, selectedMediaType, toast, userId]
  );

  const handleSubmitCreateType = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      const label = newTypeLabel.trim();
      const identifier = newTypeId.trim();
      const icon = newTypeIcon.trim();

      if (!label) {
        setCreateTypeError("Le libellé est obligatoire.");
        return;
      }

      setCreateTypeError(null);

      const payload: CreateHomeMediaTypeDefinitionInput = {
        label,
        id: identifier.length > 0 ? identifier : undefined,
        icon: icon.length > 0 ? icon : undefined,
      };

      createTypeMutation.mutate(payload, {
        onSuccess: async () => {
          await queryClient.invalidateQueries({
            queryKey: ["home-media-library", userId],
          });
          setIsCreateTypeDialogOpen(false);
          toast.success(`Type « ${label} » créé.`);
        },
        onError: (error) => {
          setCreateTypeError(
            error instanceof Error
              ? error.message
              : "Impossible de créer le type de média."
          );
          toast.error(
            error instanceof Error
              ? error.message
              : "Impossible de créer le type de média."
          );
        },
      });
    },
    [createTypeMutation, newTypeIcon, newTypeId, newTypeLabel, queryClient, userId]
  );

  const handleSubmitType = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      const target = typeDialogNode;
      if (!target || !target.relativePath) {
        closeTypeDialog();
        return;
      }

      setTypeErrorMessage(null);

      setMediaTypeMutation.mutate(
        {
          path: target.relativePath,
          mediaType: selectedMediaType === "" ? null : selectedMediaType,
          applyToChildren: target.kind === "directory" ? applyTypeToChildren : undefined,
        },
        {
          onSuccess: async () => {
            await queryClient.invalidateQueries({
              queryKey: ["home-media-library", userId],
            });
            closeTypeDialog();
          },
          onError: (error) => {
            const message =
              error instanceof Error
                ? error.message
                : "Impossible de mettre à jour le type de média.";
            setTypeErrorMessage(message);
            toast.error(message);
          },
        }
      );
    },
    [
      typeDialogNode,
      selectedMediaType,
      applyTypeToChildren,
      setMediaTypeMutation,
      queryClient,
      userId,
      closeTypeDialog,
      toast,
    ]
  );

  const handleDelete = useCallback(
    async (node: HomeMediaNode) => {
      if (!node.relativePath || !canManagePath(node.relativePath)) {
        toast.error("Action réservée à votre espace personnel.");
        return;
      }

      const confirmed = await confirmToast({
        title: `Supprimer « ${node.name} » ?`,
        description:
          node.kind === "directory"
            ? "Le dossier et tout son contenu seront supprimés. Cette action est irréversible."
            : "Ce fichier sera définitivement supprimé.",
        confirmLabel: "Supprimer",
        cancelLabel: "Annuler",
        variant: "danger",
      });

      if (!confirmed) {
        return;
      }

      setDeleteError(null);
      setPendingDeletePath(node.relativePath);

      deleteMutation.mutate(node.relativePath, {
        onSuccess: async () => {
          setDeleteError(null);
          await queryClient.invalidateQueries({
            queryKey: ["home-media-library", userId],
          });
          toast.success(`« ${node.name} » a été supprimé.`);
        },
        onError: (error) => {
          const message =
            error instanceof Error
              ? error.message
              : "Suppression impossible. Réessayez.";
          setDeleteError(message);
          toast.error(message);
        },
        onSettled: () => {
          setPendingDeletePath(null);
        },
      });
    },
    [canManagePath, confirmToast, deleteMutation, queryClient, toast, userId]
  );

  const deletingPath = deleteMutation.isPending ? pendingDeletePath : null;

  const moveMutation = useMutation({
    mutationFn: ({
      source,
      destination,
    }: {
      source: string;
      destination: string;
    }) => moveHomeMedia(source, destination, userId),
  });

  const handleMove = useCallback(
    (node: HomeMediaNode) => {
      if (!node.relativePath) {
        toast.error("Impossible de renommer la racine de la bibliothèque.");
        return;
      }

      if (!canManagePath(node.relativePath)) {
        toast.error("Action réservée à votre espace personnel.");
        return;
      }

      setMoveError(null);
      setRenameDialogNode(node);
      setRenamePath(node.relativePath);
      setRenameError(null);
    },
    [canManagePath, toast]
  );

  const closeRenameDialog = useCallback(() => {
    setRenameDialogNode(null);
    setRenamePath("");
    setRenameError(null);
  }, []);

  const handleSubmitRename = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (!renameDialogNode || !renameDialogNode.relativePath) {
        closeRenameDialog();
        return;
      }

      const trimmed = renamePath.trim();

      if (!trimmed) {
        setRenameError("Le chemin cible est obligatoire.");
        return;
      }

      if (!canManagePath(renameDialogNode.relativePath)) {
        const message = "Vous ne pouvez pas modifier cet élément partagé.";
        setRenameError(message);
        toast.error(message);
        return;
      }

      const destination = normalizeDestinationPath(trimmed);

      if (!destination) {
        setRenameError("Le chemin cible est obligatoire.");
        return;
      }

      if (destination === renameDialogNode.relativePath) {
        closeRenameDialog();
        return;
      }

      if (!canManagePath(destination)) {
        const message = "La destination doit appartenir à votre espace personnel.";
        setRenameError(message);
        toast.error(message);
        return;
      }

      setMoveError(null);
      setRenameError(null);

      moveMutation.mutate(
        {
          source: renameDialogNode.relativePath,
          destination,
        },
        {
          onSuccess: async () => {
            await queryClient.invalidateQueries({
              queryKey: ["home-media-library", userId],
            });
            toast.success("Chemin mis à jour.");
            closeRenameDialog();
          },
          onError: (error) => {
            const message =
              error instanceof Error
                ? error.message
                : "Impossible de déplacer ou renommer cet élément.";
            setRenameError(message);
            toast.error(message);
          },
        }
      );
    },
    [
      canManagePath,
      closeRenameDialog,
      moveMutation,
      normalizeDestinationPath,
      queryClient,
      renameDialogNode,
      renamePath,
      toast,
      userId,
    ]
  );

  const movingPath = moveMutation.isPending ? moveMutation.variables?.source ?? null : null;
  const shareTargetPath = shareTarget?.relativePath ?? null;
  const isCreatingDirectory = createDirectoryMutation.isPending;

  const handleFileDrop = useCallback(
    (source: HomeMediaNode, target: HomeMediaNode) => {
      if (!source.relativePath) {
        return;
      }

      if (!canManagePath(source.relativePath)) {
        toast.error("Action réservée à votre espace personnel.");
        setDraggedNode(null);
        return;
      }

      let destination: string | null = null;

      if (target.kind === "directory" && target.relativePath) {
        destination = `${target.relativePath}/${source.name}`;
      } else if (!target.relativePath) {
        destination = source.name;
      } else {
        destination = target.relativePath;
      }

      if (!destination || destination === source.relativePath) {
        setDraggedNode(null);
        return;
      }

      const normalizedDestination = normalizeDestinationPath(destination);

      if (!normalizedDestination || !canManagePath(normalizedDestination)) {
        toast.error("Destination non autorisée.");
        setDraggedNode(null);
        return;
      }

      moveMutation.mutate(
        { source: source.relativePath, destination: normalizedDestination },
        {
          onSuccess: async () => {
            await queryClient.invalidateQueries({
              queryKey: ["home-media-library", userId],
            });
          },
          onError: (error) => {
            const message =
              error instanceof Error
                ? error.message
                : "Impossible de déplacer cet élément.";
            setMoveError(message);
            toast.error(message);
          },
          onSettled: () => {
            setDraggedNode(null);
            setShareTarget(null);
          },
        }
      );
    },
    [canManagePath, moveMutation, normalizeDestinationPath, queryClient, toast, userId]
  );

  const handleShare = useCallback(
    (node: HomeMediaNode) => {
      if (!isOwner || !node.relativePath) {
        return;
      }
      setShareTarget((previous) =>
        previous?.relativePath === node.relativePath ? null : node
      );
    },
    [isOwner]
  );

  const handleOpenCreateDirectoryDialog = useCallback(() => {
    if (!canCreateDirectories) {
      toast.error("Action indisponible pour ce compte.");
      return;
    }

    setCreateError(null);
    setNewDirectoryName("");
    setIsCreateDirectoryDialogOpen(true);
  }, [canCreateDirectories, toast]);

  const handleSubmitCreateDirectory = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (!canCreateDirectories) {
        toast.error("Action indisponible pour ce compte.");
        return;
      }

      const trimmed = newDirectoryName.trim();

      if (!trimmed) {
        setCreateError("Le nom du dossier est obligatoire.");
        return;
      }

      setCreateError(null);

      createDirectoryMutation.mutate(
        { name: trimmed },
        {
          onSuccess: async () => {
            setCreateError(null);
            setIsCreateDirectoryDialogOpen(false);
            await queryClient.invalidateQueries({
              queryKey: ["home-media-library", userId],
            });
            toast.success(`Dossier « ${trimmed} » créé.`);
          },
          onError: (error) => {
            const message =
              error instanceof Error
                ? error.message
                : "Impossible de créer le dossier.";
            setCreateError(message);
            toast.error(message);
          },
        }
      );
    },
    [
      canCreateDirectories,
      createDirectoryMutation,
      newDirectoryName,
      queryClient,
      toast,
      userId,
    ]
  );

  const rootNode = mediaQuery.data?.root;
  const hasMedia =
    Boolean(rootNode?.children?.length) || rootNode?.kind === "file";

  const accessLevel = mediaQuery.data?.access ?? (isOwner ? "owner" : "shared");
  const allowedPaths = mediaQuery.data?.allowedPaths ?? [];
  const hasPersonalAccess = manageableRoots.some((root) => root.length > 0);
  const isSharedViewOnly = accessLevel === "shared" && !hasPersonalAccess;
  const isHybridView = accessLevel === "shared" && hasPersonalAccess;

  const rootSummary = useMemo(() => {
    if (!rootNode) {
      return null;
    }
    return summarizeMedia(rootNode);
  }, [rootNode]);

  const topLevelNodes = mediaQuery.data?.root.children ?? [];
  const personalNode =
    personalRootPath && personalRootPath.length > 0
      ? topLevelNodes.find((child) => child.relativePath === personalRootPath)
      : null;
  const showPersonalSection = Boolean(personalNode && personalRootPath.length > 0);
  const sharedNodes = personalNode
    ? topLevelNodes.filter((child) => child.relativePath !== personalNode.relativePath)
    : topLevelNodes;

  const personalSummary = showPersonalSection && personalNode ? summarizeMedia(personalNode) : null;

  if (!isHomeConfigured) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Serveur local non configuré</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            La variable d&apos;environnement{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              NEXT_PUBLIC_HOME_SERVER_URL
            </code>{" "}
            n&apos;est pas définie. Ajoutez-la dans votre fichier{" "}
            <code>.env.local</code> pour activer la bibliothèque locale.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (healthQuery.isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Connexion au serveur local…</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            <span>Vérification de l&apos;état du serveur StreamNow Home.</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (healthQuery.isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Serveur local inaccessible</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Impossible de joindre StreamNow Home. Vérifiez que le serveur tourne
            bien sur votre machine puis réessayez.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void healthQuery.refetch()}
          >
            <RefreshCcw className="mr-2 h-4 w-4" aria-hidden="true" />
            Réessayer
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (mediaQuery.isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Analyse de la bibliothèque locale…</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[...Array(3)].map((_, index) => (
            <div
              key={index}
              className="h-8 w-full animate-pulse rounded bg-muted/60"
            />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (mediaQuery.isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Échec de l&apos;analyse des médias</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Une erreur est survenue lors de la récupération de vos fichiers
            locaux.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void mediaQuery.refetch()}
          >
            <RefreshCcw className="mr-2 h-4 w-4" aria-hidden="true" />
            Réessayer
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!mediaQuery.data || !hasMedia) {
    const title = isSharedViewOnly ? "Aucun élément partagé" : "Aucun média détecté";
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          {isSharedViewOnly ? (
            <>
              <p>
                Aucun dossier ou fichier ne vous a encore été partagé. Demandez
                au propriétaire du serveur StreamNow Home de vous accorder
                l&apos;accès à un dossier.
              </p>
              {allowedPaths.length > 0 ? (
                <p>
                  Des partages sont configurés, mais ils ne contiennent
                  actuellement aucun fichier disponible.
                </p>
              ) : null}
            </>
          ) : (
            <p>
              Ajoutez vos vidéos dans le dossier configuré (
              <code>{healthQuery.data?.mediaRoot}</code>) puis actualisez cette
              page.
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
      <CardHeader className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <CardTitle>Bibliothèque locale</CardTitle>
          <p className="text-sm text-muted-foreground">
            {healthQuery.data?.mediaRoot} • Synchronisée le{" "}
            <time dateTime={mediaQuery.data.generatedAt}>
              {new Date(mediaQuery.data.generatedAt).toLocaleString()}
            </time>
          </p>
          {isSharedViewOnly ? (
            <p className="text-xs text-muted-foreground">
              Vue limitée aux éléments partagés avec vous.
            </p>
          ) : null}
          {isHybridView ? (
            <p className="text-xs text-muted-foreground">
              Vous voyez votre espace personnel ainsi que les éléments partagés avec vous.
            </p>
          ) : null}
        </div>
        <div className="flex flex-col items-start gap-3 md:items-end">
          {rootSummary ? (
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="rounded-full bg-muted px-3 py-1">
                {rootSummary.files} fichier{rootSummary.files > 1 ? "s" : ""}
              </span>
              <span className="rounded-full bg-muted px-3 py-1">
                {rootSummary.videos} vidéo{rootSummary.videos > 1 ? "s" : ""}
              </span>
              <span className="rounded-full bg-muted px-3 py-1">
                {formatBytes(rootSummary.size)}
              </span>
            </div>
          ) : null}
          <span className="text-xs text-muted-foreground">
            Propriétaire du serveur : {ownerDisplayName}
          </span>
          <div className="flex flex-col gap-2 md:flex-row">
            <Button
              size="sm"
              onClick={handleOpenCreateDirectoryDialog}
              disabled={!canCreateDirectories || isCreatingDirectory}
              title={
                !canCreateDirectories ? "Action indisponible pour ce compte." : undefined
              }
            >
              {isCreatingDirectory ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <FolderPlus className="mr-2 h-4 w-4" aria-hidden="true" />
              )}
              Nouveau dossier
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleOpenCreateTypeDialog}
              disabled={!isOwner}
              title={!isOwner ? "Action réservée au propriétaire du serveur." : undefined}
            >
              <PlusCircle className="mr-2 h-4 w-4" aria-hidden="true" />
              Créer un type de média
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {deleteError ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {deleteError}
          </div>
        ) : null}
        {moveError ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {moveError}
          </div>
        ) : null}

        {showPersonalSection && personalNode ? (
          <section className="space-y-3 rounded-lg border border-primary/15 bg-primary/5 p-3">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-semibold">Vos fichiers</h3>
                <p className="text-xs text-muted-foreground">
                  {personalSummary
                    ? `${personalSummary.files} fichier${personalSummary.files > 1 ? "s" : ""} • ${personalSummary.videos} vidéo${personalSummary.videos > 1 ? "s" : ""} • ${formatBytes(personalSummary.size)}`
                    : "Dossier personnel"}
                </p>
              </div>
            </div>
            <Fragment key={`${personalNode.kind}-${personalNode.id}`}>
              <MediaNodeRow
                node={personalNode}
                onDelete={handleDelete}
                onRename={handleMove}
                onShare={handleShare}
                deletingPath={deletingPath}
                movingPath={movingPath}
                onDrop={handleFileDrop}
                onDragChange={setDraggedNode}
                currentDrag={draggedNode}
                shareTargetPath={shareTargetPath}
                canManage={canManagePath(personalNode.relativePath)}
                canShare={isOwner}
                canDrag={canManagePath(personalNode.relativePath)}
                onEditType={openTypeDialog}
                resolveMediaType={resolveMediaType}
                resolveOwnerLabel={resolveOwnerLabel}
                isPersonalRoot
                onPreview={handlePreview}
              />
              {isOwner && shareTarget && shareTargetPath === personalNode.relativePath ? (
                <LocalMediaSharePanel
                  target={shareTarget}
                  onClose={() => setShareTarget(null)}
                />
              ) : null}
            </Fragment>
          </section>
        ) : null}

        {sharedNodes.length > 0 ? (
          <section className="space-y-3">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-sm font-semibold">Partages reçus</h3>
              <span className="text-xs text-muted-foreground">
                {sharedNodes.length} dossier{sharedNodes.length > 1 ? "s" : ""}
              </span>
            </div>
            {sharedNodes.map((child) => (
              <Fragment key={`${child.kind}-${child.id}`}>
                <MediaNodeRow
                  node={child}
                  onDelete={handleDelete}
                  onRename={handleMove}
                  onShare={handleShare}
                  deletingPath={deletingPath}
                  movingPath={movingPath}
                  onDrop={handleFileDrop}
                  onDragChange={setDraggedNode}
                  currentDrag={draggedNode}
                  shareTargetPath={shareTargetPath}
                  canManage={canManagePath(child.relativePath)}
                  canShare={isOwner}
                  canDrag={canManagePath(child.relativePath)}
                  onEditType={openTypeDialog}
                  resolveMediaType={resolveMediaType}
                  resolveOwnerLabel={resolveOwnerLabel}
                onPreview={handlePreview}
                />
                {isOwner && shareTarget && shareTargetPath === child.relativePath ? (
                  <LocalMediaSharePanel
                    target={shareTarget}
                    onClose={() => setShareTarget(null)}
                  />
                ) : null}
              </Fragment>
            ))}
          </section>
        ) : null}

        {!isOwner && sharedNodes.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Aucun dossier ne vous a encore été partagé.
          </p>
        ) : null}
      </CardContent>
      </Card>
      <Dialog
        open={isCreateDirectoryDialogOpen}
        onOpenChange={(open) => setIsCreateDirectoryDialogOpen(open)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Nouveau dossier</DialogTitle>
            <DialogDescription>
              Créez un dossier à la racine de votre bibliothèque locale StreamNow Home.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSubmitCreateDirectory}>
            <div className="space-y-2">
              <Label htmlFor="new-directory-name">Nom du dossier</Label>
              <Input
                id="new-directory-name"
                value={newDirectoryName}
                onChange={(event) => setNewDirectoryName(event.target.value)}
                placeholder="Ex. Documents"
                autoFocus
                disabled={isCreatingDirectory}
              />
              <p className="text-xs text-muted-foreground">
                Le chemin est relatif depuis la racine configurée sur le serveur.
              </p>
            </div>
            {createError ? (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {createError}
              </div>
            ) : null}
            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateDirectoryDialogOpen(false)}
                disabled={isCreatingDirectory}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={
                  isCreatingDirectory || newDirectoryName.trim().length === 0
                }
              >
                {isCreatingDirectory && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                )}
                Créer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {isOwner ? (
        <Dialog
          open={isCreateTypeDialogOpen}
          onOpenChange={handleCreateTypeDialogOpenChange}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Créer un type de média</DialogTitle>
              <DialogDescription>
                Ajoutez un type personnalisé pour organiser votre bibliothèque locale.
              </DialogDescription>
            </DialogHeader>
            <form className="space-y-4" onSubmit={handleSubmitCreateType}>
              <div className="space-y-2">
                <Label htmlFor="new-media-type-label">Libellé</Label>
                <Input
                  id="new-media-type-label"
                  value={newTypeLabel}
                  onChange={(event) => handleNewTypeLabelChange(event.target.value)}
                  placeholder="Ex. Documentaire"
                  autoFocus
                  disabled={isCreatingType}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-media-type-id">Identifiant (optionnel)</Label>
                <Input
                  id="new-media-type-id"
                  value={newTypeId}
                  onChange={(event) => handleNewTypeIdChange(event.target.value)}
                  placeholder="documentaire"
                  disabled={isCreatingType}
                />
                <p className="text-xs text-muted-foreground">
                  Utilisé dans les scripts et l&rsquo;API. Laissez vide pour le générer automatiquement.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-media-type-icon">Icône (optionnelle)</Label>
                <Input
                  id="new-media-type-icon"
                  value={newTypeIcon}
                  onChange={(event) => setNewTypeIcon(event.target.value)}
                  placeholder="noto:clapper-board"
                  disabled={isCreatingType}
                />
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="preset-media-type-icon">
                      Icônes colorées prédéfinies
                    </Label>
                    <div className="flex items-center gap-2">
                      <select
                        id="preset-media-type-icon"
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        value={PRESET_ICON_OPTIONS.some((option) => option.icon === newTypeIcon) ? newTypeIcon : ""}
                        onChange={(event) => {
                          const value = event.target.value;
                          if (value) {
                            handleSelectIcon(value);
                          }
                        }}
                        disabled={isCreatingType}
                      >
                        <option value="">Choisir une icône colorée…</option>
                        {PRESET_ICON_OPTIONS.map((option) => (
                          <option key={option.icon} value={option.icon}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      {newTypeIcon ? (
                        <span className="flex h-10 w-10 items-center justify-center rounded border border-muted">
                          <MediaIcon icon={newTypeIcon} className="h-6 w-6" />
                        </span>
                      ) : null}
                    </div>
                  </div>
                  {customMediaTypeDefinitions.length > 0 ? (
                    <div className="space-y-2">
                      <Label>Types personnalisés existants</Label>
                      <p className="text-xs text-muted-foreground">
                        Supprimez un type inutilisé. Les éléments associés reviendront au type par défaut.
                      </p>
                      <div className="max-h-40 space-y-2 overflow-y-auto rounded-md border border-muted p-2">
                        {customMediaTypeDefinitions.map((definition) => (
                          <div
                            key={definition.id}
                            className="flex items-center justify-between gap-3 rounded-md bg-muted/40 px-3 py-2 text-sm"
                          >
                            <div className="flex items-center gap-2">
                              <MediaIcon icon={definition.icon} className="h-5 w-5" />
                              <div className="flex flex-col">
                                <span className="font-medium text-foreground">
                                  {definition.label}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {definition.id}
                                </span>
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                              onClick={() => void handleDeleteTypeDefinition(definition)}
                              disabled={isCreatingType || isDeletingType}
                            >
                              {isDeletingType ? (
                                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                              ) : (
                                <Trash2 className="h-4 w-4" aria-hidden="true" />
                              )}
                              <span className="sr-only">
                                Supprimer le type {definition.label}
                              </span>
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground">
                      Rechercher dans Iconify
                    </p>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <Input
                        value={iconSearchQuery}
                        onChange={(event) => setIconSearchQuery(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            void handleIconSearch();
                          }
                        }}
                        placeholder="Ex. movie, music, folder..."
                        className="flex-1"
                        disabled={isCreatingType}
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="sm:w-auto"
                        disabled={isCreatingType || isIconSearchLoading}
                        onClick={() => handleIconSearch()}
                      >
                        {isIconSearchLoading ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                        ) : (
                          <Search className="mr-2 h-4 w-4" aria-hidden="true" />
                        )}
                        Rechercher
                      </Button>
                    </div>
                    {iconSearchError ? (
                      <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                        {iconSearchError}
                      </div>
                    ) : null}
                    {iconSearchResults.length > 0 ? (
                      <div className="grid max-h-48 grid-cols-2 gap-2 overflow-y-auto rounded-md border border-muted sm:grid-cols-4">
                        {iconSearchResults.map((iconName) => {
                          const isSelected = newTypeIcon === iconName;
                          return (
                            <button
                              key={iconName}
                              type="button"
                              onClick={() => handleSelectIcon(iconName)}
                              className={cn(
                                "flex flex-col items-center gap-2 px-3 py-2 text-xs transition-colors hover:bg-muted/70",
                                isSelected && "bg-primary/10 text-primary"
                              )}
                              disabled={isCreatingType}
                            >
                              <MediaIcon icon={iconName} className="h-6 w-6" />
                              <span className="truncate text-center">{iconName}</span>
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="px-2 text-xs"
                    onClick={() => setNewTypeIcon("")}
                    disabled={isCreatingType || newTypeIcon.length === 0}
                  >
                    Réinitialiser l&rsquo;icône
                  </Button>
                </div>
              </div>
              {createTypeError ? (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {createTypeError}
                </div>
              ) : null}
              {deleteTypeError ? (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {deleteTypeError}
                </div>
              ) : null}
              <DialogFooter className="gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateTypeDialogOpen(false)}
                  disabled={isCreatingType}
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  disabled={isCreatingType || newTypeLabel.trim().length === 0}
                >
                  {isCreatingType && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  )}
                  Enregistrer
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      ) : null}
      <Dialog
        open={Boolean(typeDialogNode)}
        onOpenChange={(open) => {
          if (!open) {
            closeTypeDialog();
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Définir le type de média</DialogTitle>
            <DialogDescription>
              {typeDialogNode
                ? `Affectez un type spécifique à « ${typeDialogNode.name} » ${typeDialogNode.kind === "directory" ? "et à son contenu" : ""}.`
                : "Sélectionnez un type pour ce contenu."}
            </DialogDescription>
          </DialogHeader>
          {typeDialogNode ? (
            <form className="space-y-4 overflow-y-auto" onSubmit={handleSubmitType}>
              <div className="space-y-2">
                <Label className="text-xs uppercase text-muted-foreground">
                  Chemin
                </Label>
                <code className="block rounded bg-muted px-2 py-1 text-xs">
                  {typeDialogNode.relativePath || "(racine)"}
                </code>
              </div>
              <div className="space-y-2">
                <Label htmlFor="home-media-type-select">Type de média</Label>
                <select
                  id="home-media-type-select"
                  value={selectedMediaType}
                  onChange={(event) =>
                    setSelectedMediaType(event.target.value as HomeLibraryMediaType | "")
                  }
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Aucun (type par défaut)</option>
                  {availableMediaTypes.map((definition) => {
                    const fallback = mediaTypeMetadata[definition.id];
                    const label = definition.label ?? fallback?.label ?? definition.id;
                    return (
                      <option key={definition.id} value={definition.id}>
                        {label}
                      </option>
                    );
                  })}
                </select>
                {availableMediaTypes.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Aucun type disponible. Utilisez le bouton « Créer un type de média » pour en ajouter.
                  </p>
                ) : null}
              </div>
              {typeDialogNode.inheritedMediaType && !typeDialogNode.customMediaType ? (
                <p className="text-xs text-muted-foreground">
                  Type actuellement hérité :{" "}
                  {definitionMap.get(typeDialogNode.inheritedMediaType)?.label ??
                    mediaTypeMetadata[typeDialogNode.inheritedMediaType]?.label ??
                    typeDialogNode.inheritedMediaType}
                </p>
              ) : null}
              {typeDialogNode.kind === "directory" ? (
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={applyTypeToChildren}
                    onChange={(event) => setApplyTypeToChildren(event.target.checked)}
                    className="h-4 w-4"
                  />
                  <span>Appliquer aux fichiers et sous-dossiers descendants</span>
                </label>
              ) : null}
              {typeErrorMessage ? (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {typeErrorMessage}
                </div>
              ) : null}
              <DialogFooter className="gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeTypeDialog}
                  disabled={isSavingMediaType}
                >
                  Annuler
                </Button>
                <Button type="submit" disabled={isSavingMediaType}>
                  {isSavingMediaType && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  )}
                  Enregistrer
                </Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(renameDialogNode)}
        onOpenChange={(open) => {
          if (!open) {
            closeRenameDialog();
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Renommer ou déplacer</DialogTitle>
            <DialogDescription>
              Modifiez le chemin relatif pour déplacer ou renommer cet élément dans la bibliothèque.
            </DialogDescription>
          </DialogHeader>
          {renameDialogNode ? (
            <form className="space-y-4" onSubmit={handleSubmitRename}>
              <div className="space-y-2">
                <Label className="text-xs uppercase text-muted-foreground">
                  Chemin actuel
                </Label>
                <code className="block rounded bg-muted px-2 py-1 text-xs">
                  {renameDialogNode.relativePath}
                </code>
              </div>
              <div className="space-y-2">
                <Label htmlFor="rename-path">Nouveau chemin relatif</Label>
                <Input
                  id="rename-path"
                  value={renamePath}
                  onChange={(event) => setRenamePath(event.target.value)}
                  disabled={moveMutation.isPending}
                  placeholder="exemple/dossier/nom"
                />
                <p className="text-xs text-muted-foreground">
                  Les dossiers intermédiaires doivent exister. Utilisez « / » pour définir la hiérarchie.
                </p>
              </div>
              {renameError ? (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {renameError}
                </div>
              ) : null}
              <DialogFooter className="gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeRenameDialog}
                  disabled={moveMutation.isPending}
                >
                  Annuler
                </Button>
                <Button type="submit" disabled={moveMutation.isPending}>
                  {moveMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  )}
                  Enregistrer
                </Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>
      <HomeMediaPreviewDialog
        open={isPreviewOpen && Boolean(previewTarget)}
        onOpenChange={(open) => {
          setIsPreviewOpen(open);
          if (!open) {
            setPreviewTarget(null);
          }
        }}
        media={previewTarget}
        contentUrl={previewContentUrl}
      />
    </>
  );
}

interface LocalMediaSharePanelProps {
  target: HomeMediaNode;
  onClose: () => void;
}

function LocalMediaSharePanel({ target, onClose }: LocalMediaSharePanelProps) {
  const path = target.relativePath ?? "";
  const isDirectory = target.kind === "directory";

  const { data: shareData, isLoading: sharesLoading, error: sharesError } =
    useLocalMediaShares(path);
  const { data: friendsOverview, isLoading: friendsLoading } =
    useFriendsOverview(true);

  const shareMutation = useShareLocalMedia();

  const [selectedRecipients, setSelectedRecipients] = useState<Set<string>>(
    new Set()
  );

  useEffect(() => {
    const schedule =
      typeof queueMicrotask === "function"
        ? queueMicrotask
        : (callback: () => void) => {
            Promise.resolve().then(callback);
          };

    if (!shareData) {
      schedule(() => {
        setSelectedRecipients(new Set());
      });
      return;
    }

    schedule(() => {
      setSelectedRecipients((previous) => {
        const next = new Set(shareData.map((share) => share.recipient.id));
        if (previous.size === next.size) {
          let identical = true;
          for (const id of previous) {
            if (!next.has(id)) {
              identical = false;
              break;
            }
          }
          if (identical) {
            return previous;
          }
        }
        return next;
      });
    });
  }, [shareData]);

  const toggleRecipient = useCallback((id: string) => {
    setSelectedRecipients((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleSave = useCallback(() => {
    shareMutation.mutate(
      {
        path,
        isDirectory,
        recipientIds: Array.from(selectedRecipients),
      },
      {
        onSuccess: () => {
          onClose();
        },
      }
    );
  }, [shareMutation, path, isDirectory, selectedRecipients, onClose]);

  const friends = friendsOverview?.friends ?? [];
  const isSaving = shareMutation.isPending;
  const errorMessage =
    shareMutation.error?.message ?? sharesError?.message ?? null;

  return (
    <div className="rounded-lg border border-primary/20 bg-muted/20 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">
            Partager « {target.name} »
          </p>
          <p className="text-xs text-muted-foreground">
            {isDirectory ? "Dossier" : "Fichier"} — chemin :{" "}
            <code className="rounded bg-background px-1 py-0.5">
              {path}
            </code>
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isSaving}
          >
            Annuler
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            )}
            Enregistrer
          </Button>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {errorMessage ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {errorMessage}
          </div>
        ) : null}

        {friendsLoading || sharesLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            <span>Chargement des amis…</span>
          </div>
        ) : null}

        {!friendsLoading && friends.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Vous n&apos;avez pas encore d&apos;amis pour partager ce contenu. Ajoutez-en depuis la page « Amis ».
          </p>
        ) : null}

        {!friendsLoading && friends.length > 0 ? (
          <div className="space-y-2">
            {friends.map((entry) => {
              const friend = entry.friend;
              const isChecked = selectedRecipients.has(friend.id);

              return (
                <label
                  key={friend.id}
                  className={cn(
                    "flex cursor-pointer items-center justify-between rounded-md border px-3 py-2 text-sm transition-colors",
                    isChecked ? "border-primary bg-primary/10" : "border-border"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleRecipient(friend.id)}
                      className="h-4 w-4"
                    />
                    <div className="flex flex-col">
                      <span className="font-semibold">
                        {friend.nickname ?? friend.email}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {friend.email}
                      </span>
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        ) : null}

        <p className="text-xs text-muted-foreground">
          Les amis sélectionnés pourront accéder à ce contenu depuis leur espace partagé.
          Retirez toutes les cases puis cliquez sur « Enregistrer » pour révoquer l&apos;accès.
        </p>
      </div>
    </div>
  );
}
