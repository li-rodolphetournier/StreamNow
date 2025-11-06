import { useState, useEffect, useRef, useCallback } from "react";
import { useVideoStore } from "@/lib/store/useVideoStore";
import type { Video } from "@/types/video";

interface UseVideoPlayerProps {
  video: Video;
  videoUrl: string | null;
  autoPlay?: boolean;
}

export function useVideoPlayer({
  video,
  videoUrl,
  autoPlay = false,
}: UseVideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [played, setPlayed] = useState(0);
  const [playedSeconds, setPlayedSeconds] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const playerRef = useRef<any>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { getWatchProgress, addToWatchHistory } = useVideoStore();

  // Récupérer la progression sauvegardée
  useEffect(() => {
    const savedProgress = getWatchProgress(video.id);
    if (savedProgress && savedProgress > 0) {
      setPlayed(savedProgress / 100);
    }
  }, [video.id, getWatchProgress]);

  // Sauvegarder la progression
  const saveProgress = useCallback(() => {
    if (duration > 0 && playedSeconds > 5) {
      const progress = (playedSeconds / duration) * 100;
      addToWatchHistory(video, Math.round(progress));
    }
  }, [video, playedSeconds, duration, addToWatchHistory]);

  // Sauvegarder toutes les 10 secondes
  useEffect(() => {
    if (playedSeconds > 0 && playedSeconds % 10 === 0) {
      saveProgress();
    }
  }, [playedSeconds, saveProgress]);

  // Sauvegarder à la fermeture
  useEffect(() => {
    return () => {
      saveProgress();
    };
  }, [saveProgress]);

  // Gestion des contrôles (masquer après 3 secondes d'inactivité)
  const resetControlsTimeout = useCallback(() => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    setShowControls(true);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3000);
  }, [isPlaying]);

  useEffect(() => {
    resetControlsTimeout();
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [resetControlsTimeout]);

  // Navigation clavier
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!videoUrl) return;

      switch (e.key) {
        case " ":
          e.preventDefault();
          setIsPlaying((prev) => !prev);
          resetControlsTimeout();
          break;
        case "ArrowLeft":
          e.preventDefault();
          if (playerRef.current) {
            const newTime = Math.max(0, playedSeconds - 10);
            playerRef.current.seekTo(newTime);
            resetControlsTimeout();
          }
          break;
        case "ArrowRight":
          e.preventDefault();
          if (playerRef.current) {
            const newTime = Math.min(duration, playedSeconds + 10);
            playerRef.current.seekTo(newTime);
            resetControlsTimeout();
          }
          break;
        case "ArrowUp":
          e.preventDefault();
          setVolume((prev) => Math.min(1, prev + 0.1));
          resetControlsTimeout();
          break;
        case "ArrowDown":
          e.preventDefault();
          setVolume((prev) => Math.max(0, prev - 0.1));
          resetControlsTimeout();
          break;
        case "f":
        case "F":
          e.preventDefault();
          toggleFullscreen();
          resetControlsTimeout();
          break;
        case "m":
        case "M":
          e.preventDefault();
          setIsMuted((prev) => !prev);
          resetControlsTimeout();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [videoUrl, playedSeconds, duration, resetControlsTimeout]);

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  return {
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
  };
}

