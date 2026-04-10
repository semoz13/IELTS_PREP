import mongoose, {Schema, Document, Model} from "mongoose";
import { Passage } from "@/types/ReadingTypes";

type IpassageDocument = Passage & Document;

const PassageSchema = new Schema<IpassageDocument>(
    {
        testId: { 
            type: String, //first it says ObjectId
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

const Passage: Model<IpassageDocument> = mongoose.model<IpassageDocument>(
    "Passage",
    PassageSchema,
);

export default Passage;