"use client";

import Image from "next/image";
import { getImageUrl } from "@/lib/api/tmdb";
import type { VideoDetails } from "@/types/video";

interface VideoDetailsProps {
  video: VideoDetails;
}

export function VideoDetails({ video }: VideoDetailsProps) {
  const year = video.releaseDate
    ? new Date(video.releaseDate).getFullYear()
    : null;

  return (
    <section className="container mx-auto px-4 py-8">
      <div className="grid gap-8 md:grid-cols-3">
        {/* Colonne principale */}
        <div className="md:col-span-2 space-y-6">
          <div>
            <h2 className="text-2xl font-bold mb-4">Synopsis</h2>
            <p className="text-muted-foreground leading-relaxed">
              {video.overview || "Aucune description disponible."}
            </p>
          </div>

          {/* Cast */}
          {video.cast.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold mb-4">Casting</h2>
              <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-4">
                {video.cast.slice(0, 10).map((actor) => (
                  <div
                    key={actor.id}
                    className="flex-shrink-0 w-32 text-center"
                  >
                    <div className="relative aspect-[2/3] w-full overflow-hidden rounded-lg bg-muted mb-2">
                      {actor.profilePath ? (
                        <Image
                          src={getImageUrl(actor.profilePath, "w300")}
                          alt={actor.name}
                          fill
                          className="object-cover"
                          sizes="128px"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-muted-foreground">
                          <span className="text-xs">Photo</span>
                        </div>
                      )}
                    </div>
                    <p className="text-sm font-medium truncate">{actor.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {actor.character}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Production */}
          {video.productionCompanies.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold mb-4">Production</h2>
              <div className="flex flex-wrap gap-4">
                {video.productionCompanies.map((company) => (
                  <div
                    key={company.id}
                    className="flex items-center gap-2 rounded-lg border p-3"
                  >
                    {company.logoPath ? (
                      <Image
                        src={getImageUrl(company.logoPath, "w200")}
                        alt={company.name}
                        width={60}
                        height={30}
                        className="object-contain"
                      />
                    ) : (
                      <span className="text-sm font-medium">
                        {company.name}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Infos */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Informations</h3>
            <div className="space-y-2 text-sm">
              {year && (
                <div>
                  <span className="font-medium">Année :</span>{" "}
                  <span className="text-muted-foreground">{year}</span>
                </div>
              )}
              {video.runtime && (
                <div>
                  <span className="font-medium">Durée :</span>{" "}
                  <span className="text-muted-foreground">
                    {Math.floor(video.runtime / 60)}h{video.runtime % 60}min
                  </span>
                </div>
              )}
              {video.seasons && (
                <div>
                  <span className="font-medium">Saisons :</span>{" "}
                  <span className="text-muted-foreground">
                    {video.seasons}
                  </span>
                </div>
              )}
              {video.episodes && (
                <div>
                  <span className="font-medium">Épisodes :</span>{" "}
                  <span className="text-muted-foreground">
                    {video.episodes}
                  </span>
                </div>
              )}
              {video.genres.length > 0 && (
                <div>
                  <span className="font-medium">Genres :</span>{" "}
                  <span className="text-muted-foreground">
                    {video.genres.map((g) => g.name).join(", ")}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Réalisateur / Créateur */}
          {video.crew.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3">Équipe</h3>
              <div className="space-y-2 text-sm">
                {video.crew
                  .filter((member) => member.job === "Director")
                  .map((director) => (
                    <div key={director.id}>
                      <span className="font-medium">Réalisateur :</span>{" "}
                      <span className="text-muted-foreground">
                        {director.name}
                      </span>
                    </div>
                  ))}
                {video.crew
                  .filter((member) => member.job === "Creator")
                  .map((creator) => (
                    <div key={creator.id}>
                      <span className="font-medium">Créateur :</span>{" "}
                      <span className="text-muted-foreground">
                        {creator.name}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

