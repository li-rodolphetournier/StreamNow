"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  FolderPlus,
  Loader2,
  RefreshCcw,
  UploadCloud,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useHomeServerHealth } from "@/hooks/useHomeServerHealth";
import { uploadHomeMedia } from "@/lib/api/home";
import { HomeMediaUploadResponse } from "@/types/home";

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

export function HomeMediaUploader() {
  const healthQuery = useHomeServerHealth();
  const isHomeConfigured = healthQuery.enabled;
  const isHomeReachable =
    isHomeConfigured && !healthQuery.isError && Boolean(healthQuery.data);

  const queryClient = useQueryClient();

  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<HomeMediaUploadResponse | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (folderInputRef.current) {
      folderInputRef.current.setAttribute("webkitdirectory", "");
      folderInputRef.current.setAttribute("directory", "");
    }
  }, []);

  const resetInputs = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    if (folderInputRef.current) {
      folderInputRef.current.value = "";
    }
  };

  const handleUpload = useCallback(
    async (files: FileList | File[] | null) => {
      if (!files || files.length === 0 || !isHomeReachable) {
        return;
      }

      setIsUploading(true);
      setError(null);

      try {
        const payload = await uploadHomeMedia(Array.from(files));
        setResult(payload);
        await queryClient.invalidateQueries({
          queryKey: ["home-media-library"],
        });
      } catch (uploadError) {
        const message =
          uploadError instanceof Error
            ? uploadError.message
            : "Une erreur inattendue est survenue pendant l'upload.";
        setError(message);
      } finally {
        setIsUploading(false);
        resetInputs();
      }
    },
    [isHomeReachable, queryClient]
  );

  const onInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      void handleUpload(event.target.files);
    },
    [handleUpload]
  );

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragging(false);
      void handleUpload(event.dataTransfer?.files ?? null);
    },
    [handleUpload]
  );

  const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
  }, []);

  const safeReset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  const summary = useMemo(() => {
    if (!result) {
      return null;
    }

    const savedCount = result.savedFiles.length;
    const savedSize = result.savedFiles.reduce(
      (total, file) => total + file.size,
      0
    );

    return {
      savedCount,
      savedSize,
      errors: result.errors,
      status: result.status,
    };
  }, [result]);

  if (!isHomeConfigured) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Serveur local non configuré</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            Définissez la variable{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              NEXT_PUBLIC_HOME_SERVER_URL
            </code>{" "}
            pour pouvoir importer des fichiers dans votre bibliothèque locale.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (healthQuery.isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Connexion à StreamNow Home…</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          <span>Vérification de l&apos;état du serveur local.</span>
        </CardContent>
      </Card>
    );
  }

  if (healthQuery.isError || !isHomeReachable) {
    return (
      <Card>
        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <CardTitle>Serveur local inaccessible</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void healthQuery.refetch()}
          >
            <RefreshCcw className="mr-2 h-4 w-4" aria-hidden="true" />
            Réessayer
          </Button>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            Lancez le service StreamNow Home (`make home` ou `make docker-up`)
            puis actualisez cette page afin de pouvoir déposer des fichiers.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle>Ajouter des médias locaux</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Glissez-déposez des fichiers ou sélectionnez un dossier pour les
            copier dans votre bibliothèque StreamNow Home.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            <UploadCloud className="mr-2 h-4 w-4" aria-hidden="true" />
            Ajouter des fichiers
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => folderInputRef.current?.click()}
            disabled={isUploading}
          >
            <FolderPlus className="mr-2 h-4 w-4" aria-hidden="true" />
            Ajouter un dossier
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          role="button"
          tabIndex={0}
          className={[
            "flex h-40 flex-col items-center justify-center rounded-md border-2 border-dashed transition-colors",
            isDragging ? "border-primary bg-primary/10" : "border-muted",
            isUploading ? "opacity-70" : "opacity-100",
          ].join(" ")}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              fileInputRef.current?.click();
            }
          }}
        >
          {isUploading ? (
            <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
              <span>Upload en cours…</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
              <UploadCloud className="h-6 w-6" aria-hidden="true" />
              <span>
                Déposez vos fichiers ici ou cliquez pour sélectionner.
              </span>
              <span className="text-xs">
                Les sous-dossiers sont conservés automatiquement.
              </span>
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          hidden
          onChange={onInputChange}
        />
        <input
          ref={folderInputRef}
          type="file"
          multiple
          hidden
          onChange={onInputChange}
        />

        {error ? (
          <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <div className="space-y-1">
              <p>{error}</p>
              <Button
                variant="outline"
                size="sm"
                className="border-destructive text-destructive hover:bg-destructive/10"
                onClick={() => setError(null)}
              >
                Réessayer
              </Button>
            </div>
          </div>
        ) : null}

        {summary ? (
          <div className="space-y-2 rounded-md border bg-muted/30 px-3 py-2 text-sm">
            <div className="flex items-center gap-2 font-medium">
              <CheckCircle2
                className="h-4 w-4 text-emerald-500"
                aria-hidden="true"
              />
              <span>
                {summary.savedCount} fichier
                {summary.savedCount > 1 ? "s" : ""} importé
                {summary.savedCount > 1 ? "s" : ""} (
                {formatBytes(summary.savedSize)}).
              </span>
            </div>

            {summary.errors.length > 0 ? (
              <div className="space-y-1">
                <p className="font-medium text-destructive">
                  {summary.errors.length} élément
                  {summary.errors.length > 1 ? "s" : ""} non importé
                  {summary.errors.length > 1 ? "s" : ""} :
                </p>
                <ul className="space-y-1 text-xs text-destructive">
                  {summary.errors.slice(0, 3).map((item) => (
                    <li key={`${item.relativePath}-${item.reason}`}>
                      {item.relativePath} — {item.reason}
                    </li>
                  ))}
                  {summary.errors.length > 3 ? (
                    <li>… et d&apos;autres éléments.</li>
                  ) : null}
                </ul>
              </div>
            ) : null}

            <div>
              <Button
                variant="ghost"
                size="xs"
                onClick={safeReset}
                className="px-0 text-primary hover:text-primary/80"
              >
                Effacer le résumé
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

