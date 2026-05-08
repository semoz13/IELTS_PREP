import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "@/config/env";
import { StatusCodes } from "http-status-codes";
import { User, UserRole } from "@/types/UserType";

export const protect = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res
      .status(StatusCodes.UNAUTHORIZED)
      .json({ success: false, message: "No token provided" });
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, env.jwtAccessSecret);
    req.user = decoded as {userId:string, role: UserRole };
    next();
  } catch (error) {
    next(error);
  }
};

// Usage in routing.ts:  requireRole("teacher")  or  requireRole("admin")
// Must always be placed AFTER protect, because it reads req.user.
// Role hierarchy:
//   "admin"   → super admin  — full access to /admin/* routes
//   "teacher" → content & submission management
//   "student" → test-taking only

export const requireRole = ( ... roles: UserRole[])=>
  (req:Request, res:Response, next:NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(StatusCodes.FORBIDDEN).json({
        success: false,
        message: "Access denied: insufficient permissions"
      });
      return;
    }
    next();
};