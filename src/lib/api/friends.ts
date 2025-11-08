import { graphqlRequest } from "@/lib/api/graphql";
import type {
  FriendRequestInputVariables,
  GraphQLFriend,
  GraphQLFriendRequest,
  RespondFriendRequestInputVariables,
} from "@/types/graphql";

interface FriendsOverviewResponse {
  friends: GraphQLFriend[];
  incomingFriendRequests: GraphQLFriendRequest[];
  outgoingFriendRequests: GraphQLFriendRequest[];
}

interface RequestFriendResponse {
  requestFriend: GraphQLFriendRequest;
}

interface RespondFriendRequestResponse {
  respondFriendRequest: GraphQLFriend | null;
}

interface CancelFriendRequestResponse {
  cancelFriendRequest: boolean;
}

interface RemoveFriendResponse {
  removeFriend: boolean;
}

const FRIENDS_OVERVIEW_QUERY = /* GraphQL */ `
  query FriendsOverview {
    friends {
      id
      status
      createdAt
      friend {
        id
        email
        nickname
        avatarUrl
      }
    }
    incomingFriendRequests {
      id
      status
      createdAt
      user {
        id
        email
        nickname
        avatarUrl
      }
    }
    outgoingFriendRequests {
      id
      status
      createdAt
      user {
        id
        email
        nickname
        avatarUrl
      }
    }
  }
`;

const REQUEST_FRIEND_MUTATION = /* GraphQL */ `
  mutation RequestFriend($input: FriendRequestInput!) {
    requestFriend(input: $input) {
      id
      status
      createdAt
      user {
        id
        email
        nickname
        avatarUrl
      }
    }
  }
`;

const RESPOND_FRIEND_REQUEST_MUTATION = /* GraphQL */ `
  mutation RespondFriendRequest($input: RespondFriendRequestInput!) {
    respondFriendRequest(input: $input) {
      id
      status
      createdAt
      friend {
        id
        email
        nickname
        avatarUrl
      }
    }
  }
`;

const CANCEL_FRIEND_REQUEST_MUTATION = /* GraphQL */ `
  mutation CancelFriendRequest($id: ID!) {
    cancelFriendRequest(requestId: $id)
  }
`;

const REMOVE_FRIEND_MUTATION = /* GraphQL */ `
  mutation RemoveFriend($friendId: ID!) {
    removeFriend(friendId: $friendId)
  }
`;

export const friendsApi = {
  fetchOverview: async (): Promise<FriendsOverviewResponse> => {
    return graphqlRequest<FriendsOverviewResponse>({
      query: FRIENDS_OVERVIEW_QUERY,
    });
  },

  requestFriend: async (
    input: FriendRequestInputVariables
  ): Promise<GraphQLFriendRequest> => {
    const { requestFriend } = await graphqlRequest<
      RequestFriendResponse,
      { input: FriendRequestInputVariables }
    >({
      query: REQUEST_FRIEND_MUTATION,
      variables: { input },
    });
    return requestFriend;
  },

  respondFriendRequest: async (
    input: RespondFriendRequestInputVariables
  ): Promise<GraphQLFriend | null> => {
    const { respondFriendRequest } = await graphqlRequest<
      RespondFriendRequestResponse,
      { input: RespondFriendRequestInputVariables }
    >({
      query: RESPOND_FRIEND_REQUEST_MUTATION,
      variables: { input },
    });
    return respondFriendRequest;
  },

  cancelFriendRequest: async (id: string): Promise<boolean> => {
    const { cancelFriendRequest } = await graphqlRequest<
      CancelFriendRequestResponse,
      { id: string }
    >({
      query: CANCEL_FRIEND_REQUEST_MUTATION,
      variables: { id },
    });
    return cancelFriendRequest;
  },

  removeFriend: async (friendId: string): Promise<boolean> => {
    const { removeFriend } = await graphqlRequest<
      RemoveFriendResponse,
      { friendId: string }
    >({
      query: REMOVE_FRIEND_MUTATION,
      variables: { friendId },
    });
    return removeFriend;
  },
};


