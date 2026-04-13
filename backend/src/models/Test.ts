import mongoose, { Schema, Document, Model } from "mongoose";
import { Test } from "@/types/Test";


type TestDocument = Test & Document;

const TestSchema = new Schema<TestDocument>(
    {
        title: {
            type: String,
            required: true,
            trim: true,
        },
        type: {
            type: String,
            required: true,
            enum: ["reading", "listening", "speaking", "writing"],
        },
        section: {
            type: String,
            enum: ["academic", "general"],
            default: "academic",
        },
        duration: { type: Number,
            required: true,
            default: 60,
        },
           
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        isAiGenerated: {
            type: Boolean,
            default: true,
        },
    },
    { timestamps: true},
);

const Test: Model<TestDocument> = mongoose.model<TestDocument>(
    "Test",
    TestSchema,
);
export default Test;