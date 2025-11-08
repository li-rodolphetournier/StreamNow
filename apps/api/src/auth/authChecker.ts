import type { AuthChecker } from "type-graphql";
import type { GraphQLContext } from "../types/context";
import { UserRole } from "../entities/User";

export const authChecker: AuthChecker<GraphQLContext> = ({ context }, roles) => {
  if (!context.userId) {
    return false;
  }

  if (roles.length === 0) {
    return true;
  }

  const role = context.userRole ?? UserRole.VIEWER;
  return roles.some((allowedRole) => allowedRole === role);
};
