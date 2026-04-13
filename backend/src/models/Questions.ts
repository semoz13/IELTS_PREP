import mongoose, { Types , Schema, Document, Model } from "mongoose";
import { Question }  from "@/types/Question";

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
            required: true,
        },
        type: {
            type: String,
            enum: [
                "multiple_choice",
                "true_false_not_given",
                "fill_blank",
                "match_heading",
                "complete_table",
                "match_pragraph",
                "match_statement",
                "label_diagram",
                "complete_sentence",
            ],
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