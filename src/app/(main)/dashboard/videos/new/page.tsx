"use server";

import { Suspense } from "react";
import { AddVideoClient } from "./client";
import { AddVideoFallback } from "./skeleton";

export default async function AddVideoPage() {
  return (
    <Suspense fallback={<AddVideoFallback />}>
      <AddVideoClient />
    </Suspense>
  );
}

