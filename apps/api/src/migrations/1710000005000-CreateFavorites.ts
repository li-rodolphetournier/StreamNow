import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateFavorites1710000005000 implements MigrationInterface {
  name = "CreateFavorites1710000005000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "favorites" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tmdb_id" integer NOT NULL,
        "media_type" text NOT NULL,
        "title" text NOT NULL,
        "overview" text,
        "poster_path" text,
        "backdrop_path" text,
        "release_date" text,
        "vote_average" double precision,
        "vote_count" integer,
        "genre_ids" jsonb NOT NULL DEFAULT '[]',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "user_id" uuid NOT NULL,
        CONSTRAINT "PK_favorites_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_favorites_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_favorite_user_tmdb" ON "favorites" ("user_id", "tmdb_id", "media_type")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "UQ_favorite_user_tmdb"`);
    await queryRunner.query(`DROP TABLE "favorites"`);
  }
}


