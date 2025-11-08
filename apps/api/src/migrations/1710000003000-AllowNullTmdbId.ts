import { MigrationInterface, QueryRunner } from "typeorm";

export class AllowNullTmdbId1710000003000 implements MigrationInterface {
  name = "AllowNullTmdbId1710000003000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "videos" ALTER COLUMN "tmdb_id" DROP NOT NULL`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "videos" ALTER COLUMN "tmdb_id" SET NOT NULL`
    );
  }
}
