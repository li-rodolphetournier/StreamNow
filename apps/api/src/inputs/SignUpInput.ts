import { Field, InputType } from "type-graphql";
import { IsEmail, MinLength, IsOptional, MaxLength } from "class-validator";

@InputType()
export class SignUpInput {
  @Field()
  @IsEmail()
  email!: string;

  @Field()
  @MinLength(8)
  password!: string;

  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(50)
  nickname?: string;
}
