import { test, expect } from "@playwright/test";

const mockMovie = {
  id: 100,
  title: "Mock Movie",
  overview: "An action packed adventure.",
  poster_path: "/poster.jpg",
  backdrop_path: "/backdrop.jpg",
  release_date: "2024-01-01",
  vote_average: 8.5,
  vote_count: 1200,
  genre_ids: [28, 12],
  adult: false,
  original_language: "en",
  original_title: "Mock Movie",
  popularity: 300,
  video: false,
  media_type: "movie" as const,
};

const mockShow = {
  id: 200,
  name: "Mock Show",
  overview: "A gripping drama series.",
  poster_path: "/poster-tv.jpg",
  backdrop_path: "/backdrop-tv.jpg",
  first_air_date: "2023-09-15",
  vote_average: 7.9,
  vote_count: 640,
  genre_ids: [18],
  adult: false,
  original_language: "en",
  original_name: "Mock Show",
  popularity: 180,
  origin_country: ["US"],
  media_type: "tv" as const,
};

const toListResponse = <T,>(results: T[]) => ({
  page: 1,
  results,
  total_pages: 1,
  total_results: results.length,
});

test.beforeEach(async ({ page }) => {
  await page.route("https://api.themoviedb.org/**", async (route) => {
    const url = route.request().url();

    if (url.includes("/trending/movie/day")) {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(toListResponse([mockMovie])),
      });
      return;
    }

    if (url.includes("/movie/popular")) {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(toListResponse([mockMovie])),
      });
      return;
    }

    if (url.includes("/tv/popular") || url.includes("/trending/tv/day")) {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(toListResponse([mockShow])),
      });
      return;
    }

    if (url.includes(`/movie/${mockMovie.id}/videos`)) {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          id: mockMovie.id,
          results: [
            {
              id: "trailer1",
              key: "abcd1234",
              name: "Official Trailer",
              site: "YouTube",
              size: 1080,
              type: "Trailer",
              official: true,
              iso_639_1: "en",
            },
          ],
        }),
      });
      return;
    }

    if (url.includes(`/movie/${mockMovie.id}`)) {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          id: mockMovie.id,
          title: mockMovie.title,
          overview: "Detailed overview",
          poster_path: mockMovie.poster_path,
          backdrop_path: mockMovie.backdrop_path,
          release_date: mockMovie.release_date,
          vote_average: mockMovie.vote_average,
          vote_count: mockMovie.vote_count,
          genres: [
            { id: 28, name: "Action" },
            { id: 12, name: "Aventure" },
          ],
          production_companies: [],
          credits: { cast: [], crew: [] },
          runtime: 122,
          popularity: mockMovie.popularity,
          similar: toListResponse([mockMovie]),
          recommendations: toListResponse([mockMovie]),
        }),
      });
      return;
    }

    if (url.includes("/genre/movie/list")) {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          genres: [
            { id: 28, name: "Action" },
            { id: 12, name: "Aventure" },
          ],
        }),
      });
      return;
    }

    if (url.includes("/genre/tv/list")) {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          genres: [{ id: 18, name: "Drame" }],
        }),
      });
      return;
    }

    if (url.includes("/discover/movie") || url.includes("/search/multi")) {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(toListResponse([mockMovie])),
      });
      return;
    }

    // Default empty response for any other TMDB calls
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(toListResponse([])),
    });
  });
});

test("user can start playback from hero section", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: mockMovie.title, level: 1 })
  ).toBeVisible();

  await page.getByRole("link", { name: /Regarder/i }).click();
  await expect(page).toHaveURL(/\/video\/100\?type=movie&play=true/);
  await expect(
    page.getByLabel(`Lecteur vidéo pour ${mockMovie.title}`)
  ).toBeVisible();
});

test("user can add a favorite and see it on favorites page", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: mockMovie.title, level: 1 })
  ).toBeVisible();
  await page
    .getByRole("button", { name: /Ajouter aux favoris/i })
    .first()
    .click();

  await page.goto("/favorites");
  await expect(page.getByText(mockMovie.title)).toBeVisible();

  await page.reload();
  await expect(page.getByText(mockMovie.title)).toBeVisible();
});

test("search page displays filtered results", async ({ page }) => {
  await page.goto(
    "/search?q=mock&type=movie&genre=28&sort=vote_average"
  );

  await expect(
    page.getByRole("heading", { name: /Résultats pour "mock"/i })
  ).toBeVisible();
  await expect(page.getByText(mockMovie.title)).toBeVisible();
  await expect(page.getByText(/Type : Films/)).toBeVisible();
  await expect(page.getByText(/Genre : Action/)).toBeVisible();
});

test("offline page is available", async ({ page }) => {
  await page.goto("/offline");
  await expect(page.getByText(/Vous êtes hors ligne/i)).toBeVisible();
});


