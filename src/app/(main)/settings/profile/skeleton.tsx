"use client";

import { Skeleton } from "@/components/shared/Skeleton";

export function ProfileSettingsFallback() {
  return (
    <div className="container mx-auto space-y-6 px-4 py-8">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-80 w-full" />
    </div>
  );
}
