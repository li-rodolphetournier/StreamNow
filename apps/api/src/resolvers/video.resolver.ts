import { GraphQLError } from "graphql";
import { Arg, Authorized, Ctx, ID, Mutation, Query, Resolver } from "type-graphql";
import { AppDataSource } from "../config/data-source";
import {
  Video,
  VideoSourceType,
  VideoStatus,
  VideoMediaType,
  VideoVisibility,
} from "../entities/Video";
import { User, UserRole } from "../entities/User";
import { VideoShare } from "../entities/VideoShare";
import { Friendship, FriendshipStatus } from "../entities/Friendship";
import { AddVideoInput } from "../inputs/AddVideoInput";
import { UpdateVideoStatusInput } from "../inputs/UpdateVideoStatusInput";
import { UpdateVideoVisibilityInput } from "../inputs/UpdateVideoVisibilityInput";
import { ShareRecipientInput } from "../inputs/ShareRecipientInput";
import { TmdbService } from "../services/tmdb.service";
import type { GraphQLContext } from "../types/context";
import { generateSlug } from "../utils/slug";
import { CreateLocalVideoInput } from "../inputs/CreateLocalVideoInput";
import { TmdbSearchResult } from "../outputs/TmdbSearchResult";
import { canCreateVideo, canUpdateVideo } from "../auth/ability";
import { logger } from "../lib/logger";

@Resolver(() => Video)
export class VideoResolver {
  private readonly tmdb = new TmdbService();

  private isOwnerOrAdmin(video: Video, ctx: GraphQLContext): boolean {
    if (!ctx.userId) {
      return false;
    }
    if (ctx.userRole === UserRole.ADMIN) {
      return true;
    }
    return video.ownerId === ctx.userId;
  }

  private async isFriend(userId: string, otherUserId: string): Promise<boolean> {
    if (userId === otherUserId) {
      return true;
    }

    const friendshipRepo = AppDataSource.getRepository(Friendship);
    const existing = await friendshipRepo.findOne({
      where: [
        {
          requester: { id: userId },
          addressee: { id: otherUserId },
          status: FriendshipStatus.ACCEPTED,
        },
        {
          requester: { id: otherUserId },
          addressee: { id: userId },
          status: FriendshipStatus.ACCEPTED,
        },
      ],
      relations: { requester: true, addressee: true },
    });

    return Boolean(existing);
  }

  private async canUserViewVideo(video: Video, ctx: GraphQLContext): Promise<boolean> {
    const { userId, userRole } = ctx;

    if (userRole === UserRole.ADMIN) {
      return true;
    }

    if (video.ownerId && video.ownerId === userId) {
      return true;
    }

    switch (video.visibility) {
      case VideoVisibility.PUBLIC:
        return true;
      case VideoVisibility.AUTHENTICATED:
        return Boolean(userId);
      case VideoVisibility.FRIENDS:
        return Boolean(
          userId && video.ownerId && (await this.isFriend(userId, video.ownerId))
        );
      case VideoVisibility.RESTRICTED:
        return Boolean(
          userId &&
            video.shares?.some((share) => share.recipient?.id === userId)
        );
      case VideoVisibility.PRIVATE:
      default:
        return false;
    }
  }

  private async assertCanView(video: Video, ctx: GraphQLContext): Promise<void> {
    if (!(await this.canUserViewVideo(video, ctx))) {
      logger.warn(
        {
          userId: ctx.userId ?? "anonymous",
          videoId: video.id,
          visibility: video.visibility,
        },
        "Unauthorized video access attempt."
      );
      throw new GraphQLError("Accès à cette vidéo refusé.");
    }
  }

  private async resolveRecipients(
    recipients: ShareRecipientInput[]
  ): Promise<User[]> {
    const userRepo = AppDataSource.getRepository(User);
    const resolved = new Map<string, User>();
    const missing: ShareRecipientInput[] = [];

    for (const recipient of recipients) {
      const criteria = [];
      if (recipient.email) {
        criteria.push({ email: recipient.email.toLowerCase() });
      }
      if (recipient.nickname) {
        criteria.push({ nickname: recipient.nickname });
      }

      if (criteria.length === 0) {
        missing.push(recipient);
        continue;
      }

      const user = await userRepo.findOne({
        where: criteria,
      });

      if (!user) {
        missing.push(recipient);
        continue;
      }

      resolved.set(user.id, user);
    }

    if (missing.length > 0) {
      const identifiers = missing
        .map((item) => item.email ?? item.nickname)
        .filter(Boolean)
        .join(", ");
      throw new GraphQLError(
        `Impossible de trouver les utilisateurs suivants : ${identifiers}.`
      );
    }

    return Array.from(resolved.values());
  }

  @Query(() => Video, { nullable: true })
  async video(
    @Arg("id", () => ID) id: string,
    @Ctx() ctx: GraphQLContext
  ): Promise<Video | null> {
    const repo = AppDataSource.getRepository(Video);
    const video = await repo.findOne({
      where: { id },
      relations: {
        owner: true,
        shares: { recipient: true, sender: true },
      },
    });

    if (!video) {
      return null;
    }

    await this.assertCanView(video, ctx);
    return video;
  }

  @Query(() => [Video])
  async videos(@Ctx() ctx: GraphQLContext): Promise<Video[]> {
    const repo = AppDataSource.getRepository(Video);
    const qb = repo
      .createQueryBuilder("video")
      .leftJoinAndSelect("video.owner", "owner")
      .leftJoinAndSelect("video.shares", "shares")
      .leftJoinAndSelect("shares.recipient", "recipient")
      .orderBy("video.created_at", "DESC");

    const { userId, userRole } = ctx;

    if (!userId) {
      qb.where("video.visibility = :publicVisibility", {
        publicVisibility: VideoVisibility.PUBLIC,
      });
    } else if (userRole === UserRole.ADMIN) {
      // no additional constraints
    } else {
      qb.where(
        "(video.owner_id = :userId) OR " +
          "(video.visibility IN (:...generalVisibility)) OR " +
          "(video.visibility = :restrictedVisibility AND recipient.id = :userId)",
        {
          userId,
          generalVisibility: [VideoVisibility.PUBLIC, VideoVisibility.AUTHENTICATED],
          restrictedVisibility: VideoVisibility.RESTRICTED,
        }
      );
    }

    const videos = await qb.getMany();
    const visibilityChecks = await Promise.all(
      videos.map(async (video) => ((await this.canUserViewVideo(video, ctx)) ? video : null))
    );
    return visibilityChecks.filter((video): video is Video => Boolean(video));
  }

  @Query(() => [TmdbSearchResult])
  async searchTmdbVideos(
    @Arg("query") query: string,
    @Arg("mediaType", () => VideoMediaType, { nullable: true }) mediaType?: VideoMediaType
  ): Promise<TmdbSearchResult[]> {
    if (!query.trim()) {
      return [];
    }

    const results = await this.tmdb.search(query, mediaType);

    return results.map((result) => ({
      id: result.id,
      title: result.title,
      overview: result.overview,
      releaseDate: result.releaseDate,
      posterUrl: result.posterUrl,
      mediaType: result.mediaType,
    }));
  }

  @Mutation(() => Video)
  @Authorized(UserRole.EDITOR, UserRole.ADMIN)
  async addVideoByTmdbId(
    @Arg("input") input: AddVideoInput,
    @Ctx() ctx: GraphQLContext
  ): Promise<Video> {
    if (!canCreateVideo(ctx.ability)) {
      logger.warn({ userId: ctx.userId }, "ability_denied_add_video_tmdb");
      throw new GraphQLError("Vous n'êtes pas autorisé à ajouter une vidéo.");
    }

    const videoRepo = AppDataSource.getRepository(Video);

    const qb = videoRepo
      .createQueryBuilder("video")
      .leftJoin("video.owner", "owner")
      .where("video.tmdb_id = :tmdbId", { tmdbId: input.tmdbId })
      .andWhere("video.media_type = :mediaType", { mediaType: input.mediaType });

    if (ctx.userId) {
      qb.andWhere("owner.id = :ownerId", { ownerId: ctx.userId });
    } else {
      qb.andWhere("video.owner_id IS NULL");
    }

    const duplicate = await qb.getOne();

    if (duplicate) {
      throw new GraphQLError("Video already exists in your library.");
    }

    const payload = await this.tmdb.fetchDetails(input.tmdbId, input.mediaType);

    let slug = generateSlug(payload.title);
    let candidate = slug;
    let counter = 1;
    while (
      await videoRepo.exist({
        where: { slug: candidate },
      })
    ) {
      candidate = generateSlug(payload.title, `${counter}`);
      counter += 1;
    }
    slug = candidate;

    const video = videoRepo.create({
      tmdbId: payload.tmdbId,
      title: payload.title,
      slug,
      overview: payload.overview,
      tagline: payload.tagline,
      releaseDate: payload.releaseDate,
      posterUrl: payload.posterUrl,
      backdropUrl: payload.backdropUrl,
      trailerUrl: payload.trailerUrl,
      metadata: payload.metadata,
      mediaType: input.mediaType,
      status: input.status ?? VideoStatus.DRAFT,
      sourceType: VideoSourceType.TMDB,
    });

    if (ctx.userId) {
      const userRepo = AppDataSource.getRepository(User);
      const owner = await userRepo.findOneBy({ id: ctx.userId });
      if (!owner) {
        throw new GraphQLError("Authenticated user not found.");
      }
      video.owner = owner;
    }

    const saved = await videoRepo.save(video);

    logger.info({ userId: ctx.userId, videoId: saved.id }, "video_imported_tmdb");

    return videoRepo.findOneOrFail({
      where: { id: saved.id },
      relations: { owner: true },
    });
  }

  @Mutation(() => Video)
  @Authorized(UserRole.EDITOR, UserRole.ADMIN)
  async createLocalVideo(
    @Arg("input") input: CreateLocalVideoInput,
    @Ctx() ctx: GraphQLContext
  ): Promise<Video> {
    if (!ctx.userId) {
      throw new GraphQLError("Authentification requise.");
    }

    if (!canCreateVideo(ctx.ability)) {
      logger.warn({ userId: ctx.userId }, "ability_denied_create_local_video");
      throw new GraphQLError("Vous n'êtes pas autorisé à créer une vidéo locale.");
    }

    const userRepo = AppDataSource.getRepository(User);
    const owner = await userRepo.findOneBy({ id: ctx.userId });

    if (!owner) {
      throw new GraphQLError("Utilisateur introuvable.");
    }

    const videoRepo = AppDataSource.getRepository(Video);

    const details =
      input.tmdbId != null
        ? await this.tmdb.fetchDetails(input.tmdbId, input.mediaType)
        : null;

    if (input.tmdbId != null && !details) {
      throw new GraphQLError("Impossible de récupérer les informations TMDB.");
    }

    const title = details?.title ?? input.title;
    if (!title) {
      throw new GraphQLError(
        "Veuillez fournir un titre ou un identifiant TMDB valide pour cette vidéo."
      );
    }

    const slugBase = title;
    let slug = generateSlug(slugBase);
    let candidate = slug;
    let counter = 1;
    while (
      await videoRepo.exist({
        where: { slug: candidate },
      })
    ) {
      candidate = generateSlug(slugBase, `${counter}`);
      counter += 1;
    }
    slug = candidate;

    const video = videoRepo.create({
      tmdbId: details?.tmdbId ?? input.tmdbId,
      title,
      slug,
      overview: details?.overview ?? input.overview,
      tagline: details?.tagline ?? input.tagline,
      releaseDate: details?.releaseDate ?? input.releaseDate,
      posterUrl: details?.posterUrl ?? input.posterUrl,
      backdropUrl: details?.backdropUrl ?? input.backdropUrl,
      trailerUrl: details?.trailerUrl ?? input.trailerUrl,
      metadata: {
        ...(details?.metadata ?? {}),
        ...(input.overview ? { manualOverview: input.overview } : {}),
        ...(input.tagline ? { manualTagline: input.tagline } : {}),
        ...(input.fileSize ? { fileSize: input.fileSize } : {}),
        ...(input.durationSeconds ? { durationSeconds: input.durationSeconds } : {}),
      },
      mediaType: input.mediaType,
      status: input.status ?? VideoStatus.DRAFT,
      fileUrl: input.fileUrl,
      fileSize: input.fileSize ?? undefined,
      durationSeconds: input.durationSeconds ?? undefined,
      sourceType: VideoSourceType.LOCAL,
      owner,
    });

    const saved = await videoRepo.save(video);

    logger.info({ userId: ctx.userId, videoId: saved.id }, "video_created_local");

    return videoRepo.findOneOrFail({
      where: { id: saved.id },
      relations: { owner: true },
    });
  }

  @Mutation(() => Video)
  @Authorized(UserRole.EDITOR, UserRole.ADMIN)
  async updateVideoStatus(
    @Arg("input") input: UpdateVideoStatusInput,
    @Ctx() ctx: GraphQLContext
  ): Promise<Video> {
    const repo = AppDataSource.getRepository(Video);
    const video = await repo.findOne({
      where: { id: input.id },
      relations: { owner: true },
    });

    if (!video) {
      throw new GraphQLError("Vidéo introuvable.");
    }

    const userId = ctx.userId;
    if (!userId) {
      throw new GraphQLError("Authentification requise.");
    }

    const userRepo = AppDataSource.getRepository(User);
    const requester = await userRepo.findOneBy({ id: userId });
    if (!requester) {
      throw new GraphQLError("Utilisateur introuvable.");
    }

    if (!canUpdateVideo(ctx.ability, video)) {
      logger.warn({ userId, videoId: video.id }, "ability_denied_update_video_status");
      throw new GraphQLError(
        "Vous n'êtes pas autorisé à modifier cette vidéo."
      );
    }

    video.status = input.status;
    await repo.save(video);

    logger.info({ userId, videoId: video.id, status: input.status }, "video_status_updated");

    return repo.findOneOrFail({
      where: { id: video.id },
      relations: { owner: true },
    });
  }

  @Mutation(() => Video)
  @Authorized(UserRole.EDITOR, UserRole.ADMIN)
  async updateVideoVisibility(
    @Arg("input") input: UpdateVideoVisibilityInput,
    @Ctx() ctx: GraphQLContext
  ): Promise<Video> {
    if (!ctx.userId) {
      throw new GraphQLError("Authentification requise.");
    }

    const videoRepo = AppDataSource.getRepository(Video);
    const shareRepo = AppDataSource.getRepository(VideoShare);
    const userRepo = AppDataSource.getRepository(User);

    const video = await videoRepo.findOne({
      where: { id: input.id },
      relations: {
        owner: true,
        shares: { recipient: true, sender: true },
      },
    });

    if (!video) {
      throw new GraphQLError("Vidéo introuvable.");
    }

    if (!canUpdateVideo(ctx.ability, video)) {
      logger.warn({ userId: ctx.userId, videoId: video.id }, "ability_denied_update_video_visibility");
      throw new GraphQLError(
        "Vous n'êtes pas autorisé à modifier cette vidéo."
      );
    }

    let resolvedRecipients: User[] = [];

    if (input.visibility === VideoVisibility.RESTRICTED) {
      if (!input.recipients || input.recipients.length === 0) {
        throw new GraphQLError(
          "Veuillez sélectionner au moins un utilisateur pour un partage restreint."
        );
      }
      resolvedRecipients = await this.resolveRecipients(input.recipients);
    }

    video.visibility = input.visibility;
    await videoRepo.save(video);

    if (input.visibility === VideoVisibility.RESTRICTED) {
      const existingShares = await shareRepo.find({
        where: { video: { id: video.id } },
        relations: { recipient: true },
      });

      const requester = await userRepo.findOneBy({ id: ctx.userId });
      if (!requester) {
        throw new GraphQLError("Utilisateur introuvable.");
      }

      const existingByRecipientId = new Map(
        existingShares.map((share) => [share.recipient.id, share])
      );
      const desiredRecipientIds = new Set(resolvedRecipients.map((user) => user.id));

      const sharesToRemove = existingShares.filter(
        (share) => !desiredRecipientIds.has(share.recipient.id)
      );

      if (sharesToRemove.length > 0) {
        await shareRepo.remove(sharesToRemove);
      }

      for (const user of resolvedRecipients) {
        if (existingByRecipientId.has(user.id)) {
          continue;
        }

        const share = shareRepo.create({
          video,
          sender: requester,
          recipient: user,
        });
        await shareRepo.save(share);
      }
    } else {
      await shareRepo
        .createQueryBuilder()
        .delete()
        .where("videoId = :videoId", { videoId: video.id })
        .execute();
    }

    const updated = await videoRepo.findOneOrFail({
      where: { id: video.id },
      relations: {
        owner: true,
        shares: { recipient: true, sender: true },
      },
    });

    logger.info(
      {
        userId: ctx.userId,
        videoId: video.id,
        visibility: input.visibility,
        recipients: resolvedRecipients.map((user) => user.id),
      },
      "video_visibility_updated"
    );

    return updated;
  }
}

