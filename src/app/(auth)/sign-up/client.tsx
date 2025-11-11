"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSignUp } from "@/hooks/useSignUp";
import { useCurrentUser } from "@/hooks/useCurrentUser";

export function SignUpClient() {
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
  const [nickname, setNickname] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const { mutate: signUp, isPending } = useSignUp();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    signUp(
      { email, password, nickname: nickname || undefined },
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
            <h1 className="text-2xl font-semibold">Créer un compte</h1>
            <p className="text-sm text-muted-foreground">
              Importez vos propres vidéos et organisez votre catalogue StreamNow.
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
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={8}
              />
              <p className="text-xs text-muted-foreground">
                Au moins 8 caractères, idéalement une majuscule, un chiffre et un symbole.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="nickname">Pseudo (optionnel)</Label>
              <Input
                id="nickname"
                value={nickname}
                onChange={(event) => setNickname(event.target.value)}
                placeholder="Mon super pseudo"
                maxLength={50}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "Création en cours..." : "Créer mon compte"}
            </Button>

            {formError && (
              <p className="text-sm text-destructive" role="alert">
                {formError}
              </p>
            )}
          </form>

          <div className="text-center text-sm text-muted-foreground">
            Déjà un compte ?{" "}
            <Link
              href={`/sign-in?redirect=${encodeURIComponent(redirect)}`}
              className="text-primary hover:underline"
            >
              Connectez-vous
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}


