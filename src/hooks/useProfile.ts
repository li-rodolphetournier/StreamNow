import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { profileApi } from "@/lib/api/profile";
import type { GraphQLUser } from "@/types/graphql";

export function useProfile() {
  return useQuery<GraphQLUser | null>({
    queryKey: ["profile"],
    queryFn: profileApi.fetchProfile,
    staleTime: 1000 * 60,
  });
}

interface UpdateProfileVariables {
  nickname?: string;
  avatarUrl?: string;
  bio?: string;
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation<GraphQLUser, Error, UpdateProfileVariables>({
    mutationFn: profileApi.updateProfile,
    onSuccess: (user) => {
      queryClient.setQueryData(["profile"], user);
      queryClient.setQueryData(["currentUser"], user);
    },
  });
}


