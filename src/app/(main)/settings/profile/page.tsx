"use server";

import { Suspense } from "react";
import { ProfileSettingsClient } from "./client";
import { ProfileSettingsFallback } from "./skeleton";

export default async function ProfileSettingsPage() {
  return (
    <Suspense fallback={<ProfileSettingsFallback />}>
      <ProfileSettingsClient />
    </Suspense>
  );
}


