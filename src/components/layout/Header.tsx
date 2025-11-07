"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchBar } from "@/components/search/SearchBar";
import { cn } from "@/lib/utils";

function SearchBarWrapper() {
  return <SearchBar />;
}

export function Header() {
  const pathname = usePathname();
  const isSearchPage = pathname === "/search";

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60" role="banner">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2" aria-label="Accueil StreamNow">
          <span className="text-2xl font-bold">StreamNow</span>
        </Link>

        {/* Navigation */}
        <nav className="hidden md:flex items-center space-x-6" aria-label="Navigation principale">
          <Link
            href="/"
            className={cn(
              "text-sm font-medium transition-colors hover:text-primary",
              pathname === "/" && "text-primary"
            )}
            aria-current={pathname === "/" ? "page" : undefined}
          >
            Accueil
          </Link>
          <Link
            href="/search"
            className={cn(
              "text-sm font-medium transition-colors hover:text-primary",
              pathname === "/search" && "text-primary"
            )}
            aria-current={pathname === "/search" ? "page" : undefined}
          >
            Recherche
          </Link>
          <Link
            href="/favorites"
            className={cn(
              "text-sm font-medium transition-colors hover:text-primary",
              pathname === "/favorites" && "text-primary"
            )}
            aria-current={pathname === "/favorites" ? "page" : undefined}
          >
            Favoris
          </Link>
        </nav>

        {/* Search Bar */}
        <div className="flex-1 max-w-md mx-4 hidden md:block">
          {!isSearchPage && (
            <Suspense fallback={<div className="h-10 w-full bg-muted animate-pulse rounded" />}>
              <SearchBarWrapper />
            </Suspense>
          )}
        </div>

        {/* Mobile Search Button */}
        <div className="flex items-center gap-2 md:hidden" aria-label="Navigation mobile">
          <Link href="/favorites">
            <Button variant="ghost" size="icon" aria-label="Favoris">
              <span className="sr-only">Favoris</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-5 w-5"
              >
                <path d="M11.645 20.91a.75.75 0 0 0 .71 0c1.17-.659 4.454-2.711 6.74-5.708C21.39 12.819 22.5 10.35 22.5 8.25 22.5 5.322 20.295 3 17.625 3 15.914 3 14.331 3.879 13.32 5.348 12.31 3.879 10.726 3 9.015 3 6.345 3 4.14 5.322 4.14 8.25c0 2.1 1.11 4.569 3.405 6.952 2.286 2.997 5.57 5.05 6.74 5.708Z" />
              </svg>
            </Button>
          </Link>
          <Link href="/search">
            <Button variant="ghost" size="icon" aria-label="Rechercher">
              <Search className="h-5 w-5" />
            </Button>
          </Link>
          <Button variant="ghost" size="icon" aria-label="Menu">
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}

