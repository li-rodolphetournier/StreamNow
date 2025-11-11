"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useProfile, useUpdateProfile } from "@/hooks/useProfile";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/shared/Skeleton";
import { uploadVideoFile } from "@/lib/api/upload";
import { cn } from "@/lib/utils";

interface FormState {
  nickname: string;
  avatarUrl: string;
  bio: string;
}

export function ProfileSettingsClient() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useRequireAuth();
  const { data: profile, isLoading, isError, error } = useProfile();
  const updateProfile = useUpdateProfile();

  const [form, setForm] = useState<FormState>({
    nickname: "",
    avatarUrl: "",
    bio: "",
  });
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  useEffect(() => {
    if (profile) {
      setForm({
        nickname: profile.nickname ?? "",
        avatarUrl: profile.avatarUrl ?? "",
        bio: profile.bio ?? "",
      });
    }
  }, [profile]);

  const handleInputChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setAvatarUploading(true);
    setMessage(null);
    try {
      const result = await uploadVideoFile(file);
      setForm((prev) => ({ ...prev, avatarUrl: result.fileUrl }));
      setMessage({ type: "success", text: "Avatar téléversé avec succès." });
    } catch (uploadError) {
      setMessage({
        type: "error",
        text:
          uploadError instanceof Error
            ? uploadError.message
            : "Échec du téléversement de l'avatar.",
      });
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);

    updateProfile.mutate(
      {
        nickname: form.nickname.trim() || undefined,
        avatarUrl: form.avatarUrl.trim() || undefined,
        bio: form.bio.trim() || undefined,
      },
      {
        onSuccess: () => {
          setMessage({ type: "success", text: "Profil mis à jour." });
        },
        onError: (mutationError) => {
          setMessage({
            type: "error",
            text:
              mutationError instanceof Error
                ? mutationError.message
                : String(mutationError),
          });
        },
      }
    );
  };

  if (isAuthLoading || !user) {
    return (
      <div className="container mx-auto space-y-6 px-4 py-8">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto space-y-6 px-4 py-8">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="rounded-md bg-destructive/10 p-4 text-destructive">
          Impossible de charger votre profil : {String(error)}
        </div>
      </div>
    );
  }

  const avatarSrc =
    form.avatarUrl || profile?.avatarUrl || "https://placehold.co/256x256/png";
  const unoptimizedAvatar = avatarSrc.startsWith("http://localhost");

  return (
    <div className="container mx-auto space-y-8 px-4 py-8">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Mon profil</h1>
          <p className="text-muted-foreground">
            Gérez votre identité, votre avatar et vos informations publiques.
          </p>
        </div>
        <Button variant="outline" onClick={() => router.back()}>
          Retour
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-8 lg:grid-cols-[320px,1fr]">
        <section className="space-y-4 rounded-lg border bg-card p-6 shadow-sm">
          <div className="space-y-3 text-center">
            <div className="relative mx-auto h-32 w-32 overflow-hidden rounded-full border">
              <Image
                src={avatarSrc}
                alt={profile?.nickname ?? profile?.email ?? "Avatar"}
                fill
                className="object-cover"
                unoptimized={unoptimizedAvatar}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="avatarUrl">URL de l&apos;avatar</Label>
              <Input
                id="avatarUrl"
                name="avatarUrl"
                type="url"
                placeholder="https://…"
                value={form.avatarUrl}
                onChange={handleInputChange}
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Formats recommandés : JPG/PNG carré.</span>
                <label
                  htmlFor="avatarFile"
                  className={cn(
                    "cursor-pointer rounded-md border px-2 py-1",
                    avatarUploading && "pointer-events-none opacity-60"
                  )}
                >
                  Téléverser
                </label>
                <input
                  id="avatarFile"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                  disabled={avatarUploading}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-6 rounded-lg border bg-card p-6 shadow-sm">
          <div className="grid gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Adresse e-mail</Label>
              <Input
                id="email"
                type="email"
                value={profile?.email ?? user.email}
                disabled
                className="cursor-not-allowed opacity-80"
              />
              <span className="text-xs text-muted-foreground">
                Cette adresse est utilisée pour l&apos;authentification et les notifications.
              </span>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="nickname">Pseudo</Label>
              <Input
                id="nickname"
                name="nickname"
                placeholder="Votre pseudo"
                value={form.nickname}
                onChange={handleInputChange}
              />
              <span className="text-xs text-muted-foreground">
                Les autres utilisateurs verront ce pseudo lorsque vous partagez du contenu.
              </span>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="bio">Biographie</Label>
              <Textarea
                id="bio"
                name="bio"
                placeholder="Présentez-vous en quelques phrases (240 caractères max)."
                value={form.bio}
                onChange={handleInputChange}
                rows={6}
                maxLength={240}
              />
              <span className="text-xs text-muted-foreground">
                {form.bio.length}/240 caractères
              </span>
            </div>
          </div>

          {message && (
            <div
              className={cn(
                "rounded-md border px-4 py-2 text-sm",
                message.type === "success"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
                  : "border-destructive/40 bg-destructive/10 text-destructive"
              )}
            >
              {message.text}
            </div>
          )}

          <div className="flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setForm({
                  nickname: profile?.nickname ?? "",
                  avatarUrl: profile?.avatarUrl ?? "",
                  bio: profile?.bio ?? "",
                });
                setMessage(null);
              }}
            >
              Réinitialiser
            </Button>
            <Button type="submit" disabled={updateProfile.isPending}>
              Enregistrer
            </Button>
          </div>
        </section>
      </form>
    </div>
  );
}
