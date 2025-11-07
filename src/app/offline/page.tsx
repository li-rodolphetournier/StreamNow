"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function OfflinePage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Vous êtes hors ligne</h1>
        <p className="text-muted-foreground max-w-lg">
          StreamNow n&apos;est pas disponible sans connexion internet. Les pages
          récemment consultées restent accessibles si elles ont été mises en
          cache. Reconnectez-vous pour retrouver tout le catalogue.
        </p>
      </div>
      <Button asChild>
        <Link href="/">Retour à l&apos;accueil</Link>
      </Button>
    </div>
  );
}

