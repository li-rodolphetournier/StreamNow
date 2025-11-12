import algoliasearch, {
  type SearchClient,
  type SearchIndex,
} from "algoliasearch";
import { env } from "../config/env";
import { logger } from "../lib/logger";
import type { Video } from "../entities/Video";
import { VideoStatus, VideoVisibility } from "../entities/Video";

interface AlgoliaVideoRecord {
  objectID: string;
  title: string;
  slug: string;
  overview?: string | null;
  posterUrl?: string | null;
  backdropUrl?: string | null;
  releaseDate?: string | null;
  mediaType: string;
  visibility: string;
  status: string;
  ownerId?: string | null;
  createdAt: string;
  popularity?: number | null;
  tmdbId?: number | null;
}

class AlgoliaService {
  private readonly enabled: boolean;
  private readonly client?: SearchClient;
  private readonly index?: SearchIndex;

  constructor() {
    if (
      env.algoliaAppId &&
      env.algoliaAdminApiKey &&
      env.algoliaIndexName
    ) {
      try {
        this.client = algoliasearch(env.algoliaAppId, env.algoliaAdminApiKey);
        this.index = this.client.initIndex(env.algoliaIndexName);
        this.enabled = true;
        logger.info(
          { indexName: env.algoliaIndexName },
          "Algolia indexing enabled"
        );
      } catch (error) {
        logger.error({ err: error }, "Failed to initialize Algolia client");
        this.enabled = false;
      }
    } else {
      this.enabled = false;
      logger.warn(
        "Algolia environment variables are not fully defined. Search integration is disabled."
      );
    }
  }

  private canIndex(video: Video): boolean {
    if (!this.enabled) {
      return false;
    }

    if (video.status !== VideoStatus.PUBLISHED) {
      return false;
    }

    if (video.visibility === VideoVisibility.PRIVATE) {
      return false;
    }

    return true;
  }

  private toRecord(video: Video): AlgoliaVideoRecord | null {
    if (!this.canIndex(video)) {
      return null;
    }

    return {
      objectID: video.id,
      title: video.title,
      slug: video.slug,
      overview: video.overview ?? null,
      posterUrl: video.posterUrl ?? null,
      backdropUrl: video.backdropUrl ?? null,
      releaseDate: video.releaseDate ?? null,
      mediaType: video.mediaType,
      visibility: video.visibility,
      status: video.status,
      ownerId: video.ownerId ?? video.owner?.id ?? null,
      createdAt: video.createdAt.toISOString(),
      popularity:
        typeof video.metadata === "object" && video.metadata
          ? (video.metadata["popularity"] as number | null | undefined) ?? null
          : null,
      tmdbId: video.tmdbId ?? null,
    };
  }

  async syncVideo(video: Video): Promise<void> {
    if (!this.enabled || !this.index) {
      return;
    }

    const record = this.toRecord(video);
    if (!record) {
      await this.deleteVideo(video.id);
      return;
    }

    try {
      await this.index.saveObject(record);
    } catch (error) {
      logger.error(
        { err: error, videoId: video.id },
        "Failed to index video in Algolia"
      );
    }
  }

  async deleteVideo(videoId: string): Promise<void> {
    if (!this.enabled || !this.index) {
      return;
    }

    try {
      await this.index.deleteObject(videoId);
    } catch (error) {
      logger.error(
        { err: error, videoId },
        "Failed to delete video from Algolia"
      );
    }
  }

  async search(query: string): Promise<AlgoliaVideoRecord[]> {
    if (!this.enabled || !this.index) {
      return [];
    }

    try {
      const result = await this.index.search<AlgoliaVideoRecord>(query, {
        hitsPerPage: 20,
      });
      return result.hits ?? [];
    } catch (error) {
      logger.error({ err: error }, "Algolia search error");
      return [];
    }
  }

  get isEnabled(): boolean {
    return this.enabled;
  }
}

export const algoliaService = new AlgoliaService();


