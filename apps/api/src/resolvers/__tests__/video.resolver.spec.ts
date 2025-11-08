import { ApolloServer } from "@apollo/server";
import type { Request, Response } from "express";
import { AppDataSource, initializeDataSource } from "../../config/data-source";
import { createSchema } from "../../schema/buildSchema";
import type { GraphQLContext } from "../../types/context";
import { User, UserRole } from "../../entities/User";
import { TmdbService } from "../../services/tmdb.service";
import { NormalizedTmdbPayload } from "../../services/tmdb.service";
import {
  Video,
  VideoMediaType,
  VideoSourceType,
  VideoStatus,
} from "../../entities/Video";
import { buildAbilityFor } from "../../auth/ability";

describe("VideoResolver", () => {
  let server: ApolloServer<GraphQLContext>;
  let ownerContext: () => GraphQLContext;
  let otherContext: () => GraphQLContext;
  let sharedContext: () => GraphQLContext;
  let owner: User;
  let otherUser: User;
  let sharedUser: User;
  let createdVideoId: string | undefined;

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
        email: "test@example.com",
        role: UserRole.EDITOR,
        passwordHash: "hash",
      })
    );

    otherUser = await userRepo.save(
      userRepo.create({
        email: "other@example.com",
        role: UserRole.VIEWER,
        passwordHash: "hash",
      })
    );

    sharedUser = await userRepo.save(
      userRepo.create({
        email: "shared@example.com",
        role: UserRole.VIEWER,
        nickname: "shared-user",
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

    sharedContext = () =>
      ({
        req: { headers: {} } as Request,
        res: {} as Response,
        userId: sharedUser.id,
        userRole: sharedUser.role,
        ability: buildAbilityFor({ userId: sharedUser.id, userRole: sharedUser.role }),
      }) as GraphQLContext;
  });

  afterAll(async () => {
    await server.stop();
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  });

  it("adds a video by TMDB id and links to owner", async () => {
    const fetchSpy = jest
      .spyOn(TmdbService.prototype, "fetchDetails")
      .mockResolvedValue({
        tmdbId: 123,
        title: "Demo Movie",
        overview: "Overview lorem ipsum",
        tagline: "Best movie",
        releaseDate: "2024-01-01",
        posterUrl: "https://image.tmdb.org/t/p/w780/poster.jpg",
        backdropUrl: "https://image.tmdb.org/t/p/w1280/backdrop.jpg",
        trailerUrl: "https://www.youtube.com/watch?v=abcd",
        metadata: { popularity: 100 },
      } satisfies NormalizedTmdbPayload);

    const response = await server.executeOperation(
      {
        query: /* GraphQL */ `
          mutation AddVideo($input: AddVideoInput!) {
            addVideoByTmdbId(input: $input) {
              id
              title
              slug
              status
              sourceType
              fileUrl
              visibility
              owner {
                id
                email
              }
            }
          }
        `,
        variables: {
          input: {
            tmdbId: 123,
            mediaType: "MOVIE",
            status: "PUBLISHED",
          },
        },
      },
      { contextValue: ownerContext() }
    );

    expect(response.body.kind).toBe("single");
    const result = response.body.kind === "single" ? response.body.singleResult : undefined;
    expect(result?.errors).toBeUndefined();
    const created = result?.data?.addVideoByTmdbId as {
      id: string;
      title: string;
      slug: string;
      status: VideoStatus;
      sourceType: VideoSourceType;
      visibility: string;
      fileUrl?: string | null;
      owner: { id: string; email: string };
    } | undefined;
    expect(created).toBeDefined();
    if (!created) {
      throw new Error("Expected created video in response");
    }
    createdVideoId = created.id;
    expect(created.owner.email).toBe(owner.email);
    expect(created.status).toBe("PUBLISHED");
    expect(created.sourceType).toBe(VideoSourceType.TMDB);
    expect(created.fileUrl).toBeNull();
    expect(created.visibility).toBe("PRIVATE");

    const repo = AppDataSource.getRepository(Video);
    const saved = await repo.findOne({
      where: { slug: created.slug },
      relations: { owner: true },
    });
    expect(saved).toBeTruthy();
    expect(saved?.owner?.id).toBe(owner.id);

    fetchSpy.mockRestore();
  });

  it("creates a local video with manual metadata", async () => {
    const response = await server.executeOperation(
      {
        query: /* GraphQL */ `
          mutation CreateLocal($input: CreateLocalVideoInput!) {
            createLocalVideo(input: $input) {
              id
              title
              sourceType
              fileUrl
              visibility
              owner {
                id
              }
            }
          }
        `,
        variables: {
          input: {
            fileUrl: "/uploads/demo.mp4",
            mediaType: "MOVIE",
            status: "DRAFT",
            title: "Local Showcase",
            overview: "A local file",
            fileSize: 123456789,
          },
        },
      },
      { contextValue: ownerContext() }
    );

    expect(response.body.kind).toBe("single");
    const result = response.body.kind === "single" ? response.body.singleResult : undefined;
    expect(result?.errors).toBeUndefined();
    const created = result?.data?.createLocalVideo as {
      id: string;
      title: string;
      sourceType: VideoSourceType;
      fileUrl?: string | null;
      visibility: string;
      owner: { id: string };
    } | undefined;
    expect(created).toBeDefined();
    if (!created) {
      throw new Error("Expected created local video");
    }
    expect(created.sourceType).toBe(VideoSourceType.LOCAL);
    expect(created.fileUrl).toBe("/uploads/demo.mp4");
    expect(created.owner.id).toBe(owner.id);
    expect(created.visibility).toBe("PRIVATE");
  });

  it("returns TMDB search results", async () => {
    const searchSpy = jest
      .spyOn(TmdbService.prototype, "search")
      .mockResolvedValue([
        {
          id: 99,
          title: "Search Movie",
          overview: "Overview",
          releaseDate: "2023-12-01",
          posterUrl: "https://image.tmdb.org/t/p/w342/poster.jpg",
          mediaType: VideoMediaType.MOVIE,
        },
      ]);

    const response = await server.executeOperation(
      {
        query: /* GraphQL */ `
          query Search($query: String!) {
            searchTmdbVideos(query: $query) {
              id
              title
              mediaType
            }
          }
        `,
        variables: { query: "Search" },
      },
      { contextValue: ownerContext() }
    );

    expect(response.body.kind).toBe("single");
    const result = response.body.kind === "single" ? response.body.singleResult : undefined;
    expect(result?.errors).toBeUndefined();
    const entries = result?.data?.searchTmdbVideos as Array<{ id: number; title: string }>;
    expect(entries).toHaveLength(1);
    expect(entries?.[0]?.title).toBe("Search Movie");

    searchSpy.mockRestore();
  });

  it("returns a single video", async () => {
    const response = await server.executeOperation(
      {
        query: /* GraphQL */ `
          query Video($id: ID!) {
            video(id: $id) {
              id
              title
              status
              sourceType
              visibility
              owner {
                id
                email
              }
            }
          }
        `,
        variables: { id: createdVideoId },
      },
      { contextValue: ownerContext() }
    );

    const result = response.body.kind === "single" ? response.body.singleResult : undefined;
    expect(result?.errors).toBeUndefined();
    const data = result?.data as {
      video?: {
        id: string;
        sourceType: VideoSourceType;
        visibility: string;
        owner?: { email: string };
      };
    } | undefined;
    expect(data?.video?.id).toBe(createdVideoId);
    expect(data?.video?.sourceType).toBeDefined();
    expect(data?.video?.owner?.email).toBe(owner.email);
    expect(data?.video?.visibility).toBe("PRIVATE");
  });

  it("updates sharing visibility with restricted recipients", async () => {
    const updateResponse = await server.executeOperation(
      {
        query: /* GraphQL */ `
          mutation UpdateVisibility($input: UpdateVideoVisibilityInput!) {
            updateVideoVisibility(input: $input) {
              id
              visibility
              shares {
                recipient {
                  id
                  email
                  nickname
                }
              }
            }
          }
        `,
        variables: {
          input: {
            id: createdVideoId,
            visibility: "RESTRICTED",
            recipients: [{ email: sharedUser.email }],
          },
        },
      },
      { contextValue: ownerContext() }
    );

    const mutationResult =
      updateResponse.body.kind === "single" ? updateResponse.body.singleResult : undefined;
    expect(mutationResult?.errors).toBeUndefined();
    const payload = mutationResult?.data?.updateVideoVisibility as {
      id: string;
      visibility: string;
      shares: Array<{ recipient: { id: string; email: string; nickname?: string | null } }>;
    };
    expect(payload.visibility).toBe("RESTRICTED");
    expect(payload.shares).toHaveLength(1);
    expect(payload.shares[0]?.recipient.email).toBe(sharedUser.email);

    const recipientAccess = await server.executeOperation(
      {
        query: /* GraphQL */ `
          query RestrictedVideo($id: ID!) {
            video(id: $id) {
              id
              visibility
            }
          }
        `,
        variables: { id: createdVideoId },
      },
      { contextValue: sharedContext() }
    );

    const recipientResult =
      recipientAccess.body.kind === "single" ? recipientAccess.body.singleResult : undefined;
    expect(recipientResult?.errors).toBeUndefined();
    const recipientData = recipientResult?.data as { video?: { visibility: string } } | undefined;
    expect(recipientData?.video?.visibility).toBe("RESTRICTED");

    const deniedAccess = await server.executeOperation(
      {
        query: /* GraphQL */ `
          query RestrictedVideo($id: ID!) {
            video(id: $id) {
              id
            }
          }
        `,
        variables: { id: createdVideoId },
      },
      { contextValue: otherContext() }
    );

    const deniedResult =
      deniedAccess.body.kind === "single" ? deniedAccess.body.singleResult : undefined;
    expect(deniedResult?.data).toBeUndefined();
    expect(deniedResult?.errors?.[0]?.message).toMatch(/refusé/i);
  });

  it("updates video status for owner", async () => {
    const response = await server.executeOperation(
      {
        query: /* GraphQL */ `
          mutation UpdateVideo($input: UpdateVideoStatusInput!) {
            updateVideoStatus(input: $input) {
              id
              status
            }
          }
        `,
        variables: {
          input: {
            id: createdVideoId,
            status: "DRAFT",
          },
        },
      },
      { contextValue: ownerContext() }
    );

    const result = response.body.kind === "single" ? response.body.singleResult : undefined;
    expect(result?.errors).toBeUndefined();
    const data = result?.data as { updateVideoStatus?: { status: string } } | undefined;
    expect(data?.updateVideoStatus?.status).toBe("DRAFT");
  });

  it("rejects status change for non owner", async () => {
    const response = await server.executeOperation(
      {
        query: /* GraphQL */ `
          mutation UpdateVideo($input: UpdateVideoStatusInput!) {
            updateVideoStatus(input: $input) {
              id
              status
            }
          }
        `,
        variables: {
          input: {
            id: createdVideoId,
            status: "PUBLISHED",
          },
        },
      },
      { contextValue: otherContext() }
    );

    const result = response.body.kind === "single" ? response.body.singleResult : undefined;
    expect(result?.data == null).toBe(true);
    expect(result?.errors?.[0]?.message).toMatch(/permission/i);
  });
});

