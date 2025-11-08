import { GraphQLError } from "graphql";
import {
  Arg,
  Authorized,
  Ctx,
  ID,
  Mutation,
  Query,
  Resolver,
} from "type-graphql";
import { AppDataSource } from "../config/data-source";
import { Friendship, FriendshipStatus } from "../entities/Friendship";
import { User } from "../entities/User";
import type { GraphQLContext } from "../types/context";
import { FriendPayload, FriendRequestPayload } from "../outputs/FriendPayload";
import { FriendRequestInput } from "../inputs/FriendRequestInput";
import { RespondFriendRequestInput } from "../inputs/RespondFriendRequestInput";

@Resolver()
export class FriendshipResolver {
  private friendshipRepository = AppDataSource.getRepository(Friendship);
  private userRepository = AppDataSource.getRepository(User);

  private toFriendPayload(friendship: Friendship, viewerId: string): FriendPayload {
    const friend =
      friendship.requester.id === viewerId
        ? friendship.addressee
        : friendship.requester;

    return {
      id: friendship.id,
      friend,
      status: friendship.status,
      createdAt: friendship.createdAt,
    };
  }

  private toFriendRequestPayload(
    friendship: Friendship,
    viewerId: string
  ): FriendRequestPayload {
    const user =
      friendship.requester.id === viewerId
        ? friendship.addressee
        : friendship.requester;

    return {
      id: friendship.id,
      user,
      status: friendship.status,
      createdAt: friendship.createdAt,
    };
  }

  @Authorized()
  @Query(() => [FriendPayload])
  async friends(@Ctx() ctx: GraphQLContext): Promise<FriendPayload[]> {
    const { userId } = ctx;
    if (!userId) {
      return [];
    }

    const friendships = await this.friendshipRepository.find({
      where: [
        {
          requester: { id: userId },
          status: FriendshipStatus.ACCEPTED,
        },
        {
          addressee: { id: userId },
          status: FriendshipStatus.ACCEPTED,
        },
      ],
      relations: { requester: true, addressee: true },
      order: { createdAt: "DESC" },
    });

    return friendships.map((friendship) =>
      this.toFriendPayload(friendship, userId)
    );
  }

  @Authorized()
  @Query(() => [FriendRequestPayload])
  async incomingFriendRequests(
    @Ctx() ctx: GraphQLContext
  ): Promise<FriendRequestPayload[]> {
    const { userId } = ctx;
    if (!userId) {
      return [];
    }

    const requests = await this.friendshipRepository.find({
      where: {
        addressee: { id: userId },
        status: FriendshipStatus.PENDING,
      },
      relations: { requester: true, addressee: true },
      order: { createdAt: "DESC" },
    });

    return requests.map((friendship) =>
      this.toFriendRequestPayload(friendship, userId)
    );
  }

  @Authorized()
  @Query(() => [FriendRequestPayload])
  async outgoingFriendRequests(
    @Ctx() ctx: GraphQLContext
  ): Promise<FriendRequestPayload[]> {
    const { userId } = ctx;
    if (!userId) {
      return [];
    }

    const requests = await this.friendshipRepository.find({
      where: {
        requester: { id: userId },
        status: FriendshipStatus.PENDING,
      },
      relations: { requester: true, addressee: true },
      order: { createdAt: "DESC" },
    });

    return requests.map((friendship) =>
      this.toFriendRequestPayload(friendship, userId)
    );
  }

  @Authorized()
  @Mutation(() => FriendRequestPayload)
  async requestFriend(
    @Arg("input") input: FriendRequestInput,
    @Ctx() ctx: GraphQLContext
  ): Promise<FriendRequestPayload> {
    const { userId } = ctx;
    if (!userId) {
      throw new GraphQLError("Authentification requise.");
    }

    if (!input.email && !input.nickname) {
      throw new GraphQLError(
        "Veuillez fournir un email ou un pseudo pour ajouter un ami."
      );
    }

    const currentUser = await this.userRepository.findOneBy({ id: userId });
    if (!currentUser) {
      throw new GraphQLError("Utilisateur introuvable.");
    }

    const criteria = [];
    if (input.email) {
      criteria.push({ email: input.email.toLowerCase() });
    }
    if (input.nickname) {
      criteria.push({ nickname: input.nickname });
    }

    const targetUser = await this.userRepository.findOne({
      where: criteria,
    });

    if (!targetUser) {
      throw new GraphQLError(
        "Impossible de trouver un utilisateur avec ces informations."
      );
    }

    if (targetUser.id === userId) {
      throw new GraphQLError("Vous ne pouvez pas vous ajouter vous-même.");
    }

    const existing = await this.friendshipRepository.findOne({
      where: [
        {
          requester: { id: userId },
          addressee: { id: targetUser.id },
        },
        {
          requester: { id: targetUser.id },
          addressee: { id: userId },
        },
      ],
      relations: { requester: true, addressee: true },
    });

    if (existing) {
      if (existing.status === FriendshipStatus.ACCEPTED) {
        throw new GraphQLError("Vous êtes déjà amis.");
      }

      if (
        existing.requester.id === targetUser.id &&
        existing.status === FriendshipStatus.PENDING
      ) {
        existing.status = FriendshipStatus.ACCEPTED;
        const saved = await this.friendshipRepository.save(existing);
        return this.toFriendRequestPayload(saved, userId);
      }

      if (
        existing.requester.id === userId &&
        existing.status === FriendshipStatus.PENDING
      ) {
        return this.toFriendRequestPayload(existing, userId);
      }
    }

    const friendship = this.friendshipRepository.create({
      requester: currentUser,
      addressee: targetUser,
      status: FriendshipStatus.PENDING,
    });
    const saved = await this.friendshipRepository.save(friendship);

    return this.toFriendRequestPayload(saved, userId);
  }

  @Authorized()
  @Mutation(() => FriendPayload, { nullable: true })
  async respondFriendRequest(
    @Arg("input") input: RespondFriendRequestInput,
    @Ctx() ctx: GraphQLContext
  ): Promise<FriendPayload | null> {
    const { userId } = ctx;
    if (!userId) {
      throw new GraphQLError("Authentification requise.");
    }

    const request = await this.friendshipRepository.findOne({
      where: { id: input.id, addressee: { id: userId } },
      relations: { requester: true, addressee: true },
    });

    if (!request || request.status !== FriendshipStatus.PENDING) {
      throw new GraphQLError("Demande d'ami introuvable ou déjà traitée.");
    }

    if (input.accept) {
      request.status = FriendshipStatus.ACCEPTED;
      const saved = await this.friendshipRepository.save(request);
      return this.toFriendPayload(saved, userId);
    }

    await this.friendshipRepository.remove(request);
    return null;
  }

  @Authorized()
  @Mutation(() => Boolean)
  async removeFriend(
    @Arg("friendId", () => ID) friendId: string,
    @Ctx() ctx: GraphQLContext
  ): Promise<boolean> {
    const { userId } = ctx;
    if (!userId) {
      throw new GraphQLError("Authentification requise.");
    }

    const friendship = await this.friendshipRepository.findOne({
      where: [
        {
          requester: { id: userId },
          addressee: { id: friendId },
          status: FriendshipStatus.ACCEPTED,
        },
        {
          requester: { id: friendId },
          addressee: { id: userId },
          status: FriendshipStatus.ACCEPTED,
        },
      ],
      relations: { requester: true, addressee: true },
    });

    if (!friendship) {
      return false;
    }

    await this.friendshipRepository.remove(friendship);
    return true;
  }

  @Authorized()
  @Mutation(() => Boolean)
  async cancelFriendRequest(
    @Arg("requestId", () => ID) requestId: string,
    @Ctx() ctx: GraphQLContext
  ): Promise<boolean> {
    const { userId } = ctx;
    if (!userId) {
      throw new GraphQLError("Authentification requise.");
    }

    const request = await this.friendshipRepository.findOne({
      where: {
        id: requestId,
        requester: { id: userId },
        status: FriendshipStatus.PENDING,
      },
    });

    if (!request) {
      return false;
    }

    await this.friendshipRepository.remove(request);
    return true;
  }
}


