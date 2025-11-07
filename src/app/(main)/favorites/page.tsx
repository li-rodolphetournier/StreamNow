"use client";

import { Suspense } from "react";
import { useFavorites } from "@/hooks/useFavorites";
import { VideoGrid } from "@/components/video/VideoGrid";
import { Button } from "@/components/ui/button";

function FavoritesContent() {
  const { favorites, favoritesByMediaType, clear } = useFavorites();

  if (favorites.length === 0) {
    return (
      <div className="text-center py-16 space-y-4">
        <h2 className="text-2xl font-bold">Aucun favori pour le moment</h2>
        <p className="text-muted-foreground">
          Ajoutez des films et séries à votre liste pour les retrouver ici.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Mes favoris</h1>
          <p className="text-muted-foreground">
            {favorites.length} titre{favorites.length > 1 ? "s" : ""}
          </p>
        </div>
        <Button variant="ghost" onClick={clear}>
          Effacer tous les favoris
        </Button>
      </div>

      {favoritesByMediaType.movies.length > 0 && (
        <VideoGrid
          videos={favoritesByMediaType.movies}
          title="Films"
          priority
        />
      )}

      {favoritesByMediaType.series.length > 0 && (
        <VideoGrid
          videos={favoritesByMediaType.series}
          title="Séries"
        />
      )}
    </div>
  );
}

export default function FavoritesPage() {
  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <Suspense fallback={<div>Chargement...</div>}>
          <FavoritesContent />
        </Suspense>
      </div>
    </div>
  );
}


