import { ApolloServer } from "@apollo/server";
import type { Request, Response } from "express";
import { AppDataSource, initializeDataSource } from "../../config/data-source";
import { createSchema } from "../../schema/buildSchema";
import type { GraphQLContext } from "../../types/context";
import { buildAbilityFor } from "../../auth/ability";
import { User, UserRole } from "../../entities/User";
import { FriendshipStatus } from "../../entities/Friendship";
import { FriendRequestInput } from "../../inputs/FriendRequestInput";

describe("FriendshipResolver", () => {
  let server: ApolloServer<GraphQLContext>;
  let alice: User;
  let bob: User;
  let charlie: User;

  const contextFactory = (user: User | null): GraphQLContext => ({
    req: { headers: {} } as Request,
    res: {} as Response,
    userId: user?.id,
    userRole: user?.role,
    ability: buildAbilityFor({
      userId: user?.id,
      userRole: user?.role,
    }),
  });

  beforeAll(async () => {
    AppDataSource.setOptions({
      type: "sqlite",
      database: ":memory:",
      synchronize: true,
      logging: false,
    });

    await initializeDataSource();
    const schema = await createSchema();

    server = new ApolloServer<GraphQLContext>({
      schema,
    });
    await server.start();

    const userRepo = AppDataSource.getRepository(User);
    alice = await userRepo.save(
      userRepo.create({
        email: "alice@example.com",
        nickname: "alice",
        role: UserRole.EDITOR,
        passwordHash: "hash",
      })
    );
    bob = await userRepo.save(
      userRepo.create({
        email: "bob@example.com",
        nickname: "bobby",
        role: UserRole.VIEWER,
        passwordHash: "hash",
      })
    );
    charlie = await userRepo.save(
      userRepo.create({
        email: "charlie@example.com",
        nickname: "charlie",
        role: UserRole.VIEWER,
        passwordHash: "hash",
      })
    );
  });

  afterAll(async () => {
    await server.stop();
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  });

  it("creates friend request by email and accepts it", async () => {
    const variables: { input: FriendRequestInput } = {
      input: { email: "bob@example.com" },
    };

    const requestResponse = await server.executeOperation(
      {
        query: /* GraphQL */ `
          mutation RequestFriend($input: FriendRequestInput!) {
            requestFriend(input: $input) {
              id
              status
              user {
                id
                email
              }
            }
          }
        `,
        variables,
      },
      { contextValue: contextFactory(alice) }
    );

    expect(requestResponse.body.kind).toBe("single");
    const requestResult =
      requestResponse.body.kind === "single"
        ? requestResponse.body.singleResult
        : undefined;
    expect(requestResult?.errors).toBeUndefined();
    const pending = requestResult?.data?.requestFriend;
    expect(pending.user.email).toBe("bob@example.com");
    expect(pending.status).toBe(FriendshipStatus.PENDING);

    // Bob should see incoming request
    const incomingResponse = await server.executeOperation(
      {
        query: /* GraphQL */ `
          query IncomingRequests {
            incomingFriendRequests {
              id
              status
              user {
                email
              }
            }
          }
        `,
      },
      { contextValue: contextFactory(bob) }
    );
    const incomingResult =
      incomingResponse.body.kind === "single"
        ? incomingResponse.body.singleResult
        : undefined;
    expect(incomingResult?.errors).toBeUndefined();
    expect(incomingResult?.data?.incomingFriendRequests).toHaveLength(1);
    const incoming = incomingResult?.data?.incomingFriendRequests?.[0];
    expect(incoming.user.email).toBe("alice@example.com");

    // Bob accepts
    const respondResponse = await server.executeOperation(
      {
        query: /* GraphQL */ `
          mutation RespondFriendRequest($input: RespondFriendRequestInput!) {
            respondFriendRequest(input: $input) {
              id
              status
              friend {
                email
              }
            }
          }
        `,
        variables: {
          input: { id: pending.id, accept: true },
        },
      },
      { contextValue: contextFactory(bob) }
    );

    const respondResult =
      respondResponse.body.kind === "single"
        ? respondResponse.body.singleResult
        : undefined;
    expect(respondResult?.errors).toBeUndefined();
    expect(respondResult?.data?.respondFriendRequest.friend.email).toBe(
      "alice@example.com"
    );
    expect(respondResult?.data?.respondFriendRequest.status).toBe(
      FriendshipStatus.ACCEPTED
    );

    // Both should see each other in friends list
    const friendsResponse = await server.executeOperation(
      {
        query: /* GraphQL */ `
          query Friends {
            friends {
              friend {
                email
              }
              status
            }
          }
        `,
      },
      { contextValue: contextFactory(alice) }
    );

    const friendsResult =
      friendsResponse.body.kind === "single"
        ? friendsResponse.body.singleResult
        : undefined;
    expect(friendsResult?.errors).toBeUndefined();
    expect(friendsResult?.data?.friends).toHaveLength(1);
    expect(friendsResult?.data?.friends?.[0]?.friend.email).toBe(
      "bob@example.com"
    );
  });

  it("allows cancelling a friend request", async () => {
    // Charlie sends to Bob
    const sendResponse = await server.executeOperation(
      {
        query: /* GraphQL */ `
          mutation RequestFriend($input: FriendRequestInput!) {
            requestFriend(input: $input) {
              id
              status
              user {
                email
              }
            }
          }
        `,
        variables: { input: { nickname: "bobby" } },
      },
      { contextValue: contextFactory(charlie) }
    );
    const sendResult =
      sendResponse.body.kind === "single"
        ? sendResponse.body.singleResult
        : undefined;
    expect(sendResult?.errors).toBeUndefined();
    const requestId = sendResult?.data?.requestFriend.id as string;

    // Charlie cancels the pending request
    const cancelResponse = await server.executeOperation(
      {
        query: /* GraphQL */ `
          mutation CancelFriendRequest($id: ID!) {
            cancelFriendRequest(requestId: $id)
          }
        `,
        variables: {
          id: requestId,
        },
      },
      { contextValue: contextFactory(charlie) }
    );

    const cancelResult =
      cancelResponse.body.kind === "single"
        ? cancelResponse.body.singleResult
        : undefined;
    expect(cancelResult?.errors).toBeUndefined();
    expect(cancelResult?.data?.cancelFriendRequest).toBe(true);
  });
});


