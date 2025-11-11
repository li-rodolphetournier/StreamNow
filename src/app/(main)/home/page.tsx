import { Suspense } from "react";
import type { Metadata } from "next";
import HomeMediaClient from "./client";
import { HomeMediaFallback } from "./skeleton";

export const metadata: Metadata = {
  title: "Bibliothèque locale | StreamNow Home",
};

export default async function HomeMediaPage() {
  return (
    <Suspense fallback={<HomeMediaFallback />}>
      <HomeMediaClient />
    </Suspense>
  );
}

