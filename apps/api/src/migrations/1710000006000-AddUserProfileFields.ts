import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserProfileFields1710000006000 implements MigrationInterface {
  name = "AddUserProfileFields1710000006000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN "bio" character varying(240)`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "bio"`);
  }
}


