"use client";

import { Skeleton } from "@/components/shared/Skeleton";
import { HomeMediaExplorer } from "@/components/home/HomeMediaExplorer";
import { HomeMediaUploader } from "@/components/home/HomeMediaUploader";
import { useRequireAuth } from "@/hooks/useRequireAuth";

export default function HomeMediaClient() {
  const { user, isLoading } = useRequireAuth({ redirectTo: "/home" });

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

  const ownerId = process.env.NEXT_PUBLIC_HOME_SERVER_OWNER_ID;
  const isOwner = !ownerId || ownerId === user.id;

  return (
    <div className="container mx-auto max-w-5xl space-y-8 px-4 py-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          Bibliothèque locale
        </h1>
        <p className="text-sm text-muted-foreground">
          Parcourez les fichiers hébergés sur votre serveur personnel StreamNow
          Home. Les catégories correspondent à la structure de dossiers de votre
          disque.
        </p>
      </header>
      <HomeMediaUploader userId={user.id} isOwner={isOwner} />
      <HomeMediaExplorer userId={user.id} isOwner={isOwner} />
    </div>
  );
}

