import { Types , Schema } from "mongoose";
import { QuestionType } from "@/types/Reading.types";
import { BaseType } from "@/types/BaseType"; 

export type Question = BaseType & {
    testId: Types.ObjectId;
    passageId: Types.ObjectId; 
    type: QuestionType;
    text: string;
    correctAnswer?: string | null;
    orderIndex: number;
};