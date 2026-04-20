import { BaseType } from "./BaseType";
import { Schema , Types } from "mongoose";
// IELTS has 4 sections — each with its own audio clip and questions

export type ListeningSection = BaseType & {
    testId: Types.ObjectId; //was schema 
    sectionNumber: number;  // 1 | 2 | 3 | 4
    audioUrl: string;       // path stored after teacher uploads via multer
    maxPlays: number;       // always 2 per IELTS rules
    transcript: string;     // optional — teacher can add later
}

export type ListeningPlayRecord = BaseType & {
    attemptId: Types.ObjectId, //schema 
    sectionId: Types.ObjectId, //schema
    playCount: number
}