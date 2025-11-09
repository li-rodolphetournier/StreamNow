"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useHomeServerHealth } from "@/hooks/useHomeServerHealth";
import { useHomeMediaLibrary } from "@/hooks/useHomeMediaLibrary";
import { HomeMediaNode } from "@/types/home";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { deleteHomeMedia, moveHomeMedia } from "@/lib/api/home";
import { useFriendsOverview } from "@/hooks/useFriends";
import {
  useLocalMediaShares,
  useShareLocalMedia,
} from "@/hooks/useLocalMediaShares";

interface MediaSummary {
  files: number;
  videos: number;
  size: number;
}

const summaryCache = new WeakMap<HomeMediaNode, MediaSummary>();

interface HomeMediaExplorerProps {
  userId: string;
  isOwner: boolean;
}

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
}: {
  node: HomeMediaNode;
  depth?: number;
  onDelete: (media: HomeMediaNode) => void;
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
}) {
  const canDelete = canManage && Boolean(node.relativePath);
  const isDeleting = deletingPath === node.relativePath;
  const isMoving = movingPath === node.relativePath;
  const isShareTarget = canShare && shareTargetPath === node.relativePath;

  if (node.kind === "directory") {
    const summary = summarizeMedia(node);
    const palette =
      depth === 0
        ? { border: "var(--primary)", bg: "rgba(var(--primary), 0.08)" }
        : depth === 1
        ? { border: "var(--secondary)", bg: "rgba(var(--secondary), 0.08)" }
        : { border: "var(--muted-foreground)", bg: "rgba(var(--muted-foreground), 0.08)" };

    return (
      <div className="space-y-2">
        <div
          className={cn(
            "flex items-center justify-between rounded-md border-l-4 px-3 py-2 transition-colors",
            isShareTarget && "ring-2 ring-primary/40"
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
                    ? `rgb(var(--primary))`
                    : depth === 1
                    ? `rgb(var(--secondary))`
                    : `rgb(var(--muted-foreground))`,
              }}
            />
            <span className="font-medium">{node.name}</span>
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
            </div>
            <div className="flex items-center gap-1">
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
                  onClick={() => onDelete(node)}
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
        <span className="truncate text-sm">{node.name}</span>
      </div>
      <div className="ml-4 flex shrink-0 items-center gap-2">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="uppercase">{node.mediaType ?? "autre"}</span>
          {node.size ? <span>{formatBytes(node.size)}</span> : null}
          {node.modifiedAt ? (
            <time dateTime={node.modifiedAt}>
              {new Date(node.modifiedAt).toLocaleDateString()}
            </time>
          ) : null}
        </div>
        <div className="flex items-center gap-1">
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
              onClick={() => onDelete(node)}
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

export function HomeMediaExplorer({ userId, isOwner }: HomeMediaExplorerProps) {
  const healthQuery = useHomeServerHealth();
  const isHomeConfigured = healthQuery.enabled;
  const isHomeReachable =
    isHomeConfigured && !healthQuery.isError && Boolean(healthQuery.data);

  const mediaQuery = useHomeMediaLibrary(userId, isHomeReachable);
  const queryClient = useQueryClient();

  const [pendingDeletePath, setPendingDeletePath] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [moveError, setMoveError] = useState<string | null>(null);
  const [draggedNode, setDraggedNode] = useState<HomeMediaNode | null>(null);
  const [shareTarget, setShareTarget] = useState<HomeMediaNode | null>(null);

  const deleteMutation = useMutation({
    mutationFn: (path: string) => deleteHomeMedia(path, userId),
  });

  const handleDelete = useCallback(
    (node: HomeMediaNode) => {
      if (!isOwner || !node.relativePath) {
        return;
      }

      const confirmation = window.confirm(
        `Supprimer "${node.name}" et son contenu ? Cette action est irréversible.`
      );

      if (!confirmation) {
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
        },
        onError: (error) => {
          const message =
            error instanceof Error
              ? error.message
              : "Suppression impossible. Réessayez.";
          setDeleteError(message);
        },
        onSettled: () => {
          setPendingDeletePath(null);
        },
      });
    },
    [deleteMutation, isOwner, queryClient, userId]
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
      if (!isOwner || !node.relativePath) {
        return;
      }

      const currentPath = node.relativePath;
      const destinationPath = window.prompt(
        "Nouveau chemin (relatif) pour ce fichier/dossier :",
        currentPath
      );

      if (!destinationPath || destinationPath.trim() === currentPath) {
        return;
      }

      setMoveError(null);
      setPendingDeletePath(null);
      setShareTarget(null);

      moveMutation.mutate(
        {
          source: currentPath,
          destination: destinationPath.trim(),
        },
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
                : "Impossible de déplacer ou renommer cet élément.";
            setMoveError(message);
          },
        }
      );
    },
    [isOwner, moveMutation, queryClient, userId]
  );

  const movingPath = moveMutation.isPending ? moveMutation.variables?.source ?? null : null;
  const shareTargetPath = shareTarget?.relativePath ?? null;

  const handleFileDrop = useCallback(
    (source: HomeMediaNode, target: HomeMediaNode) => {
      if (!isOwner) {
        return;
      }

      if (!source.relativePath) {
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

      moveMutation.mutate(
        { source: source.relativePath, destination },
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
          },
          onSettled: () => {
            setDraggedNode(null);
            setShareTarget(null);
          },
        }
      );
    },
    [isOwner, moveMutation, queryClient, userId]
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

  const rootNode = mediaQuery.data?.root;
  const hasMedia =
    Boolean(rootNode?.children?.length) || rootNode?.kind === "file";

  const accessLevel = mediaQuery.data?.access ?? (isOwner ? "owner" : "shared");
  const allowedPaths = mediaQuery.data?.allowedPaths ?? [];
  const isSharedView = accessLevel === "shared";

  const rootSummary = useMemo(() => {
    if (!rootNode) {
      return null;
    }
    return summarizeMedia(rootNode);
  }, [rootNode]);

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
    const title = isSharedView ? "Aucun élément partagé" : "Aucun média détecté";
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          {isSharedView ? (
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
    <Card>
      <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle>Bibliothèque locale</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            {healthQuery.data?.mediaRoot} • Synchronisée le{" "}
            <time dateTime={mediaQuery.data.generatedAt}>
              {new Date(mediaQuery.data.generatedAt).toLocaleString()}
            </time>
          </p>
          {isSharedView ? (
            <p className="text-xs text-muted-foreground">
              Vue limitée aux éléments partagés avec vous.
            </p>
          ) : null}
        </div>
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
      </CardHeader>
      <CardContent className="space-y-3">
        {isOwner && deleteError ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {deleteError}
          </div>
        ) : null}
        {isOwner && moveError ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {moveError}
          </div>
        ) : null}
        {(mediaQuery.data.root.children ?? []).map((child) => (
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
              canManage={isOwner}
              canShare={isOwner}
              canDrag={isOwner}
            />
            {isOwner && shareTarget && shareTargetPath === child.relativePath ? (
              <LocalMediaSharePanel
                target={shareTarget}
                onClose={() => setShareTarget(null)}
              />
            ) : null}
          </Fragment>
        ))}
      </CardContent>
    </Card>
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
