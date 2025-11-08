import { MigrationInterface, QueryRunner } from "typeorm";

export class AddOAuthFieldsToUser1710000002000 implements MigrationInterface {
  name = "AddOAuthFieldsToUser1710000002000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN "google_id" character varying`
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN "facebook_id" character varying`
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN "email_verified_at" TIMESTAMP`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_users_google_id" ON "users" ("google_id") WHERE google_id IS NOT NULL`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_users_facebook_id" ON "users" ("facebook_id") WHERE facebook_id IS NOT NULL`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_facebook_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_google_id"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "email_verified_at"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "facebook_id"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "google_id"`);
  }
}
