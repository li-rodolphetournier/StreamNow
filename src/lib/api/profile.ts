import { graphqlRequest } from "@/lib/api/graphql";
import type { GraphQLUser } from "@/types/graphql";

interface UpdateProfileInput {
  nickname?: string;
  avatarUrl?: string;
  bio?: string;
}

interface UpdateProfileResponse {
  updateProfile: GraphQLUser;
}

interface MeResponse {
  me: GraphQLUser | null;
}

const UPDATE_PROFILE_MUTATION = /* GraphQL */ `
  mutation UpdateProfile($input: UpdateProfileInput!) {
    updateProfile(input: $input) {
      id
      email
      nickname
      avatarUrl
      bio
      role
    }
  }
`;

const ME_QUERY = /* GraphQL */ `
  query MeProfile {
    me {
      id
      email
      nickname
      avatarUrl
      bio
      role
    }
  }
`;

export const profileApi = {
  fetchProfile: async (): Promise<GraphQLUser | null> => {
    const { me } = await graphqlRequest<MeResponse>({
      query: ME_QUERY,
    });
    return me;
  },

  updateProfile: async (input: UpdateProfileInput): Promise<GraphQLUser> => {
    const { updateProfile } = await graphqlRequest<
      UpdateProfileResponse,
      { input: UpdateProfileInput }
    >({
      query: UPDATE_PROFILE_MUTATION,
      variables: { input },
    });
    return updateProfile;
  },
};


