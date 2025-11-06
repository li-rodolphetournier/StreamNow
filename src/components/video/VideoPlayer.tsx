"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useVideoPlayer } from "@/hooks/useVideoPlayer";
import { useQuery } from "@tanstack/react-query";
import { getMovieVideos, getTVShowVideos } from "@/lib/api/tmdb";
import type { Video } from "@/types/video";
import { cn } from "@/lib/utils";

// Lazy load React Player (lourd)
const ReactPlayer = dynamic(() => import("react-player"), { ssr: false });

interface VideoPlayerProps {
  video: Video;
  autoPlay?: boolean;
  onClose?: () => void;
}

export function VideoPlayer({
  video,
  autoPlay = false,
  onClose,
}: VideoPlayerProps) {
  const [mounted, setMounted] = useState(false);

  // Récupérer l'URL de la vidéo (trailer YouTube)
  const { data: videoUrl, isLoading: isLoadingVideo } = useQuery({
    queryKey: ["video-url", video.id, video.mediaType],
    queryFn: () =>
      video.mediaType === "movie"
        ? getMovieVideos(video.id)
        : getTVShowVideos(video.id),
    enabled: !!video.id,
  });

  const {
    isPlaying,
    setIsPlaying,
    volume,
    setVolume,
    isMuted,
    setIsMuted,
    played,
    setPlayed,
    playedSeconds,
    setPlayedSeconds,
    duration,
    setDuration,
    isFullscreen,
    toggleFullscreen,
    showControls,
    setShowControls,
    resetControlsTimeout,
    playerRef,
  } = useVideoPlayer({ video, videoUrl: videoUrl || null, autoPlay });

  useEffect(() => {
    setMounted(true);
  }, []);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    }
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const handleProgress = (state: { played: number; playedSeconds: number }) => {
    setPlayed(state.played);
    setPlayedSeconds(state.playedSeconds);
    resetControlsTimeout();
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    setPlayed(newValue);
    if (playerRef.current) {
      playerRef.current.seekTo(newValue);
    }
    resetControlsTimeout();
  };

  if (!mounted || isLoadingVideo) {
    return (
      <div className="relative aspect-video w-full bg-black flex items-center justify-center">
        <p className="text-white">Chargement de la vidéo...</p>
      </div>
    );
  }

  if (!videoUrl) {
    return (
      <div className="relative aspect-video w-full bg-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-white">Aucune vidéo disponible</p>
          {onClose && (
            <Button onClick={onClose} variant="secondary">
              Fermer
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative w-full bg-black group",
        isFullscreen ? "fixed inset-0 z-50" : "aspect-video"
      )}
      onMouseMove={resetControlsTimeout}
      onMouseLeave={() => {
        if (isPlaying) {
          setShowControls(false);
        }
      }}
    >
      {/* Player */}
      <div className="relative w-full h-full">
        <ReactPlayer
          ref={playerRef}
          url={videoUrl}
          playing={isPlaying}
          volume={volume}
          muted={isMuted}
          width="100%"
          height="100%"
          onProgress={handleProgress}
          onDuration={setDuration}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
          config={{
            youtube: {
              playerVars: {
                autoplay: autoPlay ? 1 : 0,
                controls: 0,
                modestbranding: 1,
                rel: 0,
              },
            },
          }}
        />
      </div>

      {/* Contrôles overlay */}
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent",
          "flex flex-col justify-end transition-opacity duration-300",
          showControls ? "opacity-100" : "opacity-0"
        )}
      >
        {/* Barre de progression */}
        <div className="px-4 pb-2">
          <input
            type="range"
            min={0}
            max={1}
            step={0.001}
            value={played}
            onChange={handleSeekChange}
            className="w-full h-1 bg-white/30 rounded-lg appearance-none cursor-pointer slider"
            style={{
              background: `linear-gradient(to right, #ef4444 0%, #ef4444 ${played * 100}%, rgba(255,255,255,0.3) ${played * 100}%, rgba(255,255,255,0.3) 100%)`,
            }}
            aria-label="Barre de progression"
          />
        </div>

        {/* Contrôles principaux */}
        <div className="flex items-center justify-between px-4 pb-4 gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsPlaying(!isPlaying)}
              aria-label={isPlaying ? "Pause" : "Lecture"}
              className="text-white hover:bg-white/20"
            >
              {isPlaying ? (
                <Pause className="h-6 w-6 fill-current" />
              ) : (
                <Play className="h-6 w-6 fill-current" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMuted(!isMuted)}
              aria-label={isMuted ? "Activer le son" : "Couper le son"}
              className="text-white hover:bg-white/20"
            >
              {isMuted ? (
                <VolumeX className="h-5 w-5" />
              ) : (
                <Volume2 className="h-5 w-5" />
              )}
            </Button>

            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={isMuted ? 0 : volume}
              onChange={(e) => {
                setVolume(parseFloat(e.target.value));
                setIsMuted(parseFloat(e.target.value) === 0);
              }}
              className="w-24 h-1 bg-white/30 rounded-lg appearance-none cursor-pointer"
              aria-label="Volume"
            />

            <span className="text-white text-sm min-w-[80px]">
              {formatTime(playedSeconds)} / {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? "Quitter le plein écran" : "Plein écran"}
              className="text-white hover:bg-white/20"
            >
              {isFullscreen ? (
                <Minimize className="h-5 w-5" />
              ) : (
                <Maximize className="h-5 w-5" />
              )}
            </Button>

            {onClose && (
              <Button
                variant="ghost"
                onClick={onClose}
                className="text-white hover:bg-white/20"
              >
                Fermer
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Raccourcis clavier info (affiché brièvement) */}
      {showControls && (
        <div className="absolute top-4 right-4 bg-black/70 text-white text-xs p-2 rounded opacity-0 group-hover:opacity-100 transition-opacity">
          <p>Espace: Play/Pause</p>
          <p>← →: Avancer/Reculer 10s</p>
          <p>↑ ↓: Volume</p>
          <p>F: Plein écran</p>
          <p>M: Mute</p>
        </div>
      )}
    </div>
  );
}

