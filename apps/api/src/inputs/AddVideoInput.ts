import { InputType, Field, Int } from "type-graphql";
import { IsEnum, IsOptional, Min } from "class-validator";
import { VideoMediaType, VideoStatus } from "../entities/Video";

@InputType()
export class AddVideoInput {
  @Field(() => Int)
  @Min(1)
  tmdbId!: number;

  @Field(() => VideoMediaType)
  @IsEnum(VideoMediaType)
  mediaType!: VideoMediaType;

  @Field(() => VideoStatus, { nullable: true })
  @IsOptional()
  @IsEnum(VideoStatus)
  status?: VideoStatus;
}

