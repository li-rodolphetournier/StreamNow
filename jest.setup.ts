import "@testing-library/jest-dom";

if (!process.env.NEXT_PUBLIC_TMDB_API_KEY) {
  process.env.NEXT_PUBLIC_TMDB_API_KEY = "test-key";
}
