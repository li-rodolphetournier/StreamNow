import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1710000000000 implements MigrationInterface {
  name = "InitialSchema1710000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "email" character varying NOT NULL,
        "password_hash" character varying,
        "role" character varying NOT NULL DEFAULT 'viewer',
        "nickname" character varying,
        "avatar_url" character varying NOT NULL DEFAULT 'https://placehold.co/128x128',
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_users_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_users_email" UNIQUE ("email")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "videos" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tmdb_id" integer NOT NULL,
        "title" character varying NOT NULL,
        "slug" character varying NOT NULL,
        "media_type" character varying NOT NULL,
        "tagline" character varying,
        "overview" text,
        "release_date" character varying,
        "poster_url" character varying,
        "backdrop_url" character varying,
        "trailer_url" character varying,
        "status" character varying NOT NULL DEFAULT 'draft',
        "metadata" text NOT NULL DEFAULT '{}',
        "owner_id" uuid,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_videos_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_videos_slug" UNIQUE ("slug")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "friendships" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "status" character varying NOT NULL DEFAULT 'pending',
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "requesterId" uuid,
        "addresseeId" uuid,
        CONSTRAINT "PK_friendships_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_friendship_users" UNIQUE ("requesterId", "addresseeId")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "video_shares" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "message" text,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "videoId" uuid,
        "senderId" uuid,
        "recipientId" uuid,
        CONSTRAINT "PK_video_shares_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "videos"
      ADD CONSTRAINT "FK_videos_owner" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "friendships"
      ADD CONSTRAINT "FK_friendships_requester" FOREIGN KEY ("requesterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "friendships"
      ADD CONSTRAINT "FK_friendships_addressee" FOREIGN KEY ("addresseeId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "video_shares"
      ADD CONSTRAINT "FK_video_shares_video" FOREIGN KEY ("videoId") REFERENCES "videos"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "video_shares"
      ADD CONSTRAINT "FK_video_shares_sender" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "video_shares"
      ADD CONSTRAINT "FK_video_shares_recipient" FOREIGN KEY ("recipientId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "video_shares" DROP CONSTRAINT "FK_video_shares_recipient"`
    );
    await queryRunner.query(
      `ALTER TABLE "video_shares" DROP CONSTRAINT "FK_video_shares_sender"`
    );
    await queryRunner.query(
      `ALTER TABLE "video_shares" DROP CONSTRAINT "FK_video_shares_video"`
    );
    await queryRunner.query(
      `ALTER TABLE "friendships" DROP CONSTRAINT "FK_friendships_addressee"`
    );
    await queryRunner.query(
      `ALTER TABLE "friendships" DROP CONSTRAINT "FK_friendships_requester"`
    );
    await queryRunner.query(
      `ALTER TABLE "videos" DROP CONSTRAINT "FK_videos_owner"`
    );

    await queryRunner.query(`DROP TABLE "video_shares"`);
    await queryRunner.query(`DROP TABLE "friendships"`);

    await queryRunner.query(`DROP TABLE "videos"`);

    await queryRunner.query(`DROP TABLE "users"`);
  }
}

