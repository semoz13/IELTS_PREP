import { BaseType } from "@/types/BaseType";
import { Types } from "mongoose";

// IELTS Speaking has 3 parts:
//   Part 1 — familiar topics,    ~4 min,  no prep
//   Part 2 — cue card long turn, ~4 min,  60 s prep
//   Part 3 — abstract discussion,~5 min,  no prep

export type SpeakingPartNumber  = 1 | 2 | 3;

export type SpeakingQuestion = BaseType & {
  testId: Types.ObjectId;
  partNumber: SpeakingPartNumber;
  prompt: string;       // e.g. "Describe a village you visited."
  preparationTimeSeconds: number;
  answerTimeSeconds: number;
  orderIndex: number;   // position within its part , 1-based, unique within the part
};

export type SpeakingCriteriaScores = {
  fluencyCoherence: number; // 0–9
  lexicalResource: number; // 0–9
  grammaticalRange: number; // 0–9
  pronunciation: number; // 0–9
};

export type SpeakingReviewStatus = 
    | "pending_teacher"
    | "under_review"
    | "teacher_reviewd";

export type SpeakingSubmission = BaseType & {
  attemptId: Types.ObjectId;
  questionId: Types.ObjectId;
  partNumber: SpeakingPartNumber;
  orderIndex: number; 

  audioUrl: string;

  teacherBand : number | null
  teacherCriteriaScores: SpeakingCriteriaScores | null;
  teacherFeedback: string | null;
  reviewStatus: SpeakingReviewStatus
};
