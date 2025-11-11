"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  GraphQLVideoMediaType,
  GraphQLVideoStatus,
  GraphQLTmdbSearchResult,
} from "@/types/graphql";
import { useAddVideo } from "@/hooks/useAddVideo";
import { useCreateLocalVideo } from "@/hooks/useCreateLocalVideo";
import { uploadVideoFile } from "@/lib/api/upload";
import { useTmdbSearch } from "@/hooks/useTmdbSearch";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { Skeleton } from "@/components/shared/Skeleton";

const mediaTypeOptions: Array<{ label: string; value: GraphQLVideoMediaType }> =
  [
    { label: "Film", value: "MOVIE" },
    { label: "Série", value: "TV" },
  ];

const statusOptions: Array<{ label: string; value: GraphQLVideoStatus }> = [
  { label: "Brouillon", value: "DRAFT" },
  { label: "Publié", value: "PUBLISHED" },
];

type FormMode = "tmdb" | "local";

type UploadState =
  | { status: "idle" }
  | { status: "uploading" }
  | {
      status: "success";
      fileUrl: string;
      size: number;
      originalName: string;
      mimeType: string;
    }
  | { status: "error"; message: string };

export function AddVideoClient() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useRequireAuth();

  const [mode, setMode] = useState<FormMode>("tmdb");
  const [mediaType, setMediaType] = useState<GraphQLVideoMediaType>("MOVIE");
  const [status, setStatus] = useState<GraphQLVideoStatus>("DRAFT");
  const [tmdbId, setTmdbId] = useState<string>("");
  const [manualTitle, setManualTitle] = useState("");
  const [manualOverview, setManualOverview] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>({ status: "idle" });
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedResult, setSelectedResult] =
    useState<GraphQLTmdbSearchResult | null>(null);

  const addVideoMutation = useAddVideo();
  const createLocalVideoMutation = useCreateLocalVideo();
  const isImportPending = addVideoMutation.status === "pending";
  const isLocalPending = createLocalVideoMutation.status === "pending";

  if (isAuthLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="mb-6 h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const tmdbQueryMediaType = useMemo(() => mediaType ?? "MOVIE", [mediaType]);
  const { data: tmdbResults = [], isFetching: isSearching } = useTmdbSearch(
    searchTerm,
    tmdbQueryMediaType
  );

  const handleModeChange = (nextMode: FormMode) => {
    setMode(nextMode);
    setFormError(null);
    setSuccessMessage(null);
  };

  const handleUpload = async (file: File | null) => {
    if (!file) {
      setUploadState({ status: "idle" });
      return;
    }

    setUploadState({ status: "uploading" });
    try {
      const response = await uploadVideoFile(file);
      setUploadState({
        status: "success",
        fileUrl: response.fileUrl,
        size: response.size,
        originalName: response.originalName,
        mimeType: response.mimeType,
      });
    } catch (error) {
      setUploadState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Échec du téléversement",
      });
    }
  };

  const handleSelectResult = (result: GraphQLTmdbSearchResult) => {
    setSelectedResult(result);
    setTmdbId(String(result.id));
    setManualTitle(result.title ?? "");
    setManualOverview(result.overview ?? "");
  };

  const handleSubmitTmdb = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

    const parsedId = Number(tmdbId);
    if (!Number.isInteger(parsedId) || parsedId <= 0) {
      setFormError("L'identifiant TMDB doit être un entier positif.");
      return;
    }

    addVideoMutation.mutate(
      {
        tmdbId: parsedId,
        mediaType,
        status,
      },
      {
        onSuccess: (video) => {
          setSuccessMessage(`Vidéo "${video.title}" importée avec succès.`);
          setTmdbId("");
          setManualTitle("");
          setManualOverview("");
          router.replace(`/dashboard/videos/${video.id}`);
        },
        onError: (error) => {
          setFormError(error instanceof Error ? error.message : String(error));
        },
      }
    );
  };

  const handleSubmitLocal = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

    if (uploadState.status !== "success") {
      setFormError("Veuillez téléverser un fichier vidéo avant de valider.");
      return;
    }

    const payload = {
      fileUrl: uploadState.fileUrl,
      mediaType,
      status,
      fileSize: uploadState.size,
      tmdbId: tmdbId ? Number(tmdbId) : undefined,
      title: tmdbId ? undefined : manualTitle || undefined,
      overview: tmdbId ? undefined : manualOverview || undefined,
    };

    if (!tmdbId && !payload.title) {
      setFormError("Indiquez un titre ou sélectionnez un contenu TMDB.");
      return;
    }

    createLocalVideoMutation.mutate(payload, {
      onSuccess: (video) => {
        setSuccessMessage(`Vidéo locale "${video.title}" créée.`);
        router.replace(`/dashboard/videos/${video.id}`);
      },
      onError: (error) => {
        setFormError(error instanceof Error ? error.message : String(error));
      },
    });
  };

  return (
    <div className="container mx-auto space-y-8 px-4 py-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Ajouter une vidéo personnalisée</h1>
          <p className="text-muted-foreground">
            Téléversez un fichier local ou rattachez une fiche TMDB pour
            récupérer automatiquement les métadonnées.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/dashboard/videos">Retour à la liste</Link>
        </Button>
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          variant={mode === "tmdb" ? "default" : "outline"}
          onClick={() => handleModeChange("tmdb")}
        >
          Import TMDB
        </Button>
        <Button
          type="button"
          variant={mode === "local" ? "default" : "outline"}
          onClick={() => handleModeChange("local")}
        >
          Fichier local + TMDB
        </Button>
      </div>

      <section className="space-y-6 rounded-lg border bg-card p-6 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="mediaType" className="text-sm font-medium">
              Type de média
            </label>
            <select
              id="mediaType"
              value={mediaType}
              onChange={(event) =>
                setMediaType(event.target.value as GraphQLVideoMediaType)
              }
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {mediaTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="status" className="text-sm font-medium">
              Statut initial
            </label>
            <select
              id="status"
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as GraphQLVideoStatus)
              }
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {mode === "tmdb" ? (
          <form className="space-y-6" onSubmit={handleSubmitTmdb}>
            <div className="space-y-2">
              <label htmlFor="tmdbId" className="text-sm font-medium">
                Identifiant TMDB *
              </label>
              <Input
                id="tmdbId"
                type="number"
                min={1}
                value={tmdbId}
                onChange={(event) => setTmdbId(event.target.value)}
                placeholder="Ex : 603692"
                required
              />
              <p className="text-xs text-muted-foreground">
                Renseignez l&apos;identifiant du film ou de la série sur TMDB.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button type="submit" disabled={isImportPending}>
                {isImportPending ? "Import en cours..." : "Importer et lier"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => router.push("/dashboard/videos")}
              >
                Voir mes vidéos
              </Button>
            </div>
          </form>
        ) : (
          <form className="space-y-6" onSubmit={handleSubmitLocal}>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="videoFile">
                Fichier vidéo local *
              </label>
              <Input
                id="videoFile"
                type="file"
                accept="video/*"
                onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                  handleUpload(event.target.files?.[0] ?? null)
                }
              />
              <p className="text-xs text-muted-foreground">
                Formats acceptés : MP4, MKV, MOV... Taille max 2 Go.
              </p>
              {uploadState.status === "uploading" ? (
                <p className="text-sm text-muted-foreground">
                  Téléversement en cours...
                </p>
              ) : null}
              {uploadState.status === "success" ? (
                <div className="rounded-md bg-emerald-500/10 p-3 text-sm text-emerald-600">
                  Fichier chargé : {uploadState.originalName} (
                  {Math.round(uploadState.size / (1024 * 1024))} Mo)
                </div>
              ) : null}
              {uploadState.status === "error" ? (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  {uploadState.message}
                </div>
              ) : null}
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="tmdbSearch">
                  Associer à TMDB (optionnel)
                </label>
                <Input
                  id="tmdbSearch"
                  placeholder="Rechercher un titre TMDB"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Tapez au moins 2 caractères pour lancer la recherche.
                </p>
                {isSearching ? (
                  <p className="text-xs text-muted-foreground">Recherche...</p>
                ) : null}
                {tmdbResults.length > 0 ? (
                  <div className="max-h-56 overflow-y-auto rounded-md border">
                    <ul className="divide-y">
                      {tmdbResults.map((result) => (
                        <li
                          key={`${result.mediaType}-${result.id}`}
                          className={cn(
                            "cursor-pointer bg-background p-3 text-sm hover:bg-muted",
                            selectedResult?.id === result.id
                              ? "bg-muted"
                              : undefined
                          )}
                          onClick={() => handleSelectResult(result)}
                        >
                          <p className="font-medium">{result.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {result.mediaType === "TV" ? "Série" : "Film"} •{" "}
                            {result.releaseDate ?? "Date inconnue"}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="tmdbIdLocal" className="text-sm font-medium">
                    Identifiant TMDB (optionnel)
                  </label>
                  <Input
                    id="tmdbIdLocal"
                    type="number"
                    min={1}
                    value={tmdbId}
                    onChange={(event) => setTmdbId(event.target.value)}
                    placeholder="Ex : 603692"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="manualTitle" className="text-sm font-medium">
                    Titre personnalisé {tmdbId ? "" : "*"}
                  </label>
                  <Input
                    id="manualTitle"
                    value={manualTitle}
                    onChange={(event) => setManualTitle(event.target.value)}
                    placeholder="Titre affiché dans StreamNow"
                    required={!tmdbId}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="manualOverview" className="text-sm font-medium">
                  Résumé (optionnel)
                </label>
                <Textarea
                  id="manualOverview"
                  value={manualOverview}
                  onChange={(event) => setManualOverview(event.target.value)}
                  placeholder="Décrivez le contenu pour vos utilisateurs."
                  rows={4}
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                type="submit"
                disabled={
                  isLocalPending || uploadState.status === "uploading"
                }
              >
                {isLocalPending ? "Création..." : "Créer la vidéo locale"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => router.push("/dashboard/videos")}
              >
                Voir mes vidéos
              </Button>
            </div>
          </form>
        )}

        {formError ? (
          <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
            {formError}
          </div>
        ) : null}
        {successMessage ? (
          <div className="rounded-md bg-emerald-500/10 p-4 text-sm text-emerald-600">
            {successMessage}
          </div>
        ) : null}
      </section>
    </div>
  );
}


