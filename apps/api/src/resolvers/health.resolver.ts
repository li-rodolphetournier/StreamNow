import { Query, Resolver } from "type-graphql";

@Resolver()
export class HealthResolver {
  @Query(() => String)
  apiHealth(): string {
    return "ok";
  }
}

