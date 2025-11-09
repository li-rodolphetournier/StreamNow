import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from "typeorm";
import { registerEnumType, Field, ObjectType, ID } from "type-graphql";
import { Video } from "./Video";
import { VideoShare } from "./VideoShare";
import { Favorite } from "./Favorite";
import { LocalMediaShare } from "./LocalMediaShare";
import { Friendship } from "./Friendship";

const timestampColumnType = process.env.NODE_ENV === "test" ? "datetime" : "timestamp";

export enum UserRole {
  ADMIN = "admin",
  EDITOR = "editor",
  VIEWER = "viewer",
}

registerEnumType(UserRole, {
  name: "UserRole",
});

@ObjectType()
@Entity("users")
export class User {
  @Field(() => ID)
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Field()
  @Column({ unique: true })
  email!: string;

  @Column({ name: "password_hash", nullable: true })
  passwordHash?: string;

  @Field(() => UserRole)
  @Column({
    type: "text",
    enum: UserRole,
    default: UserRole.VIEWER,
  })
  role!: UserRole;

  @Field(() => String, { nullable: true })
  @Column({ nullable: true, type: "text" })
  nickname?: string | null;

  @Field(() => String, { nullable: true })
  @Column({ type: "varchar", length: 240, nullable: true })
  bio?: string | null;

  @Field()
  @Column({
    name: "avatar_url",
    default: "https://placehold.co/128x128/png",
  })
  avatarUrl!: string;

  @Field(() => String, { nullable: true })
  @Column({ name: "google_id", type: "varchar", nullable: true, unique: true })
  googleId?: string | null;

  @Field(() => String, { nullable: true })
  @Column({ name: "facebook_id", type: "varchar", nullable: true, unique: true })
  facebookId?: string | null;

  @Field(() => Date, { nullable: true })
  @Column({ name: "email_verified_at", type: timestampColumnType, nullable: true })
  emailVerifiedAt?: Date | null;

  @Field(() => Date)
  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @Field(() => Date)
  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;

  @OneToMany(() => Video, (video: Video) => video.owner)
  videos?: Video[];

  @Field(() => [Favorite], { nullable: true })
  @OneToMany(() => Favorite, (favorite: Favorite) => favorite.user)
  favorites?: Favorite[];

  @OneToMany(
    () => LocalMediaShare,
    (share: LocalMediaShare) => share.owner
  )
  localMediaSharesSent?: LocalMediaShare[];

  @OneToMany(
    () => LocalMediaShare,
    (share: LocalMediaShare) => share.recipient
  )
  localMediaSharesReceived?: LocalMediaShare[];

  @OneToMany(() => VideoShare, (share: VideoShare) => share.sender)
  sharesSent?: VideoShare[];

  @OneToMany(() => VideoShare, (share: VideoShare) => share.recipient)
  sharesReceived?: VideoShare[];

  @OneToMany(
    () => Friendship,
    (friendship: Friendship) => friendship.requester
  )
  friendRequests?: Friendship[];

  @OneToMany(
    () => Friendship,
    (friendship: Friendship) => friendship.addressee
  )
  friendRequestReceived?: Friendship[];
}

