import {
  Ability,
  AbilityBuilder,
  AbilityClass,
  ExtractSubjectType,
  InferSubjects,
  subject,
} from "@casl/ability";
import { User, UserRole } from "../entities/User";
import { Video } from "../entities/Video";

export enum AppAction {
  Manage = "manage",
  Create = "create",
  Read = "read",
  Update = "update",
  Delete = "delete",
}

export type AppSubjects = InferSubjects<typeof Video | typeof User> | "all";

export type AppAbility = Ability<[AppAction, AppSubjects]>;

const AbilityCtor = Ability as AbilityClass<AppAbility>;

interface AbilityContext {
  userId?: string;
  userRole?: UserRole;
}

export const buildAbilityFor = ({ userId, userRole }: AbilityContext): AppAbility => {
  const { can, build } = new AbilityBuilder<AppAbility>(AbilityCtor);

  switch (userRole) {
    case UserRole.ADMIN:
      can(AppAction.Manage, "all");
      break;
    case UserRole.EDITOR:
      can(AppAction.Read, "all");
      can(AppAction.Create, Video);
      can(AppAction.Update, Video, { ownerId: userId });
      can(AppAction.Delete, Video, { ownerId: userId });
      break;
    default:
      can(AppAction.Read, "all");
      break;
  }

  return build({
    detectSubjectType: (item) => item.constructor as ExtractSubjectType<AppSubjects>,
  });
};

export const canUpdateVideo = (ability: AppAbility, video: Video): boolean => {
  return (
    ability.can(AppAction.Manage, "all") ||
    ability.can(AppAction.Update, subject("Video", video))
  );
};

export const canCreateVideo = (ability: AppAbility): boolean => {
  return ability.can(AppAction.Manage, "all") || ability.can(AppAction.Create, Video);
};
