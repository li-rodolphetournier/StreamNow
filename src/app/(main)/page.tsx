import { ContinueWatchingCarousel } from "@/components/video/ContinueWatchingCarousel";
import { HeroSection } from "@/components/shared/HeroSection";
import { VideoCarousel } from "@/components/video/VideoCarousel";
import { Skeleton } from "@/components/shared/Skeleton";
import { getHomePageData } from "@/lib/server/tmdb-cache";

export default async function HomePage() {
  const { trendingMovies, popularMovies, popularTVShows } =
    await getHomePageData();

  const heroVideo = trendingMovies?.videos?.[0] ?? null;
  const trendingCarouselVideos =
    trendingMovies?.videos?.slice(heroVideo ? 1 : 0) ?? [];
  const popularMovieVideos = popularMovies?.videos ?? [];
  const popularTvVideos = popularTVShows?.videos ?? [];

  return (
    <main className="min-h-screen">
      {heroVideo ? (
        <HeroSection video={heroVideo} />
      ) : (
        <Skeleton className="h-[80vh] min-h-[600px] w-full" />
      )}

      <div className="container mx-auto px-4">
        <ContinueWatchingCarousel />
      </div>

      <div className="space-y-12 py-8">
        <div className="container mx-auto space-y-12 px-4">
          {trendingCarouselVideos.length > 0 ? (
            <VideoCarousel
              videos={trendingCarouselVideos}
              title="En tendance"
              priority
            />
          ) : null}

          {popularMovieVideos.length > 0 ? (
            <VideoCarousel videos={popularMovieVideos} title="Films populaires" />
          ) : null}

          {popularTvVideos.length > 0 ? (
            <VideoCarousel videos={popularTvVideos} title="Séries populaires" />
          ) : null}
        </div>
      </div>
    </main>
  );
}
