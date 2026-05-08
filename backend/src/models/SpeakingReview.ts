// import mongoose, { Schema, Model, HydratedDocument } from "mongoose";
// import { SpeakingReview , SpeakingCriteriaScores } from "@/types/Speaking.types";

// type SpeakingReviewDocument = HydratedDocument<SpeakingReview>;


// const SpeakingReviewSchema = new Schema<SpeakingReviewDocument>(
//     {
//       submissionId: {
//       type: Schema.Types.ObjectId,
//       ref: "SpeakingSubmission",
//       required: true,
//     },
//     teacherId: {
//       type: Schema.Types.ObjectId,
//       ref: "User",
//       required: true,
//     },
//     criteriaScores: {
//       type: CriteriaScoresSchema,
//       required: true,
//     },
//     // bandScore = average of 4 criteria, rounded to nearest 0.5
//     // Stored explicitly so queries/dashboards don't need to recompute
//     bandScore: {
//       type: Number,
//       required: true,
//       min: 0,
//       max: 9,
//     },
//     feedback: {
//       type: String,
//       required: true,
//       trim: true,
//     },
//   },
//   { timestamps: true },
// );

// // A teacher can only submit one review per submission
// SpeakingReviewSchema.index({ submissionId: 1 }, { unique: true });

// const SpeakingReview: Model<SpeakingReviewDocument> =
//     mongoose.model<SpeakingReviewDocument>("SpeakingReview", SpeakingReviewSchema,);

// export default SpeakingReview;

