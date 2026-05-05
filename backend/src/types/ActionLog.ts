import { BaseType } from "./BaseType";
import { User } from "./UserType";

export type ActionType =
  | "LOGIN"
  | "LOGOUT"
  | "START_TEST"
  | "SUBMIT_TEST"
  | "SAVE_ANSWER"
  | "UPDATE_PROFILE"
  | "DELETE_ACCOUNT"
  | "ACCESS_RESOURCE"
  | "ADMIN_ACTION"
  | "ERROR";

export type ResourceType =
  | "USER"
  | "TEST"
  | "ATTEMPT"
  | "SUBMISSION"
  | "SYSTEM";

export type ActionStatus = "SUCCESS" | "FAILURE";

export type ActionLog = BaseType & {
  userId: string | User;
  action: ActionType;
  resourceType?: ResourceType;
  resourceId?: string;
  status: ActionStatus;
  description?: string;
  ipAddress: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  errorMessage?: string;
};

export interface ActionLogQuery {
  userId?: string;
  action?: ActionType;
  resourceType?: ResourceType;
  status?: ActionStatus;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
  sort?: "asc" | "desc";
}
