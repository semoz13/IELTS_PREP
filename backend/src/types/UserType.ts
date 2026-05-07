import { BaseType } from "./BaseType";

export type UserRole = "admin" | "teacher" | "student";

export type User = BaseType & {
  name: string;
  surName?: string;
  email: string;
  password: string;
  role: UserRole;
  avatar: string;
  bio: string;
};
