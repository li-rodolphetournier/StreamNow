import jwt, { type SignOptions } from "jsonwebtoken";
import { randomUUID } from "crypto";
import { env } from "../config/env";
import { UserRole } from "../entities/User";

export interface AccessTokenPayload {
  sub: string;
  role: UserRole;
  tokenId: string;
}

export interface RefreshTokenPayload {
  sub: string;
  tokenId: string;
}

const sign = (payload: object, secret: string, options: SignOptions) => {
  return jwt.sign(payload, secret, options);
};

const expiresInValue = (ttl: string): SignOptions["expiresIn"] => ttl as SignOptions["expiresIn"];

export const createAccessToken = (
  userId: string,
  role: UserRole,
  tokenId: string
): string => {
  return sign(
    { sub: userId, role, tokenId },
    env.jwtSecret,
    {
      expiresIn: expiresInValue(env.accessTokenTtl),
    }
  );
};

export const createRefreshToken = (userId: string, tokenId: string): string => {
  return sign(
    { sub: userId, tokenId },
    env.refreshTokenSecret,
    {
      expiresIn: expiresInValue(env.refreshTokenTtl),
    }
  );
};

export const generateTokenId = (): string => randomUUID();

export const verifyAccessToken = (token: string): AccessTokenPayload | null => {
  try {
    return jwt.verify(token, env.jwtSecret) as AccessTokenPayload;
  } catch {
    return null;
  }
};

export const verifyRefreshToken = (
  token: string
): RefreshTokenPayload | null => {
  try {
    return jwt.verify(token, env.refreshTokenSecret) as RefreshTokenPayload;
  } catch {
    return null;
  }
};
