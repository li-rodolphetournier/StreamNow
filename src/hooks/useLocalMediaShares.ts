"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { localSharesApi } from "@/lib/api/localShares";
import type { GraphQLLocalMediaShare } from "@/types/graphql";

export function useLocalMediaShares(path: string | null) {
  return useQuery<GraphQLLocalMediaShare[], Error>({
    queryKey: ["local-media-shares", path],
    queryFn: () => localSharesApi.fetchByPath(path ?? ""),
    enabled: Boolean(path),
    staleTime: 30 * 1000,
  });
}

export function useShareLocalMedia() {
  const queryClient = useQueryClient();

  return useMutation<
    GraphQLLocalMediaShare[],
    Error,
    { path: string; isDirectory: boolean; recipientIds: string[] }
  >({
    mutationFn: localSharesApi.share,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["local-media-shares", variables.path],
      });
    },
  });
}

export function useRevokeLocalMediaShare() {
  const queryClient = useQueryClient();

  return useMutation<boolean, Error, { id: string; path: string }>({
    mutationFn: ({ id }) => localSharesApi.revoke(id),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["local-media-shares", variables.path],
      });
    },
  });
}

