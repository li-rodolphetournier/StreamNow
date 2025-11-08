"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { validateState } from "@/lib/auth/oauth";
import { consumeRedirectAfterState } from "@/lib/auth/oauth";
import { useOAuthSignIn } from "@/hooks/useOAuthSignIn";

const PROVIDER_MAP: Record<string, "GOOGLE" | "FACEBOOK"> = {
  google: "GOOGLE",
  facebook: "FACEBOOK",
};

export default function OAuthCallbackPage() {
  const router = useRouter();
  const params = useParams<{ provider: string }>();
  const searchParams = useSearchParams();
  const { mutate: oauthSignIn, isPending } = useOAuthSignIn();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const providerParam = params.provider?.toLowerCase();
    const mappedProvider = providerParam ? PROVIDER_MAP[providerParam] : undefined;
    const code = searchParams?.get("code");
    const state = searchParams?.get("state");
    const fallbackRedirect = searchParams?.get("redirect") ?? "/dashboard/videos";

    if (!mappedProvider || !code) {
      setError("Paramètres OAuth invalides.");
      return;
    }

    if (!validateState(state)) {
      setError("La vérification de sécurité a échoué. Veuillez réessayer.");
      return;
    }

    const storedRedirect = consumeRedirectAfterState();
    const redirectTarget = storedRedirect ?? fallbackRedirect;

    oauthSignIn(
      {
        provider: mappedProvider,
        code,
        redirectUri: process.env.NEXT_PUBLIC_OAUTH_REDIRECT_URI
          ? `${process.env.NEXT_PUBLIC_OAUTH_REDIRECT_URI.replace(/\/$/, "")}/${providerParam}`
          : undefined,
      },
      {
        onSuccess: () => {
          router.replace(redirectTarget);
        },
        onError: (mutationError) => {
          setError(mutationError.message);
        },
      }
    );
  }, [oauthSignIn, params.provider, router, searchParams]);

  if (isPending && !error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin" />
          <p className="text-sm text-muted-foreground">Connexion en cours...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-full max-w-md space-y-4 rounded-lg border bg-card p-6 text-center">
          <h1 className="text-xl font-semibold">Échec de la connexion</h1>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button onClick={() => router.push("/sign-in")}>Retour à la connexion</Button>
        </div>
      </div>
    );
  }

  return null;
}
