import mongoose, { Schema, Document, Model } from "mongoose";
import { ActionLog } from "@/types/ActionLog";

type ActionLogDocument = ActionLog & Document;

const ActionLogSchema = new Schema<ActionLogDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
      enum: [
        "LOGIN",
        "LOGOUT",
        "START_TEST",
        "SUBMIT_TEST",
        "SAVE_ANSWER",
        "UPDATE_PROFILE",
        "DELETE_ACCOUNT",
        "ACCESS_RESOURCE",
        "ADMIN_ACTION",
        "ERROR",
      ],
      index: true,
    },
    resourceType: {
      type: String,
      enum: ["USER", "TEST", "ATTEMPT", "SUBMISSION", "SYSTEM"],
      index: true,
    },
    resourceId: {
      type: Schema.Types.ObjectId,
      index: true,
    },
    status: {
      type: String,
      enum: ["SUCCESS", "FAILURE"],
      default: "SUCCESS",
      index: true,
    },
    description: {
      type: String,
      trim: true,
    },
    ipAddress: {
      type: String,
      required: true,
    },
    userAgent: {
      type: String,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    errorMessage: {
      type: String,
    },
  },
  {
    timestamps: true,
  },
);

// Compound index for efficient querying
ActionLogSchema.index({ userId: 1, createdAt: -1 });
ActionLogSchema.index({ action: 1, createdAt: -1 });
ActionLogSchema.index({ resourceType: 1, resourceId: 1, createdAt: -1 });
ActionLogSchema.index({ status: 1, createdAt: -1 });

// TTL index to auto-delete logs older than 90 days (optional, adjust as needed)
ActionLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 });

const ActionLogModel: Model<ActionLogDocument> =
  mongoose.model<ActionLogDocument>("ActionLog", ActionLogSchema);

export default ActionLogModel;
