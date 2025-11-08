import { ApolloServer } from "@apollo/server";
import type { Request, Response } from "express";
import { AppDataSource, initializeDataSource } from "../../config/data-source";
import { createSchema } from "../../schema/buildSchema";
import type { GraphQLContext } from "../../types/context";
import { User, UserRole } from "../../entities/User";
import { buildAbilityFor } from "../../auth/ability";
import { AddFavoriteInput } from "../../inputs/AddFavoriteInput";
import { Favorite } from "../../entities/Favorite";
import { VideoMediaType } from "../../entities/Video";

describe("FavoriteResolver", () => {
  let server: ApolloServer<GraphQLContext>;
  let owner: User;
  let otherUser: User;
  let ownerContext: () => GraphQLContext;
  let otherContext: () => GraphQLContext;

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
    owner = await userRepo.save(
      userRepo.create({
        email: "favorite-owner@example.com",
        role: UserRole.EDITOR,
        passwordHash: "hash",
      })
    );
    otherUser = await userRepo.save(
      userRepo.create({
        email: "favorite-other@example.com",
        role: UserRole.VIEWER,
        passwordHash: "hash",
      })
    );

    ownerContext = () =>
      ({
        req: { headers: {} } as Request,
        res: {} as Response,
        userId: owner.id,
        userRole: owner.role,
        ability: buildAbilityFor({ userId: owner.id, userRole: owner.role }),
      }) as GraphQLContext;

    otherContext = () =>
      ({
        req: { headers: {} } as Request,
        res: {} as Response,
        userId: otherUser.id,
        userRole: otherUser.role,
        ability: buildAbilityFor({ userId: otherUser.id, userRole: otherUser.role }),
      }) as GraphQLContext;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await server.stop();
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  });

  const addFavoriteMutation = /* GraphQL */ `
    mutation AddFavorite($input: AddFavoriteInput!) {
      addFavorite(input: $input) {
        id
        tmdbId
        mediaType
        title
        posterPath
        createdAt
      }
    }
  `;

  it("allows an authenticated user to add a favorite", async () => {
    const variables: { input: AddFavoriteInput } = {
      input: {
        tmdbId: 12345,
        mediaType: VideoMediaType.MOVIE,
        title: "Favorite Movie",
        overview: "Overview lorem ipsum",
        posterPath: "/poster.jpg",
        backdropPath: "/backdrop.jpg",
        releaseDate: "2024-01-01",
        voteAverage: 8.4,
        voteCount: 1200,
        genreIds: [12, 18],
      },
    };

    const response = await server.executeOperation(
      {
        query: addFavoriteMutation,
        variables,
      },
      { contextValue: ownerContext() }
    );

    expect(response.body.kind).toBe("single");
    const result = response.body.kind === "single" ? response.body.singleResult : undefined;
    expect(result?.errors).toBeUndefined();
    const data = result?.data?.addFavorite as Favorite | undefined;
    expect(data).toBeDefined();
    expect(data?.tmdbId).toBe(12345);
    expect(String(data?.mediaType)).toBe("MOVIE");
  });

  it("returns the list of favorites for the authenticated user", async () => {
    const response = await server.executeOperation(
      {
        query: /* GraphQL */ `
          query Favorites {
            favorites {
              tmdbId
              title
              mediaType
            }
          }
        `,
      },
      { contextValue: ownerContext() }
    );

    expect(response.body.kind).toBe("single");
    const result = response.body.kind === "single" ? response.body.singleResult : undefined;
    expect(result?.errors).toBeUndefined();
    const favorites = result?.data?.favorites as Array<{ tmdbId: number }>;
    expect(favorites).toHaveLength(1);
    expect(favorites[0]?.tmdbId).toBe(12345);
  });

  it("prevents removing favorites of another user", async () => {
    const response = await server.executeOperation(
      {
        query: /* GraphQL */ `
          mutation RemoveFavorite($input: RemoveFavoriteInput!) {
            removeFavorite(input: $input)
          }
        `,
        variables: {
          input: { tmdbId: 12345, mediaType: VideoMediaType.MOVIE },
        },
      },
      { contextValue: otherContext() }
    );

    expect(response.body.kind).toBe("single");
    const result = response.body.kind === "single" ? response.body.singleResult : undefined;
    expect(result?.errors).toBeUndefined();
    expect(result?.data?.removeFavorite).toBe(false);
  });

  it("removes a favorite for the owner", async () => {
    const response = await server.executeOperation(
      {
        query: /* GraphQL */ `
          mutation RemoveFavorite($input: RemoveFavoriteInput!) {
            removeFavorite(input: $input)
          }
        `,
        variables: {
          input: { tmdbId: 12345, mediaType: VideoMediaType.MOVIE },
        },
      },
      { contextValue: ownerContext() }
    );

    expect(response.body.kind).toBe("single");
    const result = response.body.kind === "single" ? response.body.singleResult : undefined;
    expect(result?.errors).toBeUndefined();
    expect(result?.data?.removeFavorite).toBe(true);

    const listResponse = await server.executeOperation(
      {
        query: /* GraphQL */ `
          query Favorites {
            favorites {
              tmdbId
            }
          }
        `,
      },
      { contextValue: ownerContext() }
    );

    const listResult =
      listResponse.body.kind === "single" ? listResponse.body.singleResult : undefined;
    expect(listResult?.errors).toBeUndefined();
    const favorites = listResult?.data?.favorites as Array<{ tmdbId: number }>;
    expect(favorites).toHaveLength(0);
  });
});


