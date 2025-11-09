import type { MigrationInterface, QueryRunner } from "typeorm";
import { Table, TableForeignKey, TableUnique } from "typeorm";

export class CreateLocalMediaShares1710000007000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: "local_media_shares",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            generationStrategy: "uuid",
            default: "uuid_generate_v4()",
          },
          {
            name: "owner_id",
            type: "uuid",
            isNullable: false,
          },
          {
            name: "recipient_id",
            type: "uuid",
            isNullable: false,
          },
          {
            name: "path",
            type: "text",
            isNullable: false,
          },
          {
            name: "is_directory",
            type: "boolean",
            isNullable: false,
            default: false,
          },
          {
            name: "created_at",
            type: "timestamp with time zone",
            default: "now()",
          },
          {
            name: "updated_at",
            type: "timestamp with time zone",
            default: "now()",
          },
        ],
      })
    );

    await queryRunner.createForeignKey(
      "local_media_shares",
      new TableForeignKey({
        columnNames: ["owner_id"],
        referencedColumnNames: ["id"],
        referencedTableName: "users",
        onDelete: "CASCADE",
      })
    );

    await queryRunner.createForeignKey(
      "local_media_shares",
      new TableForeignKey({
        columnNames: ["recipient_id"],
        referencedColumnNames: ["id"],
        referencedTableName: "users",
        onDelete: "CASCADE",
      })
    );

    await queryRunner.createUniqueConstraint(
      "local_media_shares",
      new TableUnique({
        name: "UQ_local_media_share_path",
        columnNames: ["owner_id", "recipient_id", "path"],
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable("local_media_shares");
  }
}

