import { Field, InputType } from "type-graphql";
import { IsEmail, IsOptional, IsString } from "class-validator";

@InputType()
export class ShareRecipientInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsEmail()
  email?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  nickname?: string;
}


