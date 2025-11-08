import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  RelationId,
} from "typeorm";
import {
  Field,
  ObjectType,
  ID,
  registerEnumType,
} from "type-graphql";
import { GraphQLJSONObject } from "graphql-type-json";
import { User } from "./User";
import { VideoShare } from "./VideoShare";

export enum VideoStatus {
  DRAFT = "draft",
  PUBLISHED = "published",
}

export enum VideoMediaType {
  MOVIE = "movie",
  TV = "tv",
}

export enum VideoSourceType {
  TMDB = "TMDB",
  LOCAL = "LOCAL",
}

export enum VideoVisibility {
  PRIVATE = "PRIVATE",
  AUTHENTICATED = "AUTHENTICATED",
  FRIENDS = "FRIENDS",
  PUBLIC = "PUBLIC",
  RESTRICTED = "RESTRICTED",
}

registerEnumType(VideoStatus, {
  name: "VideoStatus",
});

registerEnumType(VideoMediaType, {
  name: "VideoMediaType",
});

registerEnumType(VideoSourceType, {
  name: "VideoSourceType",
});

registerEnumType(VideoVisibility, {
  name: "VideoVisibility",
});

const numericTransformer = {
  to: (value?: number | null) => (typeof value === "number" ? value : value ?? null),
  from: (value: string | number | null) => (value == null ? null : Number(value)),
};

@ObjectType()
@Entity("videos")
export class Video {
  @Field(() => ID)
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Field(() => Number, { nullable: true })
  @Column({ name: "tmdb_id", type: "int", nullable: true })
  tmdbId?: number | null;

  @Field()
  @Column()
  title!: string;

  @Field()
  @Column({ unique: true })
  slug!: string;

  @Field(() => VideoMediaType)
  @Column({
    type: "text",
    enum: VideoMediaType,
    name: "media_type",
  })
  mediaType!: VideoMediaType;

  @Field(() => VideoSourceType)
  @Column({
    type: "text",
    enum: VideoSourceType,
    name: "source_type",
    default: VideoSourceType.TMDB,
  })
  sourceType!: VideoSourceType;

  @Field(() => String, { nullable: true })
  @Column({ name: "file_url", type: "text", nullable: true })
  fileUrl?: string | null;

  @Field(() => Number, { nullable: true })
  @Column({
    name: "file_size",
    type: "bigint",
    nullable: true,
    transformer: numericTransformer,
  })
  fileSize?: number | null;

  @Field(() => Number, { nullable: true })
  @Column({
    name: "duration_seconds",
    type: "int",
    nullable: true,
    transformer: numericTransformer,
  })
  durationSeconds?: number | null;

  @Field({ nullable: true })
  @Column({ name: "tagline", nullable: true })
  tagline?: string;

  @Field({ nullable: true })
  @Column({ name: "overview", type: "text", nullable: true })
  overview?: string;

  @Field({ nullable: true })
  @Column({ name: "release_date", nullable: true })
  releaseDate?: string;

  @Field({ nullable: true })
  @Column({ name: "poster_url", nullable: true })
  posterUrl?: string;

  @Field({ nullable: true })
  @Column({ name: "backdrop_url", nullable: true })
  backdropUrl?: string;

  @Field({ nullable: true })
  @Column({ name: "trailer_url", nullable: true })
  trailerUrl?: string;

  @Field(() => VideoStatus)
  @Column({
    type: "text",
    enum: VideoStatus,
    default: VideoStatus.DRAFT,
  })
  status!: VideoStatus;

  @Field(() => VideoVisibility)
  @Column({
    type: "text",
    enum: VideoVisibility,
    default: VideoVisibility.PRIVATE,
  })
  visibility!: VideoVisibility;

  @Field(() => GraphQLJSONObject, { nullable: true })
  @Column({ type: "json", default: () => "'{}'" })
  metadata?: Record<string, unknown>;

  @Field(() => User, { nullable: true })
  @ManyToOne(() => User, (user: User) => user.videos, {
    nullable: true,
    onDelete: "SET NULL",
  })
  @JoinColumn({ name: "owner_id" })
  owner?: User | null;

  @Field(() => String, { nullable: true })
  @RelationId((video: Video) => video.owner)
  ownerId?: string | null;

  @Field(() => Date)
  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @Field(() => Date)
  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;

  @Field(() => [VideoShare], { nullable: true })
  @OneToMany(() => VideoShare, (share: VideoShare) => share.video)
  shares?: VideoShare[];
}

