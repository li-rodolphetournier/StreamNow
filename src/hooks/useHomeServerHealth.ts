"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchHomeHealth, isHomeServerEnabled } from "@/lib/api/home";

export function useHomeServerHealth() {
  const enabled = isHomeServerEnabled;

  const query = useQuery({
    queryKey: ["home-server-health"],
    queryFn: fetchHomeHealth,
    enabled,
    refetchInterval: enabled ? 60_000 : false,
  });

  return {
    ...query,
    enabled,
  };
}


