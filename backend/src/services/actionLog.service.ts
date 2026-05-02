import ActionLogModel from "@/models/ActionLog";
import { ActionType, ResourceType, ActionStatus } from "@/types/ActionLog";

/**
 * ActionLog Service
 * Provides utility methods for logging actions throughout the application
 * Use this service to log actions from controllers, services, or any part of the app
 */
class ActionLogService {
  /**
   * Log an action to the database
   */
  async logAction(
    userId: string,
    action: ActionType,
    options?: {
      resourceType?: ResourceType;
      resourceId?: string;
      description?: string;
      ipAddress?: string;
      userAgent?: string;
      metadata?: Record<string, any>;
      status?: ActionStatus;
      errorMessage?: string;
    },
  ): Promise<void> {
    try {
      await ActionLogModel.create({
        userId,
        action,
        resourceType: options?.resourceType,
        resourceId: options?.resourceId,
        description: options?.description,
        ipAddress: options?.ipAddress || "INTERNAL",
        userAgent: options?.userAgent,
        metadata: options?.metadata || {},
        status: options?.status || "SUCCESS",
        errorMessage: options?.errorMessage,
      });
    } catch (error) {
      // Log silently to prevent disruption
      console.error("Failed to save action log:", error);
    }
  }

  /**
   * Log a test attempt action
   */
  async logTestAttempt(
    userId: string,
    action: "START_TEST" | "SUBMIT_TEST",
    testType: "READING" | "LISTENING" | "WRITING",
    attemptId: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    await this.logAction(userId, action, {
      resourceType: "ATTEMPT",
      resourceId: attemptId,
      description: `${action} - ${testType} Test`,
      metadata: { testType, ...metadata },
    });
  }

  /**
   * Log an answer save action
   */
  async logAnswerSave(
    userId: string,
    testType: "READING" | "LISTENING" | "WRITING",
    attemptId: string,
    questionNumber?: number,
  ): Promise<void> {
    await this.logAction(userId, "SAVE_ANSWER", {
      resourceType: "ATTEMPT",
      resourceId: attemptId,
      description: `Saved ${testType} answer`,
      metadata: { testType, questionNumber },
    });
  }

  /**
   * Log an error action
   */
  async logError(
    userId: string | undefined,
    action: ActionType,
    errorMessage: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    if (!userId) return;

    await this.logAction(userId, action, {
      status: "FAILURE",
      errorMessage,
      metadata,
    });
  }

  /**
   * Log an admin action
   */
  async logAdminAction(
    adminId: string,
    description: string,
    resourceType?: ResourceType,
    resourceId?: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    await this.logAction(adminId, "ADMIN_ACTION", {
      resourceType,
      resourceId,
      description,
      metadata,
    });
  }

  /**
   * Get user's recent actions (simplified)
   */
  async getUserRecentActions(userId: string, limit: number = 10) {
    return ActionLogModel.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select("action resourceType resourceId status description createdAt")
      .lean();
  }

  /**
   * Get action summary for a specific resource
   */
  async getResourceActionHistory(
    resourceId: string,
    resourceType: ResourceType,
  ) {
    return ActionLogModel.find({ resourceId, resourceType })
      .populate("userId", "name email")
      .sort({ createdAt: -1 })
      .lean();
  }

  /**
   * Check if user has performed action recently
   */
  async checkRecentAction(
    userId: string,
    action: ActionType,
    withinSeconds: number = 60,
  ): Promise<boolean> {
    const cutoffTime = new Date(Date.now() - withinSeconds * 1000);

    const recentAction = await ActionLogModel.findOne({
      userId,
      action,
      createdAt: { $gte: cutoffTime },
    });

    return !!recentAction;
  }
}

export const actionLogService = new ActionLogService();
