import { VideoPageContent } from "@/components/video/VideoPageContent";
import { notFound } from "next/navigation";

interface VideoPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ type?: string }>;
}

export default async function VideoPage({
  params,
  searchParams,
}: VideoPageProps) {
  const { id } = await params;
  const { type } = await searchParams;

  const videoId = parseInt(id, 10);
  if (isNaN(videoId)) {
    notFound();
  }

  // Déterminer le type de média (par défaut: movie)
  // TODO: Améliorer la détection du type (peut-être via une API ou un paramètre)
  const mediaType: "movie" | "tv" = (type as "movie" | "tv") || "movie";

  return <VideoPageContent videoId={videoId} mediaType={mediaType} />;
}
