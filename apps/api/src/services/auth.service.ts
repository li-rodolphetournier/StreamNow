import ms from "ms";
import { getRedisClient } from "../lib/redis";
import {
  createAccessToken,
  createRefreshToken,
  generateTokenId,
} from "../lib/token";
import { User, UserRole } from "../entities/User";
import { env } from "../config/env";
import { OAuthProvider, type OAuthProfile } from "../types/oauth";
import { AppDataSource } from "../config/data-source";
import { Repository } from "typeorm";

const userRepository = (): Repository<User> => AppDataSource.getRepository(User);

const durationToSeconds = (value: string): number => {
  const parsed = ms(value as ms.StringValue);
  if (typeof parsed !== "number") {
    throw new Error(`Invalid duration value: ${value}`);
  }
  return Math.floor(parsed / 1000);
};

const refreshTtlSeconds = durationToSeconds(env.refreshTokenTtl);

const refreshKey = (userId: string, tokenId: string) =>
  `refresh:${userId}:${tokenId}`;

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenId: string;
}

export class AuthService {
  async issueTokens(user: User): Promise<AuthTokens> {
    const tokenId = generateTokenId();
    const accessToken = createAccessToken(user.id, user.role, tokenId);
    const refreshToken = createRefreshToken(user.id, tokenId);

    await this.storeRefreshToken(user.id, tokenId);

    return { accessToken, refreshToken, tokenId };
  }

  async storeRefreshToken(userId: string, tokenId: string): Promise<void> {
    const client = await getRedisClient();
    await client.set(refreshKey(userId, tokenId), "1", {
      EX: refreshTtlSeconds,
    });
  }

  async isRefreshTokenValid(userId: string, tokenId: string): Promise<boolean> {
    const client = await getRedisClient();
    const exists = await client.exists(refreshKey(userId, tokenId));
    return exists === 1;
  }

  async revokeRefreshToken(userId: string, tokenId: string): Promise<void> {
    const client = await getRedisClient();
    await client.del(refreshKey(userId, tokenId));
  }

  async revokeAllSessions(userId: string): Promise<void> {
    const client = await getRedisClient();
    const pattern = `refresh:${userId}:*`;
    for await (const key of client.scanIterator({ MATCH: pattern })) {
      await client.del(key as string);
    }
  }

  async upsertOAuthUser(profile: OAuthProfile): Promise<User> {
    const repo = userRepository();

    const existingByProvider = await repo.findOne({
      where:
        profile.provider === OAuthProvider.GOOGLE
          ? { googleId: profile.providerId }
          : { facebookId: profile.providerId },
    });

    if (existingByProvider) {
      return existingByProvider;
    }

    if (profile.email) {
      const existingByEmail = await repo.findOne({
        where: { email: profile.email.toLowerCase() },
      });

      if (existingByEmail) {
        await repo.update(existingByEmail.id, {
          googleId:
            profile.provider === OAuthProvider.GOOGLE
              ? profile.providerId
              : existingByEmail.googleId,
          facebookId:
            profile.provider === OAuthProvider.FACEBOOK
              ? profile.providerId
              : existingByEmail.facebookId,
          emailVerifiedAt:
            profile.emailVerified && !existingByEmail.emailVerifiedAt
              ? new Date()
              : existingByEmail.emailVerifiedAt,
        });

        return repo.findOneByOrFail({ id: existingByEmail.id });
      }
    }

    const user = repo.create({
      email: profile.email?.toLowerCase() ?? `${profile.providerId}@${profile.provider.toLowerCase()}.oauth`,
      nickname: profile.name,
      avatarUrl: profile.avatarUrl ?? "https://placehold.co/128x128",
      role: UserRole.VIEWER,
      googleId: profile.provider === OAuthProvider.GOOGLE ? profile.providerId : undefined,
      facebookId: profile.provider === OAuthProvider.FACEBOOK ? profile.providerId : undefined,
      emailVerifiedAt: profile.emailVerified ? new Date() : undefined,
    });

    return repo.save(user);
  }
}

export const authService = new AuthService();