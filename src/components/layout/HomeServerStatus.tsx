"use client";

import { useMemo } from "react";
import { useHomeServerHealth } from "@/hooks/useHomeServerHealth";
import { cn } from "@/lib/utils";

const statusClasses: Record<string, string> = {
  ok: "bg-emerald-500/20 text-emerald-600 border border-emerald-500/30",
  error: "bg-destructive/10 text-destructive border border-destructive/30",
  loading: "bg-amber-100 text-amber-700 border border-amber-300",
  disabled: "bg-muted text-muted-foreground border border-muted",
};

export function HomeServerStatus() {
  const { data, isLoading, isError, enabled } = useHomeServerHealth();

  const { label, status } = useMemo(() => {
    if (!enabled) {
      return { label: "Offline", status: "disabled" };
    }
    if (isLoading) {
      return { label: "Connexion…", status: "loading" };
    }
    if (isError || !data) {
      return { label: "Hors ligne", status: "error" };
    }
    return { label: "Home connecté", status: data.status?.toLowerCase() ?? "ok" };
  }, [data, isError, isLoading, enabled]);

  if (!enabled) {
    return null;
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium transition-colors",
        statusClasses[status] ?? statusClasses.error
      )}
      title={
        data
          ? `Uptime: ${Math.round(data.uptime)}s — Dossier média: ${data.mediaRoot ?? "N/A"}`
          : undefined
      }
    >
      <span
        className={cn(
          "block h-2 w-2 rounded-full",
          status === "ok"
            ? "bg-emerald-500"
            : status === "loading"
              ? "bg-amber-500"
              : "bg-destructive"
        )}
      />
      {label}
    </span>
  );
}


