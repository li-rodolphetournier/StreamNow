"use server";

import { Suspense } from "react";
import { SignInClient } from "./client";
import { SignInFallback } from "./skeleton";

export default async function SignInPage() {
  return (
    <Suspense fallback={<SignInFallback />}>
      <SignInClient />
    </Suspense>
  );
}
