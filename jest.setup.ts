import "@testing-library/jest-dom";

if (!process.env.NEXT_PUBLIC_TMDB_API_KEY) {
  process.env.NEXT_PUBLIC_TMDB_API_KEY = "test-key";
}

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem(key: string) {
      return store[key] ?? null;
    },
    setItem(key: string, value: string) {
      store[key] = value;
    },
    removeItem(key: string) {
      delete store[key];
    },
    clear() {
      store = {};
    },
  };
})();

Object.defineProperty(global, "localStorage", {
  value: localStorageMock,
});

