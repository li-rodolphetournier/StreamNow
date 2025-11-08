import { Field, ID, InputType } from "type-graphql";
import { IsEnum, IsNotEmpty } from "class-validator";
import { VideoStatus } from "../entities/Video";

@InputType()
export class UpdateVideoStatusInput {
  @Field(() => ID)
  @IsNotEmpty()
  id!: string;

  @Field(() => VideoStatus)
  @IsEnum(VideoStatus)
  status!: VideoStatus;
}

