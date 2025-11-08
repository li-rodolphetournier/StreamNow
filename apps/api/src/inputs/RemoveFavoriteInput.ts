import { Field, InputType, Int } from "type-graphql";
import { IsInt, Min } from "class-validator";
import { VideoMediaType } from "../entities/Video";

@InputType()
export class RemoveFavoriteInput {
  @Field(() => Int)
  @IsInt()
  @Min(1)
  tmdbId!: number;

  @Field(() => VideoMediaType)
  mediaType!: VideoMediaType;
}


