import mongoose, { Schema, Document, Model } from "mongoose";
import { ListeningPlayRecord } from "@/types/Listening.types";

type ListeningPlayRecordDocument = ListeningPlayRecord & Document; 

const ListeningPlayRecordSchema = new Schema<ListeningPlayRecordDocument>(
    {
        attemptId: {
            type: Schema.Types.ObjectId,
            ref: "Attempt",
            required: true,
        },
        sectionId: {
            type: Schema.Types.ObjectId,
            ref: "ListeningSection",
            required: true,
        },
        playCount: {
            type: Number,
            default: 0,
        },
    },
    { timestamps: true},
);

// One record per (attempt, section) pair — enforce at DB level
ListeningPlayRecordSchema.index(
    {attmeptId: 1, sectionId: 1 },
    { unique: true },
);

const ListeningPlayRecord: Model<ListeningPlayRecordDocument> = 
mongoose.model<ListeningPlayRecordDocument>(
    "ListeningPlayRecord",
    ListeningPlayRecordSchema,
);
export default ListeningPlayRecord;