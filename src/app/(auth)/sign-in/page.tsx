"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSignIn } from "@/hooks/useSignIn";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { buildOAuthUrl } from "@/lib/auth/oauth";

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams?.get("redirect") ?? "/dashboard/videos";
  const { data: currentUser } = useCurrentUser();

  useEffect(() => {
    if (currentUser) {
      router.replace(redirect);
    }
  }, [currentUser, redirect, router]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const { mutate: signIn, isPending } = useSignIn();

  const handleOAuthRedirect = (provider: "google" | "facebook") => {
    const url = buildOAuthUrl(provider, redirect);
    if (!url) {
      setFormError("Configuration OAuth manquante.");
      return;
    }
    window.location.href = url;
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    signIn(
      { email, password },
      {
        onSuccess: () => {
          router.replace(redirect);
        },
        onError: (error) => {
          setFormError(error.message);
        },
      }
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md space-y-6 rounded-lg border bg-card p-8 shadow-sm">
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-semibold">Connexion</h1>
            <p className="text-sm text-muted-foreground">
              Accédez à votre dashboard et gérez vos vidéos personnalisées.
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="email">Adresse e-mail</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={8}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "Connexion..." : "Se connecter"}
            </Button>

            {formError && (
              <p className="text-sm text-destructive" role="alert">
                {formError}
              </p>
            )}
          </form>

          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground uppercase">Ou</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <div className="space-y-3">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => handleOAuthRedirect("google")}
            >
              Continuer avec Google
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => handleOAuthRedirect("facebook")}
            >
              Continuer avec Facebook
            </Button>
          </div>

          <div className="text-center text-sm text-muted-foreground">
            Pas encore de compte ?{" "}
            <Link
              href={`/sign-up?redirect=${encodeURIComponent(redirect)}`}
              className="text-primary hover:underline"
            >
              Inscrivez-vous
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
