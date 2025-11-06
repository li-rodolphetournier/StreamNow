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
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2">
          <span className="text-2xl font-bold">StreamNow</span>
        </Link>

        {/* Navigation */}
        <nav className="hidden md:flex items-center space-x-6">
          <Link
            href="/"
            className={cn(
              "text-sm font-medium transition-colors hover:text-primary",
              pathname === "/" && "text-primary"
            )}
          >
            Accueil
          </Link>
          <Link
            href="/search"
            className={cn(
              "text-sm font-medium transition-colors hover:text-primary",
              pathname === "/search" && "text-primary"
            )}
          >
            Recherche
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
        <div className="flex items-center gap-2 md:hidden">
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

