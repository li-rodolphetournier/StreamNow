import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/shared/Providers";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { SkipLink } from "@/components/shared/SkipLink";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "StreamNow — Plateforme VOD",
  description: "Plateforme VOD moderne inspirée de Netflix / TF1+",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          <SkipLink targetId="main-content" />
          <Header />
          <main
            id="main-content"
            tabIndex={-1}
            className="min-h-screen focus:outline-none"
          >
            {children}
          </main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
