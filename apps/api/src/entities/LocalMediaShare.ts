import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
  JoinColumn,
} from "typeorm";
import { Field, ID, ObjectType } from "type-graphql";
import { User } from "./User";

@ObjectType()
@Entity("local_media_shares")
@Unique("UQ_local_media_share_path", ["owner", "recipient", "path"])
export class LocalMediaShare {
  @Field(() => ID)
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Field(() => User)
  @ManyToOne(() => User, (user) => user.localMediaSharesSent, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "owner_id" })
  owner!: User;

  @Field(() => User)
  @ManyToOne(() => User, (user) => user.localMediaSharesReceived, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "recipient_id" })
  recipient!: User;

  @Field()
  @Column({ type: "text" })
  path!: string;

  @Field()
  @Column({ name: "is_directory", type: "boolean", default: false })
  isDirectory!: boolean;

  @Field(() => Date)
  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @Field(() => Date)
  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}

