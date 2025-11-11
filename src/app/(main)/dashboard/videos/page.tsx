"use server";

import { Suspense } from "react";
import { DashboardVideosClient } from "./client";
import { DashboardVideosFallback } from "./skeleton";

export default async function DashboardVideosPage() {
  return (
    <Suspense fallback={<DashboardVideosFallback />}>
      <DashboardVideosClient />
    </Suspense>
  );
}

