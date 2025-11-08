import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { friendsApi } from "@/lib/api/friends";
import type {
  FriendRequestInputVariables,
  GraphQLFriend,
  GraphQLFriendRequest,
  RespondFriendRequestInputVariables,
} from "@/types/graphql";

export function useFriendsOverview(enabled = true) {
  return useQuery({
    queryKey: ["friends", "overview"],
    queryFn: friendsApi.fetchOverview,
    staleTime: 1000 * 30,
    enabled,
  });
}

export function useRequestFriend() {
  const queryClient = useQueryClient();

  return useMutation<GraphQLFriendRequest, Error, FriendRequestInputVariables>({
    mutationFn: friendsApi.requestFriend,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friends", "overview"] });
    },
  });
}

export function useRespondFriendRequest() {
  const queryClient = useQueryClient();

  return useMutation<GraphQLFriend | null, Error, RespondFriendRequestInputVariables>({
    mutationFn: friendsApi.respondFriendRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friends", "overview"] });
    },
  });
}

export function useCancelFriendRequest() {
  const queryClient = useQueryClient();

  return useMutation<boolean, Error, string>({
    mutationFn: friendsApi.cancelFriendRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friends", "overview"] });
    },
  });
}

export function useRemoveFriend() {
  const queryClient = useQueryClient();

  return useMutation<boolean, Error, string>({
    mutationFn: friendsApi.removeFriend,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friends", "overview"] });
    },
  });
}


