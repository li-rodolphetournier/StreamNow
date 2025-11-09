"use client";

import { useQuery } from "@tanstack/react-query";
import {
  fetchHomeMediaLibrary,
  isHomeServerEnabled,
} from "@/lib/api/home";

export function useHomeMediaLibrary(enabledOverride?: boolean) {
  const isEnabled = isHomeServerEnabled && (enabledOverride ?? true);

  return useQuery({
    queryKey: ["home-media-library"],
    queryFn: fetchHomeMediaLibrary,
    enabled: isEnabled,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });
}

