"use server";

import { Suspense } from "react";
import { FriendsClient } from "./client";
import { FriendsFallback } from "./skeleton";

export default async function FriendsPage() {
  return (
    <Suspense fallback={<FriendsFallback />}>
      <FriendsClient />
    </Suspense>
  );
}


