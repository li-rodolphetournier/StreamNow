import { Field, InputType, Int } from "type-graphql";
import { IsArray, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from "class-validator";
import { VideoMediaType } from "../entities/Video";

@InputType()
export class AddFavoriteInput {
  @Field(() => Int)
  @IsInt()
  @Min(1)
  tmdbId!: number;

  @Field(() => VideoMediaType)
  mediaType!: VideoMediaType;

  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title!: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  overview?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  posterPath?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  backdropPath?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  releaseDate?: string;

  @Field(() => Number, { nullable: true })
  @IsOptional()
  voteAverage?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  voteCount?: number;

  @Field(() => [Int], { nullable: true })
  @IsOptional()
  @IsArray()
  genreIds?: number[];
}


