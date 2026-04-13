import { Types , Schema } from "mongoose";
import { BaseType } from "@/types/BaseType";


export type UserAnswer = BaseType & {
    attemptId: Types.ObjectId;
    questionId: Types.ObjectId;
    choiceId: Schema.Types.ObjectId | null;
    textAnswer?: string | null;
    isCorrect?: boolean | null; 
}
