import { ArrayUnique, IsBoolean, IsNotEmpty, IsUUID, MinLength } from "class-validator";
import { Field, ID, InputType } from "type-graphql";

@InputType()
export class ShareLocalMediaInput {
  @Field()
  @IsNotEmpty()
  @MinLength(1)
  path!: string;

  @Field()
  @IsBoolean()
  isDirectory!: boolean;

  @Field(() => [ID])
  @ArrayUnique()
  @IsUUID("4", { each: true })
  recipientIds!: string[];
}

