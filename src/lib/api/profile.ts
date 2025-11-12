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

interface UserByIdResponse {
  userById: GraphQLUser | null;
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

const USER_BY_ID_QUERY = /* GraphQL */ `
  query UserById($id: ID!) {
    userById(id: $id) {
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

  fetchUserById: async (id: string): Promise<GraphQLUser | null> => {
    if (!id) {
      return null;
    }
    const { userById } = await graphqlRequest<UserByIdResponse, { id: string }>({
      query: USER_BY_ID_QUERY,
      variables: { id },
    });
    return userById;
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


