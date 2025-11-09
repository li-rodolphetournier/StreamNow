import { Metadata } from "next";
import { HomeMediaExplorer } from "@/components/home/HomeMediaExplorer";
import { HomeMediaUploader } from "@/components/home/HomeMediaUploader";

export const metadata: Metadata = {
  title: "Bibliothèque locale | StreamNow Home",
};

export default function HomeMediaPage() {
  return (
    <div className="container mx-auto max-w-5xl space-y-8 px-4 py-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          Bibliothèque locale
        </h1>
        <p className="text-sm text-muted-foreground">
          Parcourez les fichiers hébergés sur votre serveur personnel StreamNow
          Home. Les catégories correspondent à la structure de dossiers de votre
          disque.
        </p>
      </header>
      <HomeMediaUploader />
      <HomeMediaExplorer />
    </div>
  );
}

