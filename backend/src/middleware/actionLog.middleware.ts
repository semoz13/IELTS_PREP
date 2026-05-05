import { Request, Response, NextFunction } from "express";
import ActionLogModel from "@/models/ActionLog";
import { ActionType, ResourceType } from "@/types/ActionLog";

export interface ActionLogContext {
  action: ActionType;
  resourceType?: ResourceType;
  resourceId?: string;
  description?: string;
  metadata?: Record<string, any>;
}

/**
 * Stores action log context in request for later logging
 */
export const setActionContext = (context: ActionLogContext) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    (req as any).actionContext = context;
    next();
  };
};

/**
 * Logs action after response is sent
 * Should be called after route handlers
 */
export const logAction = async (
  userId: string,
  context: ActionLogContext,
  ipAddress: string,
  userAgent: string | undefined,
  status: "SUCCESS" | "FAILURE" = "SUCCESS",
  errorMessage?: string,
): Promise<void> => {
  try {
    await ActionLogModel.create({
      userId,
      action: context.action,
      resourceType: context.resourceType,
      resourceId: context.resourceId,
      status,
      description: context.description,
      ipAddress,
      userAgent,
      metadata: context.metadata || {},
      errorMessage,
    });
  } catch (error) {
    // Log silently to not disrupt main application
    console.error("Failed to save action log:", error);
  }
};

/**
 * Extracts client IP address
 */
export const getClientIp = (req: Request): string => {
  return (
    (req.headers["x-forwarded-for"] as string)?.split(",")[0].trim() ||
    (req.socket?.remoteAddress as string) ||
    "UNKNOWN"
  );
};

/**
 * Express middleware wrapper to log actions with response status tracking
 */
export const createActionLogger =
  (context: ActionLogContext) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const userId = (req as any).user?.id;

    if (!userId) {
      next();
      return;
    }

    const ipAddress = getClientIp(req);
    const userAgent = req.get("user-agent");
    const originalJson = res.json;

    // Intercept json response to determine status
    res.json = function (body: any) {
      const statusCode = res.statusCode;
      const isSuccess = statusCode >= 200 && statusCode < 400;

      // Log action after response is prepared
      const errorMsg = !isSuccess
        ? body?.message || `HTTP ${statusCode}`
        : undefined;

      logAction(
        userId,
        context,
        ipAddress,
        userAgent,
        isSuccess ? "SUCCESS" : "FAILURE",
        errorMsg,
      ).catch((err) => console.error("Action log error:", err));

      return originalJson.call(this, body);
    };

    next();
  };
