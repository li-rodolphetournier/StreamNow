import { Field, InputType } from "type-graphql";
import { IsEmail, IsOptional, IsString, Length } from "class-validator";

@InputType()
export class FriendRequestInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsEmail()
  email?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @Length(3, 50)
  nickname?: string;
}


