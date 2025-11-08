const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const FACEBOOK_AUTH_URL = "https://www.facebook.com/v18.0/dialog/oauth";

export type OAuthProvider = "google" | "facebook";

const STATE_KEY = "streamnow.oauth.state";

interface OAuthStatePayload {
  value: string;
  redirect?: string;
}

const getClientId = (provider: OAuthProvider): string | undefined => {
  if (provider === "google") {
    return process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  }
  return process.env.NEXT_PUBLIC_FACEBOOK_CLIENT_ID;
};

const getRedirectUri = (provider: OAuthProvider): string | undefined => {
  const base = process.env.NEXT_PUBLIC_OAUTH_REDIRECT_URI;
  if (!base) {
    return undefined;
  }
  return `${base.replace(/\/$/, "")}/${provider}`;
};

export const generateState = (redirect?: string): string => {
  const payload: OAuthStatePayload = {
    value: crypto.randomUUID(),
    redirect,
  };
  if (typeof window !== "undefined") {
    sessionStorage.setItem(STATE_KEY, JSON.stringify(payload));
  }
  return payload.value;
};

export const validateState = (state: string | null): boolean => {
  if (typeof window === "undefined") {
    return false;
  }
  const stored = sessionStorage.getItem(STATE_KEY);
  sessionStorage.removeItem(STATE_KEY);
  if (!state || !stored) {
    return false;
  }
  try {
    const parsed = JSON.parse(stored) as OAuthStatePayload;
    return parsed.value === state;
  } catch {
    return false;
  }
};

export const consumeRedirectAfterState = (): string | undefined => {
  if (typeof window === "undefined") {
    return undefined;
  }
  const stored = sessionStorage.getItem(STATE_KEY);
  if (!stored) {
    return undefined;
  }
  try {
    const parsed = JSON.parse(stored) as OAuthStatePayload;
    return parsed.redirect;
  } catch {
    return undefined;
  }
};

export const buildOAuthUrl = (provider: OAuthProvider, redirect?: string): string | null => {
  const clientId = getClientId(provider);
  const redirectUri = getRedirectUri(provider);

  if (!clientId || !redirectUri) {
    return null;
  }

  const state = generateState(redirect);

  if (provider === "google") {
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid email profile",
      access_type: "offline",
      include_granted_scopes: "true",
      state,
      prompt: "consent",
    });
    return `${GOOGLE_AUTH_URL}?${params.toString()}`;
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "email,public_profile",
    state,
    auth_type: "rerequest",
  });
  return `${FACEBOOK_AUTH_URL}?${params.toString()}`;
};
