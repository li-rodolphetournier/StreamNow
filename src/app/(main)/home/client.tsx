"use client";

import { Skeleton } from "@/components/shared/Skeleton";
import { HomeMediaExplorer } from "@/components/home/HomeMediaExplorer";
import { HomeMediaUploader } from "@/components/home/HomeMediaUploader";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useUserProfile } from "@/hooks/useUserProfile";

export default function HomeMediaClient() {
  const { user, isLoading } = useRequireAuth({ redirectTo: "/home" });
  const ownerId = process.env.NEXT_PUBLIC_HOME_SERVER_OWNER_ID ?? null;
  const ownerProfileQuery = useUserProfile(ownerId, Boolean(ownerId));
  const ownerProfile = ownerProfileQuery.data;

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-5xl space-y-6 px-4 py-10">
        <div className="space-y-3">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const currentUserLabel = user.nickname?.trim() || user.email || user.id.slice(0, 8);
  const isOwner = !ownerId || ownerId === user.id;

  const ownerEnvName = process.env.NEXT_PUBLIC_HOME_SERVER_OWNER_NAME?.trim();
  const ownerEnvEmail = process.env.NEXT_PUBLIC_HOME_SERVER_OWNER_EMAIL?.trim();

  const ownerDisplayName = isOwner
    ? currentUserLabel
    : ownerEnvName ||
      ownerProfile?.nickname?.trim() ||
      ownerEnvEmail ||
      ownerProfile?.email ||
      (ownerId ? ownerId.slice(0, 8) : "Propriétaire du serveur");

  return (
    <div className="container mx-auto max-w-5xl space-y-8 px-4 py-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Bibliothèque locale</h1>
        <p className="text-sm text-muted-foreground">
          Parcourez les fichiers hébergés sur votre serveur personnel StreamNow Home. Les
          catégories correspondent à la structure de dossiers de votre disque.
        </p>
      </header>
      <HomeMediaUploader userId={user.id} />
      <HomeMediaExplorer
        userId={user.id}
        isOwner={isOwner}
        ownerDisplayName={ownerDisplayName}
        ownerId={ownerId}
        currentUserLabel={currentUserLabel}
      />
    </div>
  );
}

