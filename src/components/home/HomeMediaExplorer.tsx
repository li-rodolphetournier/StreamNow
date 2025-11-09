"use client";

import { useMemo } from "react";
import {
  Folder,
  Film,
  HardDrive,
  Loader2,
  RefreshCcw,
} from "lucide-react";
import { useHomeServerHealth } from "@/hooks/useHomeServerHealth";
import { useHomeMediaLibrary } from "@/hooks/useHomeMediaLibrary";
import { HomeMediaNode } from "@/types/home";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface MediaSummary {
  files: number;
  videos: number;
  size: number;
}

const summaryCache = new WeakMap<HomeMediaNode, MediaSummary>();

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
}: {
  node: HomeMediaNode;
  depth?: number;
}) {
  if (node.kind === "directory") {
    const summary = summarizeMedia(node);
    return (
      <div className="space-y-2">
        <div
          className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2"
          style={{ marginLeft: depth * 16 }}
        >
          <div className="flex items-center gap-2">
            <Folder className="h-4 w-4 text-primary" aria-hidden="true" />
            <span className="font-medium">{node.name}</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>{summary.files} fichier{summary.files > 1 ? "s" : ""}</span>
            <span>
              {summary.videos} vidéo{summary.videos > 1 ? "s" : ""}
            </span>
            <span>{formatBytes(summary.size)}</span>
          </div>
        </div>
        {(node.children ?? []).map((child) => (
          <MediaNodeRow
            key={`${child.kind}-${child.id}`}
            node={child}
            depth={depth + 1}
          />
        ))}
      </div>
    );
  }

  const Icon = node.mediaType === "video" ? Film : HardDrive;
  return (
    <div
      className="flex items-center justify-between rounded-md border bg-card/60 px-3 py-2"
      style={{ marginLeft: depth * 16 }}
    >
      <div className="flex min-w-0 items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <span className="truncate text-sm">{node.name}</span>
      </div>
      <div className="ml-4 flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
        <span className="uppercase">{node.mediaType ?? "autre"}</span>
        {node.size ? <span>{formatBytes(node.size)}</span> : null}
        {node.modifiedAt ? (
          <time dateTime={node.modifiedAt}>
            {new Date(node.modifiedAt).toLocaleDateString()}
          </time>
        ) : null}
      </div>
    </div>
  );
}

export function HomeMediaExplorer() {
  const healthQuery = useHomeServerHealth();
  const isHomeConfigured = healthQuery.enabled;
  const isHomeReachable =
    isHomeConfigured && !healthQuery.isError && Boolean(healthQuery.data);

  const mediaQuery = useHomeMediaLibrary(isHomeReachable);

  const rootNode = mediaQuery.data?.root;
  const hasMedia =
    Boolean(rootNode?.children?.length) || rootNode?.kind === "file";

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
    return (
      <Card>
        <CardHeader>
          <CardTitle>Aucun média détecté</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            Ajoutez vos vidéos dans le dossier configuré (
            <code>{healthQuery.data?.mediaRoot}</code>) puis actualisez cette
            page.
          </p>
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
        {(mediaQuery.data.root.children ?? []).map((child) => (
          <MediaNodeRow
            key={`${child.kind}-${child.id}`}
            node={child}
          />
        ))}
      </CardContent>
    </Card>
  );
}

