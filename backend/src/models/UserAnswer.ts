import mongoose, { Document, Model , Schema } from "mongoose";
import { UserAnswer } from "@/types/UserAnswer";

type UserAnswerDocument = UserAnswer & Document; 

const UserAnswerSchema = new Schema<UserAnswerDocument>(
    {
        attemptId: {
            type: Schema.Types.ObjectId,
            ref: "Attempt",
            required: true,
        },
        questionId: {
            type: Schema.Types.ObjectId,
            ref: "Question",
            required: true,
        },
        choiceId: {
            type: Schema.Types.ObjectId,
            ref: "Choice",
            required: true,
            default: null,
        },
        textAnswer: {
            type: String,
            default: null,
            trim: true,
        },
        isCorrect: { 
            type: Boolean,
            default: null,
        },
    },
    { timestamps: true },
);

const UserAnswer: Model<UserAnswerDocument> = mongoose.model<UserAnswerDocument>("UserAnswer", UserAnswerSchema);

export default UserAnswer;

