let inMemoryToken: string | null = null;

const STORAGE_KEY = "streamnow.access_token";

const isBrowser = () => typeof window !== "undefined";

export const getAccessToken = (): string | null => {
  if (inMemoryToken) {
    return inMemoryToken;
  }

  if (isBrowser()) {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      inMemoryToken = stored;
      return stored;
    }
  }

  return null;
};

export const setAccessToken = (token: string | null): void => {
  inMemoryToken = token;
  if (!isBrowser()) {
    return;
  }

  if (token) {
    window.localStorage.setItem(STORAGE_KEY, token);
  } else {
    window.localStorage.removeItem(STORAGE_KEY);
  }
};

export const clearAccessToken = (): void => {
  setAccessToken(null);
};
