import { Types , Schema } from "mongoose";
import { QuestionType } from "@/types/Reading.type";
import { BaseType } from "@/types/BaseType"; 

export type Question = BaseType & {
    testId: Types.ObjectId;
    passageId: Types.ObjectId | null; 
    sectionId?: Types.ObjectId;
    type: QuestionType ;
    text: string;
    correctAnswer?: string | null;
    orderIndex: number;
};