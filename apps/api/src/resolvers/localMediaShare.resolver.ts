import { GraphQLError } from "graphql";
import {
  Arg,
  Authorized,
  ID,
  Mutation,
  Query,
  Resolver,
  Ctx,
} from "type-graphql";
import { AppDataSource } from "../config/data-source";
import { LocalMediaShare } from "../entities/LocalMediaShare";
import { ShareLocalMediaInput } from "../inputs/ShareLocalMediaInput";
import type { GraphQLContext } from "../types/context";
import { User } from "../entities/User";
import { In } from "typeorm";
import { Friendship, FriendshipStatus } from "../entities/Friendship";

@Resolver(() => LocalMediaShare)
export class LocalMediaShareResolver {
  private shareRepo = AppDataSource.getRepository(LocalMediaShare);
  private userRepo = AppDataSource.getRepository(User);
  private friendshipRepo = AppDataSource.getRepository(Friendship);

  @Authorized()
  @Query(() => [LocalMediaShare])
  async localMediaShares(@Ctx() ctx: GraphQLContext): Promise<LocalMediaShare[]> {
    if (!ctx.userId) {
      throw new GraphQLError("Authentification requise.");
    }

    return this.shareRepo.find({
      where: { owner: { id: ctx.userId } },
      relations: { recipient: true },
      order: { createdAt: "DESC" },
    });
  }

  @Authorized()
  @Query(() => [LocalMediaShare])
  async localMediaSharesByPath(
    @Arg("path") path: string,
    @Ctx() ctx: GraphQLContext
  ): Promise<LocalMediaShare[]> {
    if (!ctx.userId) {
      throw new GraphQLError("Authentification requise.");
    }

    return this.shareRepo.find({
      where: { owner: { id: ctx.userId }, path },
      relations: { recipient: true },
      order: { createdAt: "ASC" },
    });
  }

  @Authorized()
  @Query(() => [LocalMediaShare])
  async sharedLocalMedia(@Ctx() ctx: GraphQLContext): Promise<LocalMediaShare[]> {
    if (!ctx.userId) {
      throw new GraphQLError("Authentification requise.");
    }

    return this.shareRepo.find({
      where: { recipient: { id: ctx.userId } },
      relations: { owner: true },
      order: { createdAt: "DESC" },
    });
  }

  @Authorized()
  @Mutation(() => [LocalMediaShare])
  async shareLocalMedia(
    @Arg("input") input: ShareLocalMediaInput,
    @Ctx() ctx: GraphQLContext
  ): Promise<LocalMediaShare[]> {
    if (!ctx.userId) {
      throw new GraphQLError("Authentification requise.");
    }

    const owner = await this.userRepo.findOneBy({ id: ctx.userId });
    if (!owner) {
      throw new GraphQLError("Utilisateur introuvable.");
    }

    const recipientIds = Array.from(new Set(input.recipientIds));

    if (recipientIds.length === 0) {
      await this.shareRepo
        .createQueryBuilder()
        .delete()
        .where("owner_id = :ownerId AND path = :path", {
          ownerId: owner.id,
          path: input.path,
        })
        .execute();

      return [];
    }

    const recipients = await this.userRepo.find({
      where: { id: In(recipientIds) },
    });

    if (recipients.length !== recipientIds.length) {
      const missingIds = recipientIds.filter(
        (id) => !recipients.some((user) => user.id === id)
      );
      throw new GraphQLError(
        `Impossible de trouver les utilisateurs suivants : ${missingIds.join(", ")}.`
      );
    }

    const friendships = await this.friendshipRepo.find({
      where: [
        {
          requester: { id: owner.id },
          addressee: { id: In(recipientIds) },
          status: FriendshipStatus.ACCEPTED,
        },
        {
          requester: { id: In(recipientIds) },
          addressee: { id: owner.id },
          status: FriendshipStatus.ACCEPTED,
        },
      ],
      relations: { requester: true, addressee: true },
    });

    const acceptedIds = new Set<string>();
    for (const friendship of friendships) {
      if (friendship.requester.id === owner.id) {
        acceptedIds.add(friendship.addressee.id);
      } else if (friendship.addressee.id === owner.id) {
        acceptedIds.add(friendship.requester.id);
      }
    }

    const invalidRecipients = recipients
      .map((user) => user.id)
      .filter((id) => !acceptedIds.has(id));

    if (invalidRecipients.length > 0) {
      throw new GraphQLError(
        "Vous ne pouvez partager qu'avec vos amis confirmés."
      );
    }

    const existingShares = await this.shareRepo.find({
      where: { owner: { id: owner.id }, path: input.path },
      relations: { recipient: true },
    });

    const existingByRecipient = new Map(
      existingShares.map((share) => [share.recipient.id, share])
    );

    const desiredRecipientIds = new Set(recipientIds);

    const sharesToRemove = existingShares.filter(
      (share) => !desiredRecipientIds.has(share.recipient.id)
    );
    if (sharesToRemove.length > 0) {
      await this.shareRepo.remove(sharesToRemove);
    }

    for (const recipient of recipients) {
      const existing = existingByRecipient.get(recipient.id);
      if (existing) {
        if (existing.isDirectory !== input.isDirectory) {
          existing.isDirectory = input.isDirectory;
          await this.shareRepo.save(existing);
        }
        continue;
      }

      const share = this.shareRepo.create({
        owner,
        recipient,
        path: input.path,
        isDirectory: input.isDirectory,
      });
      await this.shareRepo.save(share);
    }

    return this.shareRepo.find({
      where: { owner: { id: owner.id }, path: input.path },
      relations: { recipient: true },
      order: { createdAt: "ASC" },
    });
  }

  @Authorized()
  @Mutation(() => Boolean)
  async revokeLocalMediaShare(
    @Arg("id", () => ID) id: string,
    @Ctx() ctx: GraphQLContext
  ): Promise<boolean> {
    if (!ctx.userId) {
      throw new GraphQLError("Authentification requise.");
    }

    const share = await this.shareRepo.findOne({
      where: { id },
      relations: { owner: true },
    });

    if (!share) {
      return false;
    }

    if (share.owner.id !== ctx.userId) {
      throw new GraphQLError("Vous ne pouvez pas modifier ce partage.");
    }

    await this.shareRepo.remove(share);
    return true;
  }
}

