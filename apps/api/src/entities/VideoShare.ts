import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  Column,
  CreateDateColumn,
} from "typeorm";
import { ObjectType, Field, ID } from "type-graphql";
import { User } from "./User";
import { Video } from "./Video";

@ObjectType()
@Entity("video_shares")
export class VideoShare {
  @Field(() => ID)
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Field(() => Video)
  @ManyToOne(() => Video, (video: Video) => video.shares, {
    onDelete: "CASCADE",
  })
  video!: Video;

  @Field(() => User)
  @ManyToOne(() => User, (user: User) => user.sharesSent, {
    onDelete: "CASCADE",
  })
  sender!: User;

  @Field(() => User)
  @ManyToOne(() => User, (user: User) => user.sharesReceived, {
    onDelete: "CASCADE",
  })
  recipient!: User;

  @Field({ nullable: true })
  @Column({ type: "text", nullable: true })
  message?: string;

  @Field(() => Date)
  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;
}

