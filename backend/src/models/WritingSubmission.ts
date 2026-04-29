import mongoose, { Schema, Document, Model, HydratedDocument } from "mongoose";
import { WritingSubmission, WritingCriteriaScores } from "@/types/Writing.types";

type WritingSubmissionDocument = HydratedDocument<WritingSubmission>;

const CriteriaScoreSchema = new Schema<WritingCriteriaScores>(
    {
        taskAchievement:    { type: Number, min: 0, max: 9 },
        coherenceCohesion:  { type: Number, min: 0, max: 9 },
        lexicalResource:    { type: Number, min: 0, max: 9 },
        grammaticalRange:   { type: Number, min: 0, max: 9 },
    },
    { _id: false}
);

const WritingSubmissionSchema = new Schema<WritingSubmissionDocument>(
    {
        attemptId: {
            type: Schema.Types.ObjectId,
            ref: "Attempt",
            required: true,
        },
        taskId: {
            type: Schema.Types.ObjectId,
            ref: "WritingTask",
            required: true,
        },
        taskType: {
            type: String,
            enum: ["task1", "task2"],
            required: true,
        },
        responseText: {
            type: String,
            required: true,
            trim: true,
        },
        wordCount: { 
            type: Number,
            required: true,
        },

        aiBand: {
            type: Number,
            default: null,
        },
        aiCriteriaScores: {
            type: CriteriaScoreSchema,
            default: null,
        },
        aiFeedback: {
            type: String,
            default: null,
        },

        teacherBand: {
            type: Number,
            default: null,
        },
        teacherCriteriaScores: {
            type: CriteriaScoreSchema,
            default: null,
        },
        teacherFeedback: {
            type: String,
            default: null,
        },
        reviewStatus: {
            type: String,
            enum: ["pending_ai", "ai_scored", "pending_teacher", "teacher_reviewed"],
            default: "pending_ai",
        },
    },
    { timestamps: true },
);

// One submission per (attempt, task) pair — a student can't submit the same task twice
WritingSubmissionSchema.index({ attemptId: 1, taskId: 1 }, { unique: true});

const WritingSubmission: Model<WritingSubmissionDocument> =
    mongoose.model<WritingSubmissionDocument>(
        "WritingSubmission",
        WritingSubmissionSchema,
    );

export default WritingSubmission;