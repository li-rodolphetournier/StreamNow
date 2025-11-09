"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchHomeMediaLibrary, isHomeServerEnabled } from "@/lib/api/home";

export function useHomeMediaLibrary(
  userId: string | null,
  enabledOverride?: boolean
) {
  const isEnabled =
    isHomeServerEnabled && Boolean(userId) && (enabledOverride ?? true);

  return useQuery({
    queryKey: ["home-media-library", userId],
    queryFn: () => fetchHomeMediaLibrary(userId!),
    enabled: isEnabled,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });
}

