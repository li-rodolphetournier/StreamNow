import axios from "axios";
import { env } from "../config/env";
import { OAuthProvider, type OAuthProfile } from "../types/oauth";
import { logger } from "../lib/logger";

interface GoogleTokenResponse {
  access_token: string;
  id_token?: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
}

interface GoogleUserInfo {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
}

interface FacebookTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface FacebookUserInfo {
  id: string;
  email?: string;
  name?: string;
  picture?: {
    data?: {
      url?: string;
    };
  };
}

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";
const FACEBOOK_TOKEN_URL = "https://graph.facebook.com/v18.0/oauth/access_token";
const FACEBOOK_USERINFO_URL = "https://graph.facebook.com/me";

export class OAuthService {
  async authenticate(
    provider: OAuthProvider,
    code: string,
    redirectUri?: string
  ): Promise<OAuthProfile | null> {
    switch (provider) {
      case OAuthProvider.GOOGLE:
        return this.handleGoogle(code, redirectUri);
      case OAuthProvider.FACEBOOK:
        return this.handleFacebook(code, redirectUri);
      default:
        return null;
    }
  }

  private resolveRedirectUri(
    provider: "google" | "facebook",
    override?: string
  ): string | undefined {
    if (override) {
      return override;
    }

    if (provider === "google") {
      return env.googleRedirectUri;
    }

    return env.facebookRedirectUri;
  }

  private async handleGoogle(
    code: string,
    overrideRedirect?: string
  ): Promise<OAuthProfile | null> {
    if (!env.googleClientId || !env.googleClientSecret) {
      logger.warn("Google OAuth configuration missing");
      return null;
    }

    const redirectUri = this.resolveRedirectUri("google", overrideRedirect);
    if (!redirectUri) {
      logger.warn("Google redirect URI missing");
      return null;
    }

    try {
      const tokenResponse = await axios.post<GoogleTokenResponse>(
        GOOGLE_TOKEN_URL,
        new URLSearchParams({
          client_id: env.googleClientId,
          client_secret: env.googleClientSecret,
          code,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }).toString(),
        {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        }
      );

      const accessToken = tokenResponse.data.access_token;
      if (!accessToken) {
        return null;
      }

      const userInfoResponse = await axios.get<GoogleUserInfo>(GOOGLE_USERINFO_URL, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const profile = userInfoResponse.data;
      return {
        provider: OAuthProvider.GOOGLE,
        providerId: profile.sub,
        email: profile.email,
        name: profile.name,
        avatarUrl: profile.picture,
        emailVerified: profile.email_verified,
      };
    } catch (error) {
      logger.error({ error }, "google_oauth_failed");
      return null;
    }
  }

  private async handleFacebook(
    code: string,
    overrideRedirect?: string
  ): Promise<OAuthProfile | null> {
    if (!env.facebookClientId || !env.facebookClientSecret) {
      logger.warn("Facebook OAuth configuration missing");
      return null;
    }

    const redirectUri = this.resolveRedirectUri("facebook", overrideRedirect);
    if (!redirectUri) {
      logger.warn("Facebook redirect URI missing");
      return null;
    }

    try {
      const tokenResponse = await axios.get<FacebookTokenResponse>(FACEBOOK_TOKEN_URL, {
        params: {
          client_id: env.facebookClientId,
          client_secret: env.facebookClientSecret,
          redirect_uri: redirectUri,
          code,
        },
      });

      const accessToken = tokenResponse.data.access_token;
      if (!accessToken) {
        return null;
      }

      const userInfoResponse = await axios.get<FacebookUserInfo>(FACEBOOK_USERINFO_URL, {
        params: {
          access_token: accessToken,
          fields: "id,name,email,picture",
        },
      });

      const profile = userInfoResponse.data;
      return {
        provider: OAuthProvider.FACEBOOK,
        providerId: profile.id,
        email: profile.email,
        name: profile.name,
        avatarUrl: profile.picture?.data?.url,
        emailVerified: Boolean(profile.email),
      };
    } catch (error) {
      logger.error({ error }, "facebook_oauth_failed");
      return null;
    }
  }
}

export const oauthService = new OAuthService();
