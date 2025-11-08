"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/shared/Skeleton";
import { useCustomVideo } from "@/hooks/useCustomVideo";
import { useUpdateVideoStatus } from "@/hooks/useUpdateVideoStatus";
import { useUpdateVideoVisibility } from "@/hooks/useUpdateVideoVisibility";
import {
  type GraphQLVideoStatus,
  type GraphQLVideoSourceType,
  type GraphQLVideoVisibility,
  type ShareRecipientInputVariables,
  type GraphQLVideoShare,
} from "@/types/graphql";
import { cn } from "@/lib/utils";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { resolveApiBaseUrl } from "@/lib/api/upload";
import { Input } from "@/components/ui/input";

const ReactPlayer = dynamic(() => import("react-player"), { ssr: false });

const statusLabel: Record<GraphQLVideoStatus, string> = {
  DRAFT: "Brouillon",
  PUBLISHED: "Publié",
};

const sourceLabel: Record<GraphQLVideoSourceType, string> = {
  TMDB: "Catalogué TMDB",
  LOCAL: "Fichier local",
};

const visibilityLabel: Record<GraphQLVideoVisibility, string> = {
  PRIVATE: "Privé",
  AUTHENTICATED: "Utilisateurs connectés",
  FRIENDS: "Mes amis",
  PUBLIC: "Tout le monde",
  RESTRICTED: "Accès restreint",
};

const visibilityOptions: Array<{
  value: GraphQLVideoVisibility;
  label: string;
  description: string;
}> = [
  {
    value: "PRIVATE",
    label: "Privé",
    description: "Seul vous pouvez voir cette vidéo.",
  },
  {
    value: "AUTHENTICATED",
    label: "Utilisateurs connectés",
    description: "Toutes les personnes connectées à StreamNow peuvent la voir.",
  },
  {
    value: "FRIENDS",
    label: "Mes amis",
    description: "Seules les personnes figurant dans votre liste d'amis peuvent la voir.",
  },
  {
    value: "PUBLIC",
    label: "Tout le monde",
    description: "Accessible à toute personne disposant du lien, sans connexion.",
  },
  {
    value: "RESTRICTED",
    label: "Accès restreint",
    description: "Disponible uniquement pour les utilisateurs que vous indiquez.",
  },
];

const extractRecipients = (
  shares?: GraphQLVideoShare[] | null
): ShareRecipientInputVariables[] => {
  if (!shares) {
    return [];
  }

  const seen = new Set<string>();
  const result: ShareRecipientInputVariables[] = [];

  for (const share of shares) {
    const email = share.recipient.email?.toLowerCase();
    const nickname = share.recipient.nickname ?? undefined;
    const key = email ?? nickname?.toLowerCase();

    if (!key || seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push({
      ...(email ? { email } : {}),
      ...(nickname ? { nickname } : {}),
    });
  }

  return result;
};

const getRecipientKey = (recipient: ShareRecipientInputVariables): string => {
  return (
    recipient.email?.toLowerCase() ??
    recipient.nickname?.toLowerCase() ??
    ""
  );
};

const formatRecipientLabel = (
  recipient: ShareRecipientInputVariables
): string => {
  if (recipient.nickname && recipient.email) {
    return `${recipient.nickname} (${recipient.email})`;
  }
  return recipient.nickname ?? recipient.email ?? "";
};

export default function DashboardVideoDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useRequireAuth();

  const {
    data,
    isLoading,
    isError,
    error,
  } = useCustomVideo(id, { enabled: Boolean(user) && !isAuthLoading });
  const updateStatus = useUpdateVideoStatus();
  const updateVisibility = useUpdateVideoVisibility();
  const [localError, setLocalError] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<GraphQLVideoVisibility>("PRIVATE");
  const [recipients, setRecipients] = useState<ShareRecipientInputVariables[]>([]);
  const [recipientInput, setRecipientInput] = useState("");
  const [visibilityError, setVisibilityError] = useState<string | null>(null);
  const [visibilitySuccess, setVisibilitySuccess] = useState<string | null>(null);
  const isUpdating = updateStatus.status === "pending";
  const isVisibilitySaving = updateVisibility.status === "pending";

  const canPublish = useMemo(
    () => data?.status === "DRAFT",
    [data?.status]
  );

  const canUnpublish = useMemo(
    () => data?.status === "PUBLISHED",
    [data?.status]
  );

  useEffect(() => {
    if (!data) {
      return;
    }

    setVisibility(data.visibility);
    setRecipients(extractRecipients(data.shares));
    setRecipientInput("");
    setVisibilityError(null);
    setVisibilitySuccess(null);
  }, [data]);

  const handleStatusChange = async (status: GraphQLVideoStatus) => {
    if (!data) return;
    setLocalError(null);

    updateStatus.mutate(
      { id: data.id, status },
      {
        onError: (mutationError) => {
          setLocalError(String(mutationError));
        },
      }
    );
  };

  const handleAddRecipient = () => {
    const value = recipientInput.trim();
    if (!value) {
      return;
    }

    const entry: ShareRecipientInputVariables = value.includes("@")
      ? { email: value.toLowerCase() }
      : { nickname: value };

    const key = getRecipientKey(entry);
    if (!key) {
      return;
    }

    if (recipients.some((recipient) => getRecipientKey(recipient) === key)) {
      setVisibilityError("Ce destinataire est déjà ajouté.");
      setVisibilitySuccess(null);
      return;
    }

    setRecipients((prev) => [...prev, entry]);
    setRecipientInput("");
    setVisibilityError(null);
    setVisibilitySuccess(null);
  };

  const handleRemoveRecipient = (index: number) => {
    setRecipients((prev) => prev.filter((_, idx) => idx !== index));
    setVisibilitySuccess(null);
  };

  const handleSubmitVisibility = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!data) {
      return;
    }

    setVisibilityError(null);
    setVisibilitySuccess(null);

    updateVisibility.mutate(
      {
        id: data.id,
        visibility,
        recipients: visibility === "RESTRICTED" ? recipients : undefined,
      },
      {
        onSuccess: (updatedVideo) => {
          setVisibility(updatedVideo.visibility);
          setRecipients(extractRecipients(updatedVideo.shares));
          setRecipientInput("");
          setVisibilitySuccess("Paramètres de partage mis à jour.");
        },
        onError: (mutationError) => {
          setVisibilityError(
            mutationError instanceof Error
              ? mutationError.message
              : String(mutationError)
          );
        },
      }
    );
  };

  const handleResetVisibility = () => {
    if (!data) {
      return;
    }

    setVisibility(data.visibility);
    setRecipients(extractRecipients(data.shares));
    setRecipientInput("");
    setVisibilityError(null);
    setVisibilitySuccess(null);
  };

  if (isAuthLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-8 w-64 mb-6" />
        <div className="flex flex-col md:flex-row gap-8">
          <Skeleton className="w-full md:w-1/3 aspect-[2/3] rounded-lg" />
          <div className="flex-1 space-y-4">
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[300px] w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="rounded-md bg-destructive/10 p-4 text-destructive">
          Impossible de charger la vidéo.
          <div className="text-sm opacity-80">{String(error)}</div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="rounded-md border p-6 text-sm text-muted-foreground">
          Cette vidéo n&apos;existe pas ou a été supprimée.
        </div>
        <Button className="mt-4" variant="outline" onClick={() => router.push("/dashboard/videos")}>
          Retour au dashboard
        </Button>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const resolvePlaybackUrl = (fileUrl: string | null | undefined): string | null => {
    if (!fileUrl) {
      return null;
    }
    if (fileUrl.startsWith("http://") || fileUrl.startsWith("https://")) {
      return fileUrl;
    }
    try {
      const base = resolveApiBaseUrl();
      return `${base}${fileUrl}`;
    } catch (error) {
      console.error("Unable to resolve API base URL", error);
      return fileUrl;
    }
  };

  const playbackUrl = resolvePlaybackUrl(data.fileUrl);

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/videos">← Retour à la liste</Link>
          </Button>
          <h1 className="text-3xl font-bold mt-2">{data.title}</h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>{statusLabel[data.status]}</span>
            <span>•</span>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-semibold capitalize",
                data.sourceType === "LOCAL"
                  ? "bg-blue-500/10 text-blue-500"
                  : "bg-purple-500/10 text-purple-500"
              )}
            >
              {sourceLabel[data.sourceType]}
            </span>
            <span>•</span>
            <span>{visibilityLabel[visibility]}</span>
            {data.tmdbId ? <span>• TMDB #{data.tmdbId}</span> : null}
          </div>
        </div>
        <div className="flex gap-2">
          {data.tmdbId ? (
            <Button variant="outline" asChild>
              <Link href={`/video/${data.tmdbId}?type=${data.mediaType.toLowerCase()}`}>
                Voir la fiche publique
              </Link>
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-[280px,1fr]">
        <div className="space-y-4">
          <div className="overflow-hidden rounded-lg border bg-card">
            {data.posterUrl ? (
              <Image
                src={data.posterUrl}
                alt={data.title}
                width={280}
                height={420}
                className="h-auto w-full object-cover"
              />
            ) : (
              <div className="flex h-[420px] items-center justify-center bg-muted text-muted-foreground">
                Pas d&apos;affiche
              </div>
            )}
          </div>
          <div className="space-y-3 rounded-lg border bg-card p-4 shadow-sm">
            <h2 className="text-lg font-semibold">Actions</h2>
            <div className="flex flex-col gap-2">
              <Button
                variant="default"
                disabled={!canPublish || isUpdating}
                onClick={() => handleStatusChange("PUBLISHED")}
              >
                Publier
              </Button>
              <Button
                variant="outline"
                disabled={!canUnpublish || isUpdating}
                onClick={() => handleStatusChange("DRAFT")}
              >
                Mettre en brouillon
              </Button>
            </div>
            {localError && (
              <p className="text-sm text-destructive">{localError}</p>
            )}
          </div>
          <div className="space-y-3 rounded-lg border bg-card p-4 shadow-sm">
            <h2 className="text-lg font-semibold">Gestion des accès</h2>
            <form className="space-y-4" onSubmit={handleSubmitVisibility}>
              <div className="space-y-2">
                <label htmlFor="video-visibility" className="text-sm font-medium">
                  Qui peut voir cette vidéo ?
                </label>
                <select
                  id="video-visibility"
                  value={visibility}
                  onChange={(event) => setVisibility(event.target.value as GraphQLVideoVisibility)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {visibilityOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  {visibilityOptions.find((option) => option.value === visibility)?.description}
                </p>
              </div>

              {visibility === "RESTRICTED" ? (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <label htmlFor="share-recipient" className="text-sm font-medium">
                      Ajouter un destinataire (email ou pseudo)
                    </label>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Input
                        id="share-recipient"
                        value={recipientInput}
                        onChange={(event) => setRecipientInput(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            handleAddRecipient();
                          }
                        }}
                        placeholder="ex: ami@exemple.com ou pseudo"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={handleAddRecipient}
                        disabled={!recipientInput.trim()}
                      >
                        Ajouter
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Les personnes indiquées doivent posséder un compte StreamNow.
                    </p>
                  </div>

                  {recipients.length > 0 && (
                    <ul className="flex flex-wrap gap-2">
                      {recipients.map((recipient, index) => {
                        const key = getRecipientKey(recipient) || index.toString();
                        return (
                          <li
                            key={key}
                            className="flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs"
                          >
                            <span>{formatRecipientLabel(recipient)}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-4 w-4 text-muted-foreground hover:text-destructive"
                              onClick={() => handleRemoveRecipient(index)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              ) : null}

              {visibilityError && (
                <div className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">
                  {visibilityError}
                </div>
              )}

              {visibilitySuccess && (
                <div className="rounded-md bg-emerald-500/10 p-2 text-sm text-emerald-600">
                  {visibilitySuccess}
                </div>
              )}

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button type="submit" disabled={isVisibilitySaving}>
                  {isVisibilitySaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Mettre à jour
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleResetVisibility}
                  disabled={isVisibilitySaving}
                >
                  Annuler
                </Button>
              </div>
            </form>
          </div>
        </div>

        <div className="space-y-6">
          {data.sourceType === "LOCAL" && playbackUrl ? (
            <section className="rounded-lg border bg-card p-6 shadow-sm space-y-3">
              <h2 className="text-xl font-semibold">Lecture locale</h2>
              <div className="aspect-video overflow-hidden rounded-lg border">
                <ReactPlayer url={playbackUrl} width="100%" height="100%" controls playing={false} />
              </div>
              <p className="text-sm text-muted-foreground">
                Fichier hébergé : {playbackUrl}
              </p>
            </section>
          ) : null}

          <section className="rounded-lg border bg-card p-6 shadow-sm space-y-3">
            <h2 className="text-xl font-semibold">Résumé</h2>
            <p className="text-muted-foreground">
              {data.overview ?? "Aucun résumé disponible pour cette vidéo."}
            </p>
          </section>

          <section className="rounded-lg border bg-card p-6 shadow-sm space-y-3">
            <h2 className="text-xl font-semibold">Informations</h2>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Type</p>
                <p className="text-sm font-medium">
                  {data.mediaType === "MOVIE" ? "Film" : "Série"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Statut</p>
                <p className="text-sm font-medium">{statusLabel[data.status]}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Visibilité</p>
                <p className="text-sm font-medium">{visibilityLabel[data.visibility]}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Date de sortie</p>
                <p className="text-sm font-medium">
                  {data.releaseDate
                    ? new Date(data.releaseDate).toLocaleDateString("fr-FR")
                    : "Inconnue"}
                </p>
              </div>
              {data.fileSize ? (
                <div>
                  <p className="text-sm text-muted-foreground">Taille du fichier</p>
                  <p className="text-sm font-medium">
                    {Math.round((data.fileSize ?? 0) / (1024 * 1024))} Mo
                  </p>
                </div>
              ) : null}
              {data.durationSeconds ? (
                <div>
                  <p className="text-sm text-muted-foreground">Durée</p>
                  <p className="text-sm font-medium">
                    {Math.round((data.durationSeconds ?? 0) / 60)} min
                  </p>
                </div>
              ) : null}
              <div>
                <p className="text-sm text-muted-foreground">Créée le</p>
                <p className="text-sm font-medium">
                  {new Date(data.createdAt).toLocaleString("fr-FR")}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Propriétaire</p>
                <p className="text-sm font-medium">
                  {data.owner?.email ?? "—"}
                </p>
              </div>
            </div>
          </section>

          {data.trailerUrl && (
            <section className="rounded-lg border bg-card p-6 shadow-sm space-y-3">
              <h2 className="text-xl font-semibold">Bande annonce</h2>
              <div className="aspect-video overflow-hidden rounded-lg border">
                <iframe
                  src={data.trailerUrl.replace("watch?v=", "embed/")}
                  title={`Trailer ${data.title}`}
                  allow="autoplay; encrypted-media"
                  allowFullScreen
                  className="h-full w-full"
                />
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

