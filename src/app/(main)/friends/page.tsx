"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/shared/Skeleton";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import {
  useCancelFriendRequest,
  useFriendsOverview,
  useRemoveFriend,
  useRequestFriend,
  useRespondFriendRequest,
} from "@/hooks/useFriends";
import type { GraphQLFriend, GraphQLFriendRequest } from "@/types/graphql";
import { cn } from "@/lib/utils";

const statusLabel: Record<string, string> = {
  pending: "En attente",
  accepted: "Accepté",
  blocked: "Bloqué",
};

function FriendAvatar({ user }: { user: GraphQLFriend["friend"] }) {
  return (
    <div className="relative h-10 w-10 overflow-hidden rounded-full border">
      <Image
        src={user.avatarUrl ?? "https://placehold.co/80x80"}
        alt={user.nickname ?? user.email}
        fill
        className="object-cover"
      />
    </div>
  );
}

function FriendRequestAvatar({ request }: { request: GraphQLFriendRequest }) {
  return (
    <div className="relative h-10 w-10 overflow-hidden rounded-full border">
      <Image
        src={request.user.avatarUrl ?? "https://placehold.co/80x80"}
        alt={request.user.nickname ?? request.user.email}
        fill
        className="object-cover"
      />
    </div>
  );
}

export default function FriendsPage() {
  const [email, setEmail] = useState("");
  const [nickname, setNickname] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const { user, isLoading: isAuthLoading } = useRequireAuth();
  const { data, isLoading, isError, error } = useFriendsOverview(Boolean(user));

  const requestFriendMutation = useRequestFriend();
  const respondMutation = useRespondFriendRequest();
  const cancelMutation = useCancelFriendRequest();
  const removeFriendMutation = useRemoveFriend();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!email.trim() && !nickname.trim()) {
      setFormError("Saisissez un e-mail ou un pseudo pour envoyer une demande.");
      return;
    }

    requestFriendMutation.mutate(
      {
        email: email.trim() || undefined,
        nickname: nickname.trim() || undefined,
      },
      {
        onSuccess: () => {
          setFormSuccess("Demande envoyée !");
          setEmail("");
          setNickname("");
        },
        onError: (mutationError) => {
          setFormError(mutationError.message);
        },
      }
    );
  };

  if (isAuthLoading) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const friends = data?.friends ?? [];
  const incoming = data?.incomingFriendRequests ?? [];
  const outgoing = data?.outgoingFriendRequests ?? [];

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Mes amis</h1>
        <p className="text-muted-foreground">
          Gérez vos contacts pour partager plus facilement vos vidéos.
        </p>
      </div>

      <section className="rounded-lg border bg-card p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Ajouter un ami</h2>
        <p className="text-sm text-muted-foreground">
          Invitez une personne via son e-mail ou son pseudo StreamNow.
        </p>

        <form className="mt-4 grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              placeholder="ami@exemple.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={requestFriendMutation.isPending}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="nickname">Pseudo</Label>
            <Input
              id="nickname"
              type="text"
              placeholder="Pseudo StreamNow"
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
              disabled={requestFriendMutation.isPending}
            />
          </div>
          <div className="md:col-span-2 flex items-center justify-end gap-3">
            {formError && (
              <span className="text-sm text-destructive">{formError}</span>
            )}
            {formSuccess && (
              <span className="text-sm text-emerald-600">{formSuccess}</span>
            )}
            <Button
              type="submit"
              disabled={requestFriendMutation.isPending}
            >
              Envoyer une demande
            </Button>
          </div>
        </form>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Amis ({friends.length})</h2>
          {friends.length > 0 && (
            <span className="text-sm text-muted-foreground">
              Cliquez sur un ami pour lui partager rapidement une vidéo :
              <Link href="/dashboard/videos" className="ml-1 text-primary hover:underline">
                accéder au dashboard
              </Link>
            </span>
          )}
        </div>

        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : isError ? (
          <div className="rounded-md bg-destructive/10 p-4 text-destructive">
            {String(error)}
          </div>
        ) : friends.length === 0 ? (
          <div className="rounded-md border border-dashed p-6 text-center text-muted-foreground">
            Aucun ami pour le moment. Envoyez votre première invitation ci-dessus.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted/60">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">
                    Membre
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">
                    Statut
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">
                    Depuis
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {friends.map((entry) => (
                  <tr key={entry.id}>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-3">
                        <FriendAvatar user={entry.friend} />
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {entry.friend.nickname ?? entry.friend.email}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {entry.friend.email}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm capitalize">
                      {statusLabel[entry.status] ?? entry.status}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {new Intl.DateTimeFormat("fr-FR", {
                        dateStyle: "medium",
                      }).format(new Date(entry.createdAt))}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => removeFriendMutation.mutate(entry.friend.id)}
                        disabled={removeFriendMutation.isPending}
                      >
                        Retirer
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4 rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="text-xl font-semibold">
            Demandes reçues ({incoming.length})
          </h2>
          {incoming.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucune demande en attente.
            </p>
          ) : (
            <ul className="space-y-4">
              {incoming.map((request) => (
                <li
                  key={request.id}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <div className="flex items-center gap-3">
                    <FriendRequestAvatar request={request} />
                    <div>
                      <p className="font-medium">
                        {request.user.nickname ?? request.user.email}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Intl.DateTimeFormat("fr-FR", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(new Date(request.createdAt))}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        respondMutation.mutate({ id: request.id, accept: false })
                      }
                      disabled={respondMutation.isPending}
                    >
                      Refuser
                    </Button>
                    <Button
                      size="sm"
                      onClick={() =>
                        respondMutation.mutate({ id: request.id, accept: true })
                      }
                      disabled={respondMutation.isPending}
                    >
                      Accepter
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-4 rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="text-xl font-semibold">
            Demandes envoyées ({outgoing.length})
          </h2>
          {outgoing.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Vous n&apos;avez aucune demande en cours.
            </p>
          ) : (
            <ul className="space-y-4">
              {outgoing.map((request) => (
                <li
                  key={request.id}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <div className="flex items-center gap-3">
                    <FriendRequestAvatar request={request} />
                    <div>
                      <p className="font-medium">
                        {request.user.nickname ?? request.user.email}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {statusLabel[request.status] ?? request.status}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => cancelMutation.mutate(request.id)}
                    disabled={cancelMutation.isPending}
                  >
                    Annuler
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}


