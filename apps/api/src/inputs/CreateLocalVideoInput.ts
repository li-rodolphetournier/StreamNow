import { Field, InputType, Int } from "type-graphql";
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from "class-validator";
import { VideoMediaType, VideoStatus } from "../entities/Video";

@InputType()
export class CreateLocalVideoInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  fileUrl!: string;

  @Field(() => VideoMediaType)
  @IsEnum(VideoMediaType)
  mediaType!: VideoMediaType;

  @Field(() => VideoStatus, { nullable: true })
  @IsEnum(VideoStatus)
  @IsOptional()
  status?: VideoStatus;

  @Field(() => Int, { nullable: true })
  @IsInt()
  @IsPositive()
  @IsOptional()
  tmdbId?: number;

  @Field({ nullable: true })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  title?: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  overview?: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  tagline?: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  releaseDate?: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  posterUrl?: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  backdropUrl?: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  trailerUrl?: string;

  @Field(() => Int, { nullable: true })
  @IsInt()
  @IsOptional()
  durationSeconds?: number;

  @Field(() => Int, { nullable: true })
  @IsInt()
  @IsOptional()
  fileSize?: number;
}
