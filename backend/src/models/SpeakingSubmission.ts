import mongoose, { Schema, Model, HydratedDocument } from "mongoose";
import { SpeakingSubmission , SpeakingCriteriaScores} from "@/types/Speaking.types";

type SpeakingSubmissionDocument = HydratedDocument<SpeakingSubmission>;

const CriteriaScoresSchema = new Schema<SpeakingCriteriaScores>(
    {
      fluencyCoherence: { type: Number, min: 0, max: 9 },
      lexicalResource:  { type: Number, min: 0, max: 9 },
      grammaticalRange: { type: Number, min: 0, max: 9 },
      pronunciation:    { type: Number, min: 0, max: 9 },
    },
    { _id: false },
);

const SpeakingSubmissionSchema = new Schema<SpeakingSubmissionDocument>(
  {
    attemptId: {
      type: Schema.Types.ObjectId,
      ref: "Attempt",
      required: true,
    },
    questionId: {
      type: Schema.Types.ObjectId,
      ref: "SpeakingQuestion",
      required: true,
    },
    partNumber: {
      type: Number,
      enum: [ 1, 2 , 3 ],
      required: true,
    },
    orderIndex: {
      type: Number,
      required: true,
    },
    audioUrl: {
      type: String,
      required: true,
      trim: true,
    },
    teacherBand: {
      type: Number,
      min: 0,
      max: 9,
      default: null,
    },
    teacherCriteriaScores: {
      type: CriteriaScoresSchema,
      default: null,
    },
    teacherFeedback: {
      type: String,
      default: null,
      trim: true,
    },
    reviewStatus: {
      type: String,
      enum: ["pending_teacher", "under_review", "teacher_reviewed"],
      default: "pending_teacher",
    },
  },
  { timestamps: true },
);

// One submission per (attempt × question) — re-recording upserts, never duplicates
SpeakingSubmissionSchema.index(
  { attemptId: 1, partId: 1 },
  { unique: true }
);

const SpeakingSubmission: Model<SpeakingSubmissionDocument> = 
  mongoose.model<SpeakingSubmissionDocument>("SpeakingSubmission",SpeakingSubmissionSchema,
);

export default SpeakingSubmission;

