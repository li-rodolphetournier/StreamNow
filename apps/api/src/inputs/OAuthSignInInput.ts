import { Field, InputType } from "type-graphql";
import { IsEnum, IsNotEmpty, IsString } from "class-validator";
import { OAuthProvider } from "../types/oauth";

@InputType()
export class OAuthSignInInput {
  @Field(() => OAuthProvider)
  @IsEnum(OAuthProvider)
  provider!: OAuthProvider;

  @Field()
  @IsString()
  @IsNotEmpty()
  code!: string;

  @Field({ nullable: true })
  @IsString()
  redirectUri?: string;
}
