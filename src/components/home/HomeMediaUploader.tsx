"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { useUploadManager } from "@/hooks/useUploadManager";

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

interface HomeMediaUploaderProps {
  userId: string;
}

export function HomeMediaUploader({ userId }: HomeMediaUploaderProps) {
  const healthQuery = useHomeServerHealth();
  const isHomeConfigured = healthQuery.enabled;
  const isHomeReachable =
    isHomeConfigured && !healthQuery.isError && Boolean(healthQuery.data);

  const canUpload = isHomeReachable;

  const { uploads, activeUploads, startUploads, clearCompleted } =
    useUploadManager(userId);

  const [isDragging, setIsDragging] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (folderInputRef.current) {
      folderInputRef.current.setAttribute("webkitdirectory", "");
      folderInputRef.current.setAttribute("directory", "");
    }
  }, []);

  const resetInputs = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    if (folderInputRef.current) {
      folderInputRef.current.value = "";
    }
  }, []);

  const handleUpload = useCallback(
    async (files: FileList | File[] | null) => {
      if (!files || files.length === 0 || !canUpload) {
        return;
      }

      try {
        await startUploads(Array.from(files));
        setGlobalError(null);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Une erreur inattendue est survenue pendant l'upload.";
        setGlobalError(message);
      } finally {
        resetInputs();
      }
    },
    [canUpload, startUploads, resetInputs]
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
      if (!canUpload) {
        return;
      }
      setIsDragging(false);
      void handleUpload(event.dataTransfer?.files ?? null);
    },
    [canUpload, handleUpload]
  );

  const onDragOver = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      if (!canUpload) {
        return;
      }
      setIsDragging(true);
    },
    [canUpload]
  );

  const onDragLeave = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      if (!canUpload) {
        return;
      }
      setIsDragging(false);
    },
    [canUpload]
  );

  const hasUploads = uploads.length > 0;
  const completedCount = useMemo(
    () => uploads.filter((upload) => upload.status === "completed").length,
    [uploads]
  );
  const hasErrors = uploads.some((upload) => upload.status === "error");
  const isUploading = activeUploads.length > 0;

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
            disabled={isUploading || !canUpload}
          >
            <UploadCloud className="mr-2 h-4 w-4" aria-hidden="true" />
            Ajouter des fichiers
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => folderInputRef.current?.click()}
            disabled={isUploading || !canUpload}
          >
            <FolderPlus className="mr-2 h-4 w-4" aria-hidden="true" />
            Ajouter un dossier
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          role="button"
          tabIndex={canUpload ? 0 : -1}
          className={[
            "flex h-40 flex-col items-center justify-center rounded-md border-2 border-dashed transition-colors",
            isDragging ? "border-primary bg-primary/10" : "border-muted",
            isUploading ? "opacity-70" : "opacity-100",
            !canUpload ? "cursor-not-allowed opacity-60" : "cursor-pointer",
          ].join(" ")}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => {
            if (!canUpload) {
              return;
            }
            fileInputRef.current?.click();
          }}
          onKeyDown={(event) => {
            if (!canUpload) {
              return;
            }
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          aria-disabled={!canUpload}
        >
          {isUploading ? (
            <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
              <span>Uploads en arrière-plan…</span>
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
          disabled={!canUpload}
        />
        <input
          ref={folderInputRef}
          type="file"
          multiple
          hidden
          onChange={onInputChange}
          disabled={!canUpload}
        />

        {globalError ? (
          <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <div className="space-y-1">
              <p>{globalError}</p>
              <Button
                variant="outline"
                size="sm"
                className="border-destructive text-destructive hover:bg-destructive/10"
                onClick={() => setGlobalError(null)}
              >
                Réessayer
              </Button>
            </div>
          </div>
        ) : null}

        {hasUploads ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Uploads en arrière-plan</p>
              <Button
                variant="ghost"
                size="sm"
                className="px-2"
                onClick={clearCompleted}
                disabled={completedCount === 0}
              >
                Effacer les terminés
              </Button>
            </div>
            <div className="space-y-2">
              {uploads.map((upload) => {
                const progress =
                  upload.status === "completed"
                    ? 100
                    : upload.size > 0
                    ? Math.min(
                        100,
                        Math.round((upload.uploadedBytes / upload.size) * 100)
                      )
                    : 0;

                return (
                  <div
                    key={upload.id}
                    className="rounded-md border bg-muted/20 px-3 py-2"
                  >
                    <div className="flex items-center justify-between text-sm font-medium">
                      <span className="truncate">{upload.relativePath}</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="mt-2 h-2 w-full rounded-full bg-muted">
                      <div
                        className="h-2 rounded-full bg-primary transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        {formatBytes(upload.uploadedBytes)} /{" "}
                        {formatBytes(upload.size)}
                      </span>
                      <span className="flex items-center gap-1">
                        {upload.status === "completed" ? (
                          <>
                            <CheckCircle2 className="h-3 w-3 text-emerald-500" aria-hidden="true" />
                            <span className="text-emerald-500">Terminé</span>
                          </>
                        ) : upload.status === "error" ? (
                          <>
                            <AlertTriangle className="h-3 w-3 text-destructive" aria-hidden="true" />
                            <span className="text-destructive">
                              {upload.error ?? "Erreur"}
                            </span>
                          </>
                        ) : upload.status === "aborted" ? (
                          <>
                            <AlertTriangle className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                            <span>Annulé</span>
                          </>
                        ) : (
                          <>
                            <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                            <span>Envoi…</span>
                          </>
                        )}
                      </span>
                    </div>
                    {upload.status === "error" && upload.error ? (
                      <p className="mt-1 text-xs text-destructive">{upload.error}</p>
                    ) : null}
                  </div>
                );
              })}
            </div>
            {hasErrors ? (
              <p className="text-xs text-destructive">
                Les uploads en erreur peuvent être relancés en les sélectionnant de
                nouveau.
              </p>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}


