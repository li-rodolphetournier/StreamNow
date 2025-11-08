import { Field, ObjectType } from "type-graphql";
import { VideoMediaType } from "../entities/Video";

@ObjectType()
export class TmdbSearchResult {
  @Field()
  id!: number;

  @Field()
  title!: string;

  @Field({ nullable: true })
  overview?: string;

  @Field({ nullable: true })
  releaseDate?: string;

  @Field({ nullable: true })
  posterUrl?: string;

  @Field(() => VideoMediaType, { nullable: true })
  mediaType?: VideoMediaType;
}
