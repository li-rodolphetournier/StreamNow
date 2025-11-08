import type { Request, Response } from "express";
import type { AppAbility } from "../auth/ability";
import type { UserRole } from "../entities/User";

export interface GraphQLContext {
  req: Request;
  res: Response;
  userId?: string;
  userRole?: UserRole;
  ability: AppAbility;
}

