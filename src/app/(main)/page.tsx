"use client";

import { VideoCarousel } from "@/components/video/VideoCarousel";
import { VideoCarouselSkeleton } from "@/components/video/VideoCarouselSkeleton";
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

  return (
    <main className="min-h-screen space-y-8 pb-8">
      <div className="container mx-auto px-4 space-y-12">
        {/* Section Tendances */}
        {isLoadingTrending ? (
          <VideoCarouselSkeleton />
        ) : (
          trendingMovies?.videos && (
            <VideoCarousel
              videos={trendingMovies.videos}
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
    </main>
  );
}
