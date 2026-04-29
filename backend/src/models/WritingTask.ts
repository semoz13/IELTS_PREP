import mongoose, { Types , Schema, Document, Model } from "mongoose";
import { WritingTask } from "@/types/Writing.types";


type WritingTaskDocument = Document & WritingTask;

const WritingTaskSchema = new Schema<WritingTaskDocument>(
    {
        testId: {
            type: Types.ObjectId,
            ref: "Test",
            required: true,
        },
        taskType: {
            type: String,
            enum: ["task1" , "task2"],
            required: true,
        },
        section: {
            type: String,
            enum: ["academic", "general"],
            required: true,
        },
        prompt: {
            type: String,
            required: true,
            trim: true,
        },
            // Only populated for Task 1 Academic — describes the chart data in text
        imageDescription:{
            type: String,
            default: null,
            trim: true,
        },
        minWordCount: {
            type: Number,
            required: true,
        },
        timeAllowedMinutes: {
            type: Number,
            required: true,
        },
    },
    { timestamps: true },
);

const WritingTask: Model<WritingTaskDocument> =
    mongoose.model<WritingTaskDocument>("WritingTask", WritingTaskSchema);

export default WritingTask;