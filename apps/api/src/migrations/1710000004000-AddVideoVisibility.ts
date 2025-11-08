import { MigrationInterface, QueryRunner } from "typeorm";

export class AddVideoVisibility1710000004000 implements MigrationInterface {
  name = "AddVideoVisibility1710000004000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "videos" ADD COLUMN "visibility" text NOT NULL DEFAULT 'PRIVATE'`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "videos" DROP COLUMN "visibility"`);
  }
}


