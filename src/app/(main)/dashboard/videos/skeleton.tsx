"use client";

import { Skeleton } from "@/components/shared/Skeleton";

export function DashboardVideosFallback() {
  return (
    <div className="container mx-auto px-4 py-8">
      <Skeleton className="mb-4 h-8 w-48" />
      <div className="space-y-4 rounded-lg border bg-card p-4 shadow-sm">
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    </div>
  );
}


