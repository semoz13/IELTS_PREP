import mongoose, { Types,Schema, Document,Model} from "mongoose";
import { Attempt } from "@/types/Attempt";
import { PassageTimingSchema } from "./PassageTiming";

type AttemptDocument =  Attempt & Document;

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