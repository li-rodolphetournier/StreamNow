import { GraphQLError } from "graphql";
import { Arg, Authorized, Ctx, Mutation, Query, Resolver } from "type-graphql";
import { AppDataSource } from "../config/data-source";
import { Favorite } from "../entities/Favorite";
import { AddFavoriteInput } from "../inputs/AddFavoriteInput";
import { RemoveFavoriteInput } from "../inputs/RemoveFavoriteInput";
import type { GraphQLContext } from "../types/context";
import { User } from "../entities/User";
import { logger } from "../lib/logger";

@Resolver(() => Favorite)
export class FavoriteResolver {
  @Authorized()
  @Query(() => [Favorite])
  async favorites(@Ctx() ctx: GraphQLContext): Promise<Favorite[]> {
    if (!ctx.userId) {
      return [];
    }

    const repo = AppDataSource.getRepository(Favorite);
    return repo.find({
      where: { user: { id: ctx.userId } },
      order: { createdAt: "DESC" },
    });
  }

  @Authorized()
  @Mutation(() => Favorite)
  async addFavorite(
    @Arg("input") input: AddFavoriteInput,
    @Ctx() ctx: GraphQLContext
  ): Promise<Favorite> {
    if (!ctx.userId) {
      throw new GraphQLError("Authentification requise.");
    }

    const favoriteRepo = AppDataSource.getRepository(Favorite);
    const userRepo = AppDataSource.getRepository(User);

    const user = await userRepo.findOneBy({ id: ctx.userId });
    if (!user) {
      throw new GraphQLError("Utilisateur introuvable.");
    }

    let favorite = await favoriteRepo.findOne({
      where: {
        user: { id: ctx.userId },
        tmdbId: input.tmdbId,
        mediaType: input.mediaType,
      },
    });

    if (!favorite) {
      favorite = favoriteRepo.create({
        user,
        tmdbId: input.tmdbId,
        mediaType: input.mediaType,
        title: input.title,
        overview: input.overview ?? null,
        posterPath: input.posterPath ?? null,
        backdropPath: input.backdropPath ?? null,
        releaseDate: input.releaseDate ?? null,
        voteAverage: input.voteAverage ?? null,
        voteCount: input.voteCount ?? null,
        genreIds: input.genreIds ?? [],
      });
    } else {
      favorite.title = input.title;
      favorite.overview = input.overview ?? null;
      favorite.posterPath = input.posterPath ?? null;
      favorite.backdropPath = input.backdropPath ?? null;
      favorite.releaseDate = input.releaseDate ?? null;
      favorite.voteAverage = input.voteAverage ?? null;
      favorite.voteCount = input.voteCount ?? null;
      favorite.genreIds = input.genreIds ?? [];
    }

    const saved = await favoriteRepo.save(favorite);
    logger.info(
      { userId: ctx.userId, tmdbId: input.tmdbId, mediaType: input.mediaType },
      "favorite_saved"
    );

    return saved;
  }

  @Authorized()
  @Mutation(() => Boolean)
  async removeFavorite(
    @Arg("input") input: RemoveFavoriteInput,
    @Ctx() ctx: GraphQLContext
  ): Promise<boolean> {
    if (!ctx.userId) {
      throw new GraphQLError("Authentification requise.");
    }

    const favoriteRepo = AppDataSource.getRepository(Favorite);

    const result = await favoriteRepo.delete({
      user: { id: ctx.userId },
      tmdbId: input.tmdbId,
      mediaType: input.mediaType,
    });

    if (result.affected && result.affected > 0) {
      logger.info(
        { userId: ctx.userId, tmdbId: input.tmdbId, mediaType: input.mediaType },
        "favorite_removed"
      );
      return true;
    }

    return false;
  }
}


