"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { HardDrive, Search, Menu, LogOut } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { SearchBar } from "@/components/search/SearchBar";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useSignOut } from "@/hooks/useSignOut";
import { HomeServerStatus } from "./HomeServerStatus";

function SearchBarWrapper() {
  return <SearchBar />;
}

function AuthControls({ mode = "desktop" }: { mode?: "desktop" | "mobile" }) {
  const router = useRouter();
  const { data: user, isLoading } = useCurrentUser();
  const { mutate: signOut, isPending } = useSignOut();

  if (isLoading) {
    return null;
  }

  if (!user) {
    if (mode === "mobile") {
      return (
        <Link href="/sign-in">
          <Button variant="ghost" size="icon" aria-label="Se connecter">
            <Menu className="h-5 w-5" />
          </Button>
        </Link>
      );
    }

    return (
      <Button asChild size="sm">
        <Link href="/sign-in">Se connecter</Link>
      </Button>
    );
  }

  if (mode === "mobile") {
    return (
      <Button
        variant="ghost"
        size="icon"
        aria-label="Se déconnecter"
        onClick={() =>
          signOut(undefined, {
            onSuccess: () => router.push("/"),
          })
        }
        disabled={isPending}
      >
        <LogOut className="h-5 w-5" />
      </Button>
    );
  }

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={() =>
        signOut(undefined, {
          onSuccess: () => router.push("/"),
        })
      }
      disabled={isPending}
    >
      <LogOut className="mr-2 h-4 w-4" />
      Déconnexion
    </Button>
  );
}

export function Header() {
  const pathname = usePathname();
  const isSearchPage = pathname === "/search";
  const { data: user } = useCurrentUser();
  const role = user?.role;
  const canAccessDashboard = role === "ADMIN" || role === "EDITOR";
  const avatarSrc = user?.avatarUrl ?? "https://placehold.co/128x128/png";
  const unoptimizedAvatar = avatarSrc.startsWith("http://localhost");

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60" role="banner">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center pr-6"
          aria-label="Accueil StreamNow"
        >
          <div className="relative h-40 w-[260px]">
            <Image
              src="/logo.jpg"
              alt="StreamNow"
              fill
              priority
              className="object-contain"
            />
          </div>
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
          <Link
            href="/home"
            className={cn(
              "text-sm font-medium transition-colors hover:text-primary",
              pathname === "/home" && "text-primary"
            )}
            aria-current={pathname === "/home" ? "page" : undefined}
          >
            Bibliothèque locale
          </Link>
          <Link
            href="/friends"
            className={cn(
              "text-sm font-medium transition-colors hover:text-primary",
              pathname === "/friends" && "text-primary"
            )}
            aria-current={pathname === "/friends" ? "page" : undefined}
          >
            Amis
          </Link>
          {canAccessDashboard && (
            <Link
              href="/dashboard/videos"
              className={cn(
                "text-sm font-medium transition-colors hover:text-primary",
                pathname.startsWith("/dashboard") && "text-primary"
              )}
              aria-current={pathname.startsWith("/dashboard") ? "page" : undefined}
            >
              Dashboard
            </Link>
          )}
        </nav>

        {/* Search Bar & Auth */}
        <div className="flex flex-1 items-center justify-end gap-4">
          <div className="hidden md:block w-full max-w-md">
            {!isSearchPage && (
              <Suspense fallback={<div className="h-10 w-full bg-muted animate-pulse rounded" />}>
                <SearchBarWrapper />
              </Suspense>
            )}
          </div>
          <div className="hidden md:flex items-center gap-3">
            <HomeServerStatus />
            <ThemeToggle />
            {user ? (
              <Link
                href="/settings/profile"
                className="group flex items-center gap-2 rounded-md border px-3 py-2 hover:bg-muted transition-colors"
              >
                <div className="relative h-9 w-9 overflow-hidden rounded-full border">
                  <Image
                src={avatarSrc}
                    alt={user.nickname ?? user.email}
                    fill
                    className="object-cover"
                unoptimized={unoptimizedAvatar}
                  />
                </div>
                <div className="text-left leading-tight">
                  <p className="text-sm font-semibold group-hover:text-primary transition-colors">
                    {user.nickname ?? user.email}
                  </p>
                  <p className="text-xs text-muted-foreground">Mon profil</p>
                </div>
              </Link>
            ) : null}
            <AuthControls mode="desktop" />
          </div>
        </div>

        {/* Mobile Controls */}
        <div className="flex items-center gap-2 md:hidden" aria-label="Navigation mobile">
          <ThemeToggle />
          <Link href="/home">
            <Button variant="ghost" size="icon" aria-label="Bibliothèque locale">
              <span className="sr-only">Bibliothèque locale</span>
              <HardDrive className="h-5 w-5" />
            </Button>
          </Link>
          {user ? (
            <Link href="/settings/profile">
              <Button variant="ghost" size="icon" aria-label="Profil">
                <div className="relative h-8 w-8 overflow-hidden rounded-full border">
                  <Image
                    src={avatarSrc}
                    alt={user.nickname ?? user.email}
                    fill
                    className="object-cover"
                    unoptimized={unoptimizedAvatar}
                  />
                </div>
              </Button>
            </Link>
          ) : null}
          {canAccessDashboard && (
            <Link href="/dashboard/videos">
              <Button variant="ghost" size="icon" aria-label="Dashboard">
                <span className="sr-only">Dashboard</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-5 w-5"
                >
                  <rect x="3" y="3" width="7" height="9" rx="1" />
                  <rect x="14" y="3" width="7" height="5" rx="1" />
                  <rect x="14" y="12" width="7" height="9" rx="1" />
                  <rect x="3" y="16" width="7" height="5" rx="1" />
                </svg>
              </Button>
            </Link>
          )}
          <Link href="/search">
            <Button variant="ghost" size="icon" aria-label="Rechercher">
              <Search className="h-5 w-5" />
            </Button>
          </Link>
          <Link href="/friends">
            <Button variant="ghost" size="icon" aria-label="Amis">
              <span className="sr-only">Amis</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
              >
                <path d="M18 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="10" cy="7" r="4" />
                <path d="m22 21-2-2 2-2" />
                <path d="M19 17a3 3 0 0 1 3 3" />
              </svg>
            </Button>
          </Link>
          <AuthControls mode="mobile" />
        </div>
      </div>
    </header>
  );
}

