import { Types , Schema } from "mongoose";
import { BaseType } from "@/types/BaseType";

export type Choice = BaseType & {
    questionId: Types.ObjectId;
    text: string;
    isCorrect: boolean;
};

