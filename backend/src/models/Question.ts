import mongoose, { Types , Schema, Document, Model } from "mongoose";
import { Question }  from "@/types/Question";
import { QUESTION_TYPES } from "@/types/Reading.type";

type QuestionDocument = Question & Document;

const QuestionSchema = new Schema<QuestionDocument>(
    {
        testId: {
            type: Types.ObjectId,
            ref: "Test",
            required: true,
        },
        passageId: {
            type: Types.ObjectId,
            ref: "Passage",
            default: null,
        },
        sectionId: {
            type: Types.ObjectId,
            ref: "ListeningSection",
            default: null,
        },
        type: {
            type: String,
            enum: QUESTION_TYPES,
            required: true,
        },
        text: {
            type: String,
            required: true,
            trim: true,
        },
        correctAnswer: {
            type: String,
            default: null,
        },
        orderIndex: {
            type: Number,
            required: true,
        },
    },
    { timestamps: true},
);

const Question: Model<QuestionDocument> = mongoose.model<QuestionDocument>(
    "Question",
    QuestionSchema,
);
export default Question;