import { Field, InputType } from "type-graphql";
import {
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Matches,
} from "class-validator";
import { Transform } from "class-transformer";

@InputType()
export class UpdateProfileInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @Length(3, 50)
  @Transform(({ value }) =>
    typeof value === "string" && value.trim().length === 0 ? undefined : value.trim()
  )
  nickname?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsUrl({
    require_tld: false,
    protocols: ["http", "https"],
    require_protocol: true,
  })
  @Transform(({ value }) =>
    typeof value === "string" && value.trim().length === 0 ? undefined : value.trim()
  )
  avatarUrl?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @Matches(/^[\p{L}\p{N}\s!'’"(),.-]*$/u, {
    message: "La biographie contient des caractères non autorisés.",
  })
  @Length(0, 240)
  @Transform(({ value }) =>
    typeof value === "string" && value.trim().length === 0 ? undefined : value.trim()
  )
  bio?: string;
}


