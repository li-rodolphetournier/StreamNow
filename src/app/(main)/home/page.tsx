import { Metadata } from "next";
import HomeMediaClient from "./client";

export const metadata: Metadata = {
  title: "Bibliothèque locale | StreamNow Home",
};

export default function HomeMediaPage() {
  return <HomeMediaClient />;
}

