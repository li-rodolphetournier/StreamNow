import { MigrationInterface, QueryRunner } from "typeorm";

export class AddVideoSourceFields1710000001000 implements MigrationInterface {
  name = "AddVideoSourceFields1710000001000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "videos" ADD COLUMN "source_type" character varying NOT NULL DEFAULT 'TMDB'`
    );
    await queryRunner.query(
      `ALTER TABLE "videos" ADD COLUMN "file_url" character varying`
    );
    await queryRunner.query(
      `ALTER TABLE "videos" ADD COLUMN "file_size" BIGINT`
    );
    await queryRunner.query(
      `ALTER TABLE "videos" ADD COLUMN "duration_seconds" INTEGER`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "videos" DROP COLUMN "duration_seconds"`);
    await queryRunner.query(`ALTER TABLE "videos" DROP COLUMN "file_size"`);
    await queryRunner.query(`ALTER TABLE "videos" DROP COLUMN "file_url"`);
    await queryRunner.query(`ALTER TABLE "videos" DROP COLUMN "source_type"`);
  }
}
