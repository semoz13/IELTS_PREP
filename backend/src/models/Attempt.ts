import mongoose, { Types,Schema, Document,Model} from "mongoose";
import { Attempt } from "@/types/Attempt";
import { passageTiming } from "@/types/Reading.types";

type AttemptDocument =  Attempt & Document;

const PassageTimingSchema = new Schema<passageTiming>(
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

const AttemptSchema = new Schema<AttemptDocument>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        testId: {
            type: Types.ObjectId,
            ref: "Test",
            required: true,
        },
        startedAt: { 
            type: Date,
            default: Date.now
        },
        finishedAt: {
            type: Date,
            default: null
        },
        score: {
            type: Number,
            default: null
        },
        passageTimings: {
            type: [PassageTimingSchema],
            default: []
        },
        status: {
            type: String,
            enum: ["in_progress", "submitted"],
            default: "in_progress",
        },
    },
    { timestamps: true },
);

const Attempt: Model<AttemptDocument> = mongoose.model<AttemptDocument>(
    "Attempt",
    AttemptSchema,
);

export default Attempt;