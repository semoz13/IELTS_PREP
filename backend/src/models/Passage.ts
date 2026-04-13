import mongoose, { Types,Schema, Document, Model} from "mongoose";
import { Passage } from "@/types/Reading.types";

type passageDocument = Passage & Document;

const PassageSchema = new Schema<passageDocument>(
    {
        testId: { 
            type: Types.ObjectId, //first it says ObjectId
            ref: "Test",
            required: true,
        },
        index: {
            type: Number,
            required: true,
            min: 1,
            max: 3,
        },
        title: {
            type: String,
            required: true,
            trim: true,
        },
        body: {
            type: String,
            required: true,
        },
    },
    { timestamps: true },
);

const Passage: Model<passageDocument> = mongoose.model<passageDocument>(
    "Passage",
    PassageSchema,
);

export default Passage;