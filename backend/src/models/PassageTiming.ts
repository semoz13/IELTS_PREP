import { Schema } from "mongoose";
import { passageTiming } from "@/types/Reading.type";


export const PassageTimingSchema = new Schema<passageTiming>(
    {
        passageId: {
            type: Schema.Types.ObjectId,
            ref: "Passage",
            required: true
        },
        passageIndex: {
            type: Number,
            required: true
        },
        timeSpentSeconds: {
            type: Number,
            required: true,
            default: 0
        },
    },
    { _id: false }, 
);