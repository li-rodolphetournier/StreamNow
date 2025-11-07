import { VideoPageContent } from "@/components/video/VideoPageContent";
import { notFound } from "next/navigation";

interface VideoPageProps {
  params: { id: string };
  searchParams?: { type?: string; play?: string };
}

export default function VideoPage({
  params,
  searchParams,
}: VideoPageProps) {
  const { id } = params;
  const type = searchParams?.type;
  const play = searchParams?.play;

  const videoId = parseInt(id, 10);
  if (isNaN(videoId)) {
    notFound();
  }

  // Déterminer le type de média (par défaut: movie)
  // TODO: Améliorer la détection du type (peut-être via une API ou un paramètre)
  const mediaType: "movie" | "tv" = (type as "movie" | "tv") || "movie";
  const autoPlay = play === "true";

  return (
    <VideoPageContent
      videoId={videoId}
      mediaType={mediaType}
      autoPlay={autoPlay}
    />
  );
}
