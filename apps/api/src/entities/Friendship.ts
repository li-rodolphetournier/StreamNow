import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from "typeorm";
import { ObjectType, Field, ID, registerEnumType } from "type-graphql";
import { User } from "./User";

export enum FriendshipStatus {
  PENDING = "pending",
  ACCEPTED = "accepted",
  BLOCKED = "blocked",
}

registerEnumType(FriendshipStatus, {
  name: "FriendshipStatus",
});

@ObjectType()
@Entity("friendships")
@Unique("UQ_friendship_users", ["requester", "addressee"])
export class Friendship {
  @Field(() => ID)
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Field(() => User)
  @ManyToOne(() => User, (user) => user.friendRequests, {
    onDelete: "CASCADE",
  })
  requester!: User;

  @Field(() => User)
  @ManyToOne(() => User, (user) => user.friendRequestReceived, {
    onDelete: "CASCADE",
  })
  addressee!: User;

  @Field(() => FriendshipStatus)
  @Column({
    type: "text",
    enum: FriendshipStatus,
    default: FriendshipStatus.PENDING,
  })
  status!: FriendshipStatus;

  @Field(() => Date)
  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @Field(() => Date)
  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}

