"use client";

import { cn } from "@/lib/utils";

interface SkipLinkProps {
  targetId?: string;
}

export function SkipLink({ targetId = "main-content" }: SkipLinkProps) {
  return (
    <a
      href={`#${targetId}`}
      className={cn(
        "skip-to-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      )}
    >
      Aller au contenu principal
    </a>
  );
}

