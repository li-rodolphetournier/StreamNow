import { Field, ID, InputType } from "type-graphql";
import { IsBoolean, IsUUID } from "class-validator";

@InputType()
export class RespondFriendRequestInput {
  @Field(() => ID)
  @IsUUID()
  id!: string;

  @Field()
  @IsBoolean()
  accept!: boolean;
}


