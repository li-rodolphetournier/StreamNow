"use client";

import { Skeleton } from "@/components/shared/Skeleton";

export function AddVideoFallback() {
  return (
    <div className="container mx-auto space-y-6 px-4 py-8">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-10 w-72" />
      <Skeleton className="h-60 w-full" />
      <Skeleton className="h-60 w-full" />
    </div>
  );
}


