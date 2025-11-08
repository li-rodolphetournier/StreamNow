import { Field, ID, ObjectType } from "type-graphql";
import { User } from "../entities/User";
import { FriendshipStatus } from "../entities/Friendship";

@ObjectType()
export class FriendPayload {
  @Field(() => ID)
  id!: string;

  @Field(() => User)
  friend!: User;

  @Field(() => FriendshipStatus)
  status!: FriendshipStatus;

  @Field(() => Date)
  createdAt!: Date;
}

@ObjectType()
export class FriendRequestPayload {
  @Field(() => ID)
  id!: string;

  @Field(() => User)
  user!: User;

  @Field(() => FriendshipStatus)
  status!: FriendshipStatus;

  @Field(() => Date)
  createdAt!: Date;
}


