import mongoose, { Types , Schema, Document, Model} from "mongoose";
import { ListeningSection } from "@/types/Listening.types";

type ListeningSectionDocument = ListeningSection & Document;

const ListeningSectionDocument = new Schema<ListeningSectionDocument>(
    {
        testId: {
            type: Types.ObjectId,
            ref: "Test",
            required: true,
        },
        sectionNumber: {
            type: Number,
            required: true,
            min: 1,
            max: 4,
        },
        audioUrl: {
            type: String,
            required: true,
            trim: true,
        },
        maxPlays: {
            type: Number,
            default: 2,
        },
        transcript: { 
            type: String,
            trim: true,
        },
    },
    { timestamps: true},
);

const ListeningSection: Model<ListeningSectionDocument> =
mongoose.model<ListeningSectionDocument>(
    "ListeningSection",
    ListeningSectionDocument,
);

export default ListeningSection;