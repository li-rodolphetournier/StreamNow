import { registerEnumType } from "type-graphql";

export enum OAuthProvider {
  GOOGLE = "GOOGLE",
  FACEBOOK = "FACEBOOK",
}

registerEnumType(OAuthProvider, {
  name: "OAuthProvider",
});

export interface OAuthProfile {
  provider: OAuthProvider;
  providerId: string;
  email?: string;
  name?: string;
  avatarUrl?: string;
  emailVerified?: boolean;
}
