import { Field, ID, InputType } from "type-graphql";
import { IsArray, IsOptional, IsUUID, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { VideoVisibility } from "../entities/Video";
import { ShareRecipientInput } from "./ShareRecipientInput";

@InputType()
export class UpdateVideoVisibilityInput {
  @Field(() => ID)
  @IsUUID()
  id!: string;

  @Field(() => VideoVisibility)
  visibility!: VideoVisibility;

  @Field(() => [ShareRecipientInput], { nullable: true })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ShareRecipientInput)
  recipients?: ShareRecipientInput[] | null;
}


