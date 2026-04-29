import { TestSection } from "@/types/Reading.type";
import { BaseType } from "@/types/BaseType";
import { User } from "@/types/UserType";
import { Types, Schema } from "mongoose";

export type Test = BaseType & {
    title: string;
    type: "reading" | "listening" | "writing" | "speaking";
    section:TestSection;
    duration: number;
    createdBy: Types.ObjectId | User;
    isAiGenerated: boolean;
};