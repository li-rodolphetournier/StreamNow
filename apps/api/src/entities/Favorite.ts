import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  JoinColumn,
} from "typeorm";
import { Field, Float, ID, Int, ObjectType } from "type-graphql";
import { User } from "./User";
import { VideoMediaType } from "./Video";

const genreIdsColumnOptions =
  process.env.NODE_ENV === "test"
    ? { type: "simple-json" as const, default: "[]" }
    : { type: "jsonb" as const, default: () => "'[]'" };

@ObjectType()
@Entity("favorites")
@Index("UQ_favorite_user_tmdb", ["user", "tmdbId", "mediaType"], { unique: true })
export class Favorite {
  @Field(() => ID)
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => User, (user: User) => user.favorites, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "user_id" })
  user!: User;

  @Field(() => Int)
  @Column({ name: "tmdb_id", type: "int" })
  tmdbId!: number;

  @Field(() => VideoMediaType)
  @Column({
    name: "media_type",
    type: "text",
    enum: VideoMediaType,
  })
  mediaType!: VideoMediaType;

  @Field(() => String)
  @Column({ type: "text" })
  title!: string;

  @Field(() => String, { nullable: true })
  @Column({ name: "overview", type: "text", nullable: true })
  overview?: string | null;

  @Field(() => String, { nullable: true })
  @Column({ name: "poster_path", type: "text", nullable: true })
  posterPath?: string | null;

  @Field(() => String, { nullable: true })
  @Column({ name: "backdrop_path", type: "text", nullable: true })
  backdropPath?: string | null;

  @Field(() => String, { nullable: true })
  @Column({ name: "release_date", type: "text", nullable: true })
  releaseDate?: string | null;

  @Field(() => Float, { nullable: true })
  @Column({ name: "vote_average", type: "float", nullable: true })
  voteAverage?: number | null;

  @Field(() => Int, { nullable: true })
  @Column({ name: "vote_count", type: "int", nullable: true })
  voteCount?: number | null;

  @Field(() => [Int])
  @Column({ name: "genre_ids", ...genreIdsColumnOptions })
  genreIds!: number[];

  @Field(() => Date)
  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;
}


