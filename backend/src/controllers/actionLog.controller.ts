import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import ActionLogModel from "@/models/ActionLog";
import { ActionLogQuery } from "@/types/ActionLog";

class ActionLogController {
  /**
   * Get action logs with advanced filtering, pagination, and sorting
   * Query parameters:
   * - userId: filter by user ID
   * - action: filter by action type
   * - resourceType: filter by resource type
   * - status: filter by status (SUCCESS/FAILURE)
   * - startDate: filter by start date (ISO format)
   * - endDate: filter by end date (ISO format)
   * - page: pagination page (default: 1)
   * - limit: items per page (default: 50, max: 500)
   * - sort: sort order (asc/desc by createdAt, default: desc)
   */
  async getLogs(req: Request, res: Response): Promise<void> {
    try {
      const currentUserId = (req as any).user?.id;
      const userRole = (req as any).user?.role;

      // Only admins can view all logs, users can only view their own
      const userId = userRole === "admin" ? req.query.userId : currentUserId;

      // Parse query parameters
      const query: ActionLogQuery = {};

      if (userId) {
        query.userId = userId as string;
      }

      if (req.query.action) {
        query.action = req.query.action as ActionLogQuery["action"];
      }

      if (req.query.resourceType) {
        query.resourceType = req.query
          .resourceType as ActionLogQuery["resourceType"];
      }

      if (req.query.status) {
        query.status = req.query.status as ActionLogQuery["status"];
      }

      // Date range filtering
      if (req.query.startDate || req.query.endDate) {
        query.startDate = req.query.startDate
          ? new Date(req.query.startDate as string)
          : undefined;
        query.endDate = req.query.endDate
          ? new Date(req.query.endDate as string)
          : undefined;
      }

      // Pagination
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(
        500,
        Math.max(1, parseInt(req.query.limit as string) || 50),
      );
      const skip = (page - 1) * limit;

      // Sort order
      const sortOrder = req.query.sort === "asc" ? 1 : -1;

      // Build MongoDB filter
      const filter: any = {};

      if (query.userId) {
        filter.userId = query.userId;
      }

      if (query.action) {
        filter.action = query.action;
      }

      if (query.resourceType) {
        filter.resourceType = query.resourceType;
      }

      if (query.status) {
        filter.status = query.status;
      }

      // Date range
      if (query.startDate || query.endDate) {
        filter.createdAt = {};
        if (query.startDate) {
          filter.createdAt.$gte = query.startDate;
        }
        if (query.endDate) {
          filter.createdAt.$lte = new Date(query.endDate.getTime() + 86400000); // End of day
        }
      }

      // Execute queries in parallel
      const [logs, total] = await Promise.all([
        ActionLogModel.find(filter)
          .populate({
            path: "userId",
            select: "name email role",
          })
          .populate({
            path: "resourceId",
            select: "_id",
          })
          .sort({ createdAt: sortOrder })
          .limit(limit)
          .skip(skip)
          .lean(),

        ActionLogModel.countDocuments(filter),
      ]);

      const totalPages = Math.ceil(total / limit);

      res.status(StatusCodes.OK).json({
        success: true,
        data: {
          logs,
          pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
          },
        },
      });
    } catch (error) {
      console.error("Error fetching action logs:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to fetch action logs",
      });
    }
  }

  /**
   * Get action log statistics
   * Returns counts of actions by type, status, and resource
   */
  async getStatistics(req: Request, res: Response): Promise<void> {
    try {
      const currentUserId = (req as any).user?.id;
      const userRole = (req as any).user?.role;

      // Only admins can view all statistics
      if (userRole !== "admin") {
        res.status(StatusCodes.FORBIDDEN).json({
          success: false,
          message: "Only admins can access statistics",
        });
        return;
      }

      // Parse date range
      const startDate = req.query.startDate
        ? new Date(req.query.startDate as string)
        : null;
      const endDate = req.query.endDate
        ? new Date(req.query.endDate as string)
        : null;

      const matchStage: any = {};
      if (startDate || endDate) {
        matchStage.createdAt = {};
        if (startDate) {
          matchStage.createdAt.$gte = startDate;
        }
        if (endDate) {
          matchStage.createdAt.$lte = new Date(endDate.getTime() + 86400000);
        }
      }

      const [actionStats, statusStats, resourceStats, recentErrors] =
        await Promise.all([
          ActionLogModel.aggregate([
            { $match: matchStage },
            {
              $group: {
                _id: "$action",
                count: { $sum: 1 },
              },
            },
            { $sort: { count: -1 } },
          ]),

          ActionLogModel.aggregate([
            { $match: matchStage },
            {
              $group: {
                _id: "$status",
                count: { $sum: 1 },
              },
            },
          ]),

          ActionLogModel.aggregate([
            { $match: matchStage },
            {
              $group: {
                _id: "$resourceType",
                count: { $sum: 1 },
              },
            },
          ]),

          ActionLogModel.find({ status: "FAILURE", ...matchStage })
            .sort({ createdAt: -1 })
            .limit(10)
            .populate("userId", "name email")
            .lean(),
        ]);

      res.status(StatusCodes.OK).json({
        success: true,
        data: {
          actionStats: Object.fromEntries(
            actionStats.map((s: any) => [s._id, s.count]),
          ),
          statusStats: Object.fromEntries(
            statusStats.map((s: any) => [s._id, s.count]),
          ),
          resourceStats: Object.fromEntries(
            resourceStats.map((s: any) => [s._id, s.count]),
          ),
          recentErrors,
        },
      });
    } catch (error) {
      console.error("Error fetching statistics:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to fetch statistics",
      });
    }
  }

  /**
   * Get user activity log (personal view)
   */
  async getUserActivityLog(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(
        100,
        Math.max(1, parseInt(req.query.limit as string) || 20),
      );
      const skip = (page - 1) * limit;

      const [logs, total] = await Promise.all([
        ActionLogModel.find({ userId })
          .sort({ createdAt: -1 })
          .limit(limit)
          .skip(skip)
          .select(
            "action resourceType resourceId status description createdAt metadata",
          )
          .lean(),

        ActionLogModel.countDocuments({ userId }),
      ]);

      const totalPages = Math.ceil(total / limit);

      res.status(StatusCodes.OK).json({
        success: true,
        data: {
          logs,
          pagination: {
            page,
            limit,
            total,
            totalPages,
          },
        },
      });
    } catch (error) {
      console.error("Error fetching user activity:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to fetch activity log",
      });
    }
  }

  /**
   * Clear old logs (admin only)
   * Useful for maintenance
   */
  async clearOldLogs(req: Request, res: Response): Promise<void> {
    try {
      const userRole = (req as any).user?.role;

      if (userRole !== "admin") {
        res.status(StatusCodes.FORBIDDEN).json({
          success: false,
          message: "Only admins can clear logs",
        });
        return;
      }

      const daysOld = Math.max(30, parseInt(req.query.daysOld as string) || 90);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const result = await ActionLogModel.deleteMany({
        createdAt: { $lt: cutoffDate },
      });

      res.status(StatusCodes.OK).json({
        success: true,
        data: {
          deletedCount: result.deletedCount,
          message: `Deleted ${result.deletedCount} logs older than ${daysOld} days`,
        },
      });
    } catch (error) {
      console.error("Error clearing logs:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to clear logs",
      });
    }
  }
}

export const actionLogController = new ActionLogController();
