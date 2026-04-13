import mongoose, { Schema, Document, Model } from "mongoose";
import { Choice } from "@/types/Choice";

type ChoiceDocument = Choice & Document;

const ChoiceSchema = new Schema<ChoiceDocument>(
    {
        questionId: {
            type: Schema.Types.ObjectId,
            ref: "Question",
            required: true,
        },
        text: {
            type: String,
            required: true,
            trim: true,
        },
        isCorrect: {
            type: Boolean,
            required: true,
            default: false,
        },
    },
    { timestamps: true },
); 

const Choice: Model<ChoiceDocument> = mongoose.model<ChoiceDocument>(
    "Choice",
    ChoiceSchema,
);

export default Choice; 