"use client";

import { VideoCarousel } from "@/components/video/VideoCarousel";
import { VideoCarouselSkeleton } from "@/components/video/VideoCarouselSkeleton";
import { HeroSection } from "@/components/shared/HeroSection";
import { Skeleton } from "@/components/shared/Skeleton";
import {
  useTrendingMovies,
  usePopularMovies,
  usePopularTVShows,
} from "@/hooks/useVideos";

export default function HomePage() {
  const { data: trendingMovies, isLoading: isLoadingTrending } =
    useTrendingMovies(1);
  const { data: popularMovies, isLoading: isLoadingPopular } =
    usePopularMovies(1);
  const { data: popularTVShows, isLoading: isLoadingTV } =
    usePopularTVShows(1);

  // Utiliser la première vidéo en tendance pour le hero
  const heroVideo = trendingMovies?.videos[0];

  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      {isLoadingTrending ? (
        <Skeleton className="h-[80vh] min-h-[600px] w-full" />
      ) : (
        heroVideo && <HeroSection video={heroVideo} />
      )}

      {/* Carrousels */}
      <div className="space-y-12 py-8">
        <div className="container mx-auto px-4 space-y-12">
          {/* Section Tendances (sans la première vidéo qui est dans le hero) */}
          {isLoadingTrending ? (
            <VideoCarouselSkeleton />
          ) : (
            trendingMovies?.videos &&
            trendingMovies.videos.length > 1 && (
              <VideoCarousel
                videos={trendingMovies.videos.slice(1)}
                title="En tendance"
                priority
              />
            )
          )}

          {/* Section Films populaires */}
          {isLoadingPopular ? (
            <VideoCarouselSkeleton />
          ) : (
            popularMovies?.videos && (
              <VideoCarousel
                videos={popularMovies.videos}
                title="Films populaires"
              />
            )
          )}

          {/* Section Séries populaires */}
          {isLoadingTV ? (
            <VideoCarouselSkeleton />
          ) : (
            popularTVShows?.videos && (
              <VideoCarousel
                videos={popularTVShows.videos}
                title="Séries populaires"
              />
            )
          )}
        </div>
      </div>
    </main>
  );
}
