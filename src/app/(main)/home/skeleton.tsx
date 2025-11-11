"use client";

import { Skeleton } from "@/components/shared/Skeleton";

export function HomeMediaFallback() {
  return (
    <div className="container mx-auto max-w-5xl space-y-6 px-4 py-10">
      <div className="space-y-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-80 w-full" />
    </div>
  );
}
