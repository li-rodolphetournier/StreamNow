"use client";
import { useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCurrentUser } from "@/hooks/useCurrentUser";

interface Options {
  redirectTo?: string;
  enabled?: boolean;
}

export function useRequireAuth(options: Options = {}) {
  const { redirectTo, enabled = true } = options;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: user, isLoading } = useCurrentUser();

  useEffect(() => {
    if (!enabled || isLoading) {
      return;
    }

    if (!user) {
      const next = redirectTo ?? `${pathname}${searchParams?.toString() ? `?${searchParams.toString()}` : ""}`;
      router.replace(`/sign-in?redirect=${encodeURIComponent(next)}`);
    }
  }, [enabled, isLoading, user, router, pathname, searchParams, redirectTo]);

  return { user, isLoading };
}
