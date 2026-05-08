import mongoose, { Schema, Document, Model } from "mongoose";
import { SpeakingQuestion } from "@/types/Speaking.types";

type SpeakingQuestionDocument = SpeakingQuestion & Document; 

const SpeakingQuestionSchema = new Schema<SpeakingQuestionDocument>(
    {
        testId: {
            type: Schema.Types.ObjectId,
            ref: "Test",
            required: true,
        },
        partNumber: {
            type: Number,
            enum: [1,2,3],
            required: true,
        },
        prompt: {
            type: String,
            required: true,
            trim: true,
        },
        preparationTimeSeconds: {
            type: Number,
            required: true,
            default: 0,
        },
        answerTimeSeconds: {
            type: Number,
            required: true,
        },
        orderIndex: {
            type: Number,
            required: true,
        },
    },
    { timestamps: true },
);

// One position per part per test
SpeakingQuestionSchema.index(
    { testId: 1, partNumber: 1, orderIndex: 1 },
    { unique: true },
);

const SpeakingQuestion: Model<SpeakingQuestionDocument> =
    mongoose.model<SpeakingQuestionDocument>("SpeakingQuestion", SpeakingQuestionSchema);
export default SpeakingQuestion;

