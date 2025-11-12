import {
  Arg,
  Ctx,
  Mutation,
  Query,
  Resolver,
  Authorized,
  ID,
} from "type-graphql";
import { Repository } from "typeorm";
import { hash, verify } from "argon2";
import { AppDataSource } from "../config/data-source";
import { User, UserRole } from "../entities/User";
import { SignUpInput } from "../inputs/SignUpInput";
import { SignInInput } from "../inputs/SignInInput";
import type { GraphQLContext } from "../types/context";
import { AuthPayload } from "../outputs/AuthPayload";
import { authService } from "../services/auth.service";
import { verifyRefreshToken } from "../lib/token";
import { GraphQLError } from "graphql";
import { OAuthSignInInput } from "../inputs/OAuthSignInInput";
import { oauthService } from "../services/oauth.service";
import { UpdateProfileInput } from "../inputs/UpdateProfileInput";
import type { Response } from "express";

const REFRESH_COOKIE_NAME = "refreshToken";

const buildCookieOptions = () => ({
  httpOnly: true,
  sameSite: "strict" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
});

const setRefreshCookie = (res: Response, refreshToken: string) => {
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, buildCookieOptions());
};

const clearRefreshCookie = (res: Response) => {
  res.clearCookie(REFRESH_COOKIE_NAME, buildCookieOptions());
};

@Resolver(() => User)
export class AuthResolver {
  private userRepository: Repository<User>;

  constructor() {
    this.userRepository = AppDataSource.getRepository(User);
  }

  @Mutation(() => AuthPayload)
  async signUp(
    @Arg("input") input: SignUpInput,
    @Ctx() ctx: GraphQLContext
  ): Promise<AuthPayload> {
    const existing = await this.userRepository.findOne({
      where: { email: input.email.toLowerCase() },
    });

    if (existing) {
      throw new GraphQLError("Un compte existe déjà avec cet email.");
    }

    const passwordHash = await hash(input.password);

    const user = this.userRepository.create({
      email: input.email.toLowerCase(),
      passwordHash,
      nickname: input.nickname ?? undefined,
      role: UserRole.EDITOR,
      avatarUrl: "https://placehold.co/128x128",
    });

    await this.userRepository.save(user);

    const tokens = await authService.issueTokens(user);
    setRefreshCookie(ctx.res, tokens.refreshToken);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user,
    };
  }

  @Mutation(() => AuthPayload)
  async signIn(
    @Arg("input") input: SignInInput,
    @Ctx() ctx: GraphQLContext
  ): Promise<AuthPayload> {
    const user = await this.userRepository.findOne({
      where: { email: input.email.toLowerCase() },
    });

    if (!user || !user.passwordHash) {
      throw new GraphQLError("Identifiants invalides.");
    }

    const isValid = await verify(user.passwordHash, input.password);
    if (!isValid) {
      throw new GraphQLError("Identifiants invalides.");
    }

    const tokens = await authService.issueTokens(user);
    setRefreshCookie(ctx.res, tokens.refreshToken);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user,
    };
  }

  @Mutation(() => AuthPayload)
  async oauthSignIn(
    @Arg("input") input: OAuthSignInInput,
    @Ctx() ctx: GraphQLContext
  ): Promise<AuthPayload> {
    const profile = await oauthService.authenticate(
      input.provider,
      input.code,
      input.redirectUri
    );

    if (!profile) {
      throw new GraphQLError("Impossible de terminer l'authentification OAuth.");
    }

    const user = await authService.upsertOAuthUser(profile);
    const tokens = await authService.issueTokens(user);
    setRefreshCookie(ctx.res, tokens.refreshToken);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user,
    };
  }

  @Mutation(() => AuthPayload)
  async refreshToken(@Ctx() ctx: GraphQLContext): Promise<AuthPayload> {
    const refreshToken = ctx.req.cookies?.[REFRESH_COOKIE_NAME];

    if (!refreshToken) {
      throw new GraphQLError("Refresh token manquant.");
    }

    const payload = verifyRefreshToken(refreshToken);
    if (!payload) {
      throw new GraphQLError("Refresh token invalide.");
    }

    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new GraphQLError("Utilisateur introuvable.");
    }

    const isValid = await authService.isRefreshTokenValid(user.id, payload.tokenId);
    if (!isValid) {
      throw new GraphQLError("Session expirée, veuillez vous reconnecter.");
    }

    await authService.revokeRefreshToken(user.id, payload.tokenId);

    const tokens = await authService.issueTokens(user);
    setRefreshCookie(ctx.res, tokens.refreshToken);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user,
    };
  }

  @Mutation(() => Boolean)
  async signOut(@Ctx() ctx: GraphQLContext): Promise<boolean> {
    const refreshToken = ctx.req.cookies?.[REFRESH_COOKIE_NAME];
    if (refreshToken) {
      const payload = verifyRefreshToken(refreshToken);
      if (payload) {
        await authService.revokeRefreshToken(payload.sub, payload.tokenId);
      }
    }
    clearRefreshCookie(ctx.res);
    return true;
  }

  @Authorized()
  @Query(() => User, { nullable: true })
  async me(@Ctx() ctx: GraphQLContext): Promise<User | null> {
    if (!ctx.userId) {
      return null;
    }

    return this.userRepository.findOne({ where: { id: ctx.userId } });
  }

  @Authorized()
  @Query(() => User, { nullable: true })
  async userById(@Arg("id", () => ID) id: string): Promise<User | null> {
    if (!id) {
      return null;
    }

    return this.userRepository.findOne({ where: { id } });
  }

  @Authorized()
  @Mutation(() => User)
  async updateProfile(
    @Arg("input") input: UpdateProfileInput,
    @Ctx() ctx: GraphQLContext
  ): Promise<User> {
    if (!ctx.userId) {
      throw new GraphQLError("Authentification requise.");
    }

    const user = await this.userRepository.findOne({
      where: { id: ctx.userId },
    });

    if (!user) {
      throw new GraphQLError("Utilisateur introuvable.");
    }

    if (typeof input.nickname === "string") {
      const trimmed = input.nickname.trim();
      user.nickname = trimmed.length > 0 ? trimmed : null;
    }

    if (typeof input.avatarUrl === "string") {
      const trimmed = input.avatarUrl.trim();
      user.avatarUrl = trimmed.length > 0 ? trimmed : user.avatarUrl;
    }

    if (typeof input.bio === "string") {
      const trimmed = input.bio.trim();
      user.bio = trimmed.length > 0 ? trimmed : null;
    }

    await this.userRepository.save(user);
    return user;
  }
}
