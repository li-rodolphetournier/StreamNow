import { buildSchema } from "type-graphql";
import { AuthResolver } from "../resolvers/auth.resolver";
import { FavoriteResolver } from "../resolvers/favorite.resolver";
import { FriendshipResolver } from "../resolvers/friendship.resolver";
import { HealthResolver } from "../resolvers/health.resolver";
import { LocalMediaShareResolver } from "../resolvers/localMediaShare.resolver";
import { VideoResolver } from "../resolvers/video.resolver";
import { authChecker } from "../auth/authChecker";

export const createSchema = async () =>
  buildSchema({
    resolvers: [
      HealthResolver,
      VideoResolver,
      AuthResolver,
      FavoriteResolver,
      FriendshipResolver,
      LocalMediaShareResolver,
    ],
    validate: true,
    authChecker,
  });

