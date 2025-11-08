"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useCustomVideos } from "@/hooks/useCustomVideos";
import { Skeleton } from "@/components/shared/Skeleton";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { cn } from "@/lib/utils";

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

const readableStatus = (status: string) =>
  status === "PUBLISHED" ? "Publié" : "Brouillon";

const readableMediaType = (mediaType: string) =>
  mediaType === "MOVIE" ? "Film" : "Série";

const readableVisibility = (visibility: string) => {
  switch (visibility) {
    case "FRIENDS":
      return "Amis";
    case "PUBLIC":
      return "Tout le monde";
    case "AUTHENTICATED":
      return "Utilisateurs connectés";
    case "RESTRICTED":
      return "Accès restreint";
    case "PRIVATE":
    default:
      return "Privé";
  }
};

export default function DashboardVideosPage() {
  const { user, isLoading: isAuthLoading } = useRequireAuth();
  const {
    data,
    isLoading,
    isError,
    error,
  } = useCustomVideos({ enabled: Boolean(user) && !isAuthLoading });

  if (isAuthLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Vidéos personnalisées</h1>
          <p className="text-muted-foreground">
            Importez vos bandes annonces et gérez votre catalogue privé.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/videos/new">Ajouter une vidéo</Link>
        </Button>
      </div>

      <div className="mt-8 rounded-lg border bg-card p-4 shadow-sm">
        {!user && !isAuthLoading && (
          <div className="rounded-md bg-muted/40 p-4 text-muted-foreground">
            Votre session a expiré. Merci de vous reconnecter pour accéder à vos vidéos.
          </div>
        )}

        {isLoading && (
          <div className="space-y-4">
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        )}

        {!isLoading && isError && (
          <div className="rounded-md bg-destructive/10 p-4 text-destructive">
            <p>Impossible de récupérer les vidéos.</p>
            <p className="text-sm opacity-80">{String(error)}</p>
          </div>
        )}

        {!isLoading && !isError && user && (!data || data.length === 0) && (
          <div className="py-8 text-center text-muted-foreground">
            <p>Aucune vidéo personnalisée pour le moment.</p>
            <p>Ajoutez votre première vidéo en utilisant le bouton ci-dessus.</p>
          </div>
        )}

        {!isLoading && !isError && user && data && data.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">
                    Titre
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">
                    Source
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">
                    Statut
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">
                    Visibilité
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">
                    Créée le
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">
                    Propriétaire
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">
                    ID TMDB
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.map((video) => (
                  <tr key={video.id} className="hover:bg-muted/40">
                    <td className="px-4 py-3 text-sm font-medium">
                      {video.title}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={cn(
                          "rounded-full px-2 py-1 text-xs font-semibold",
                          video.sourceType === "LOCAL"
                            ? "bg-blue-500/10 text-blue-500"
                            : "bg-purple-500/10 text-purple-500"
                        )}
                      >
                        {video.sourceType === "LOCAL" ? "Local" : "TMDB"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {readableMediaType(video.mediaType)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-semibold ${
                          video.status === "PUBLISHED"
                            ? "bg-emerald-500/10 text-emerald-500"
                            : "bg-amber-500/10 text-amber-500"
                        }`}
                      >
                        {readableStatus(video.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                    {readableVisibility(video.visibility)}
                  </td>
                  <td className="px-4 py-3 text-sm">
                      {formatDate(video.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {video.owner?.email ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {video.tmdbId ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex gap-2">
                        <Link
                          href={`/dashboard/videos/${video.id}`}
                          className="text-primary hover:underline"
                        >
                          Gérer
                        </Link>
                        {video.tmdbId ? (
                          <Link
                            href={`/video/${video.tmdbId}?type=${video.mediaType.toLowerCase()}`}
                            className="text-muted-foreground hover:underline"
                          >
                            Voir public
                          </Link>
                        ) : (
                          <span className="cursor-not-allowed text-muted-foreground/60">
                            Voir public
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

