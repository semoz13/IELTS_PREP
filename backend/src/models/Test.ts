import mongoose, { Schema, Document, Model } from "mongoose";
import { TestType, TestSection } from "@/types/ReadingTypes";
import { BaseType } from "@/types/BaseType";

type ITest = BaseType & {
    title: string;
    type: TestType;
    section:TestSection;
    duration: number;
    createdBy: string;
    isAiGenerated: boolean;
};

type ITestDocument = ITest & Document;

const TestSchema = new Schema<ITestDocument>(
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
            type: Schema.Types.ObjectId as any, // safety lost but worked
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

const Test: Model<ITestDocument> = mongoose.model<ITestDocument>(
    "Test",
    TestSchema,
);
export default Test;