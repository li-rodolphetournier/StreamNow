"use client";

import { Skeleton } from "@/components/shared/Skeleton";

export function SignUpFallback() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md space-y-6 rounded-lg border bg-card p-8 shadow-sm">
          <div className="space-y-2 text-center">
            <Skeleton className="mx-auto h-7 w-36" />
            <Skeleton className="mx-auto h-4 w-3/4" />
          </div>
          <div className="space-y-5">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
          <Skeleton className="h-4 w-full" />
        </div>
      </div>
    </div>
  );
}


