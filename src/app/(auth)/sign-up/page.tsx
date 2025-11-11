"use server";

import { Suspense } from "react";
import { SignUpClient } from "./client";
import { SignUpFallback } from "./skeleton";

export default async function SignUpPage() {
  return (
    <Suspense fallback={<SignUpFallback />}>
      <SignUpClient />
    </Suspense>
  );
}
