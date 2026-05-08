import { Types } from "mongoose";
import path from "path";
import fs from "fs";

import Attempt from "@/models/Attempt";
import Test from "@/models/Test";
import SpeakingQuestion from "@/models/SpeakingQuestion";
import SpeakingSubmission from "@/models/SpeakingSubmission";
import { aiService } from "@/services/ai.services";
import { SpeakingCriteriaScores } from "@/types/Speaking.types";


// ─── Scoring helper ───────────────────────────────────────────
// Strategy: flat average of all reviewed question bands,
//   regardless of which part they belong to.
//   Round to nearest 0.5 (official IELTS convention).
// Only called once ALL submitted questions in an attempt are reviewed.
const computeOverallBand = (
  submissions: Array<{ teacherBand: number | null }>,
): number | null => {
  const bands = submissions
      .map((s) => s.teacherBand)
      .filter((b): b is number => b !== null);

  if (bands.length === 0) return null;

  const avg = bands.reduce((sum, b) => sum + b, 0) / bands.length;
  return Math.round(avg * 2) / 2; //round to nearest 0.5
};

//    startTest
//    AI generates N questions across 3 parts (flexible count).
//    Persists: Test → SpeakingQuestions → Attempt.
const startTest = async ( userId: string ): Promise<{
    attemptId: string;
    testId: string;
    questions: object[] 
}> => {
    const generated = await aiService.generateSpeakingTest();

    const test = await Test.create({
    title:       generated.title,
    type:        "speaking",
    section:     "academic",  // speaking has no academic/general split
    duration:    15,
    createdBy:   new Types.ObjectId(userId),
    isAiGenerated: true,
  });

    const questions = await SpeakingQuestion.insertMany(
        generated.questions.map((q) => ({
          testId:                   test._id,
          partNumber:               q.partNumber,
          orderIndex:               q.orderIndex,
          prompt:                   q.prompt,
          preparationTimeSeconds:   q.preparationTimeSeconds,
          answerTimeSeconds:        q.answerTimeSeconds,
        })),
    );

  const attempt = await Attempt.create({
    userId: new Types.ObjectId(userId),
    testId: test._id,
    startedAt: new Date(),
    status: "in_progress",
  });

  return {
      attemptId: attempt._id.toString(),
      testId:    test._id.toString(),
      questions: questions.map((q) => ({
          questionId:             q._id,
          partNumber:             q.partNumber,
          orderIndex:             q.orderIndex,
          prompt:                 q.prompt,
          preparationTimeSeconds: q.preparationTimeSeconds,
          answerTimeSeconds:      q.answerTimeSeconds
    })),
  };
};



//    Returns attempt + all questions with existing submissions.
//    Supports resuming a partially-completed test.
const getAttemptState = async (attemptId: string, userId: string) => {
  const attempt = await Attempt.findOne({
    _id: new Types.ObjectId(attemptId),
    userId: new Types.ObjectId(userId),
  });

  if (!attempt) return null;

  const questions = await SpeakingQuestion
      .find({ testId: attempt.testId })
      .sort({ orderIndex: 1, partNumber: 1 });

  const questionsWithSubmissions = await Promise.all(
    questions.map(async (q) => {
      const submission = await SpeakingSubmission.findOne({
        attemptId: new Types.ObjectId(attemptId),
        questionId: q._id,
      });

      return {
        questionId:                   q._id,
        partNumber:               q.partNumber,
        orderIndex:               q.orderIndex,
        prompt:                   q.prompt,
        preparationTimeSeconds:   q.preparationTimeSeconds,
        answerTimeSeconds:        q.answerTimeSeconds,
        submission: submission
          ? {
              submissionId: submission._id,
              audioUrl: submission.audioUrl,
              reviewStatus: submission.reviewStatus,
              teacherBand: submission.teacherBand,
              teacherCriteriaScores:  submission.teacherCriteriaScores ?? null,
              teacherFeedback: submission.teacherFeedback ?? null,
            }
          : null,
      };
    }),
  );

  return {
    attemptId: attempt._id,
    testId: attempt.testId,
    status: attempt.status,
    startedAt: attempt.startedAt,
    finishedAt: attempt.finishedAt ?? null,
    score:         attempt.score ?? null,
    totalQuestions: questions.length,
    questions:     questionsWithSubmissions,
  };
};

//    One call per question. Re-uploading the same questionId
//    deletes the previous audio file on disk and resets
//    teacher scores (student chose to re-record).

const uploadAnswer  = async (
  attemptId:   string,
  userId:      string,
  questionId:  string,
  audioUrl:    string,
): Promise<{
  submissionId: string;
  questionId:   string,
  partNumber:   number,
  orderIndex:   number,
  audioUrl:     string,
  reviewStatus: string;
}> => {
      // Attempt must belong to this user and be open
  const attempt = await Attempt.findOne({
    _id:    new Types.ObjectId(attemptId),
    userId: new Types.ObjectId(userId),
    status: "in_progress",
  });
  if (!attempt) throw new Error("Attempt not found or already submitted");
      // Question must belong to this attempt's test
  const question = await SpeakingQuestion.findOne({
    _id: new Types.ObjectId(questionId),
    testId: attempt.testId,
  });
  if (!question) throw new Error("Question not found for this attempt");


  //delete old audio file if student is re-recording 
  const existing = await SpeakingSubmission.findOne({
    attemptId:  new Types.ObjectId(attemptId),
    questionId: new Types.ObjectId(questionId),
  });
  if (existing && existing.audioUrl !== audioUrl){
    const oldFile = path.join(
      process.cwd(), "uploads" , "speaking",
      path.basename(existing.audioUrl),
    );
    if (fs.existsSync(oldFile)) fs.unlinkSync(oldFile);
  }

  const submission = await SpeakingSubmission.findOneAndUpdate(
    {
      attemptId: new Types.ObjectId(attemptId),
      questionId: new Types.ObjectId(questionId),
    },
    {
      partNumber: question.partNumber,
      orderIndex: question.orderIndex,
      audioUrl,
      reviewStatus: "pending_teacher",
      //reset teacher data on re record 
      teacherBand: null,
      teacherCriteriaScores: null,
      teacherFeedback: null,
    },
    { upsert: true, new: true },
  );

  return {
    submissionId: submission._id.toString(),
    questionId:   question._id.toString(),
    partNumber:   submission.partNumber,
    orderIndex:   submission.orderIndex,
    audioUrl:     submission.audioUrl,
    reviewStatus: submission.reviewStatus,
  };
};


//    Closes the attempt. Score stays null — set only after the
//    teacher reviews all submitted answers.
const submitAttempt = async (
  attemptId: string,
  userId:    string,
): Promise<{
  submittedCount: number;
  skippedCount:   number;
  totalQuestions:  number;
}> => {
  const attempt = await Attempt.findOne({
    _id:    new Types.ObjectId(attemptId),
    userId: new Types.ObjectId(userId),
  });
  if (!attempt) throw new Error("Attempt not found or already submitted");

  const [submissions, totalQuestions] = await Promise.all([
    SpeakingSubmission.find({ attemptId: new Types.ObjectId(attemptId) }),
    SpeakingQuestion.countDocuments({ testId: attempt.testId }),
  ]);

  attempt.finishedAt = new Date();
  attempt.status     = "submitted";
  await attempt.save();

  return {
    submittedCount: submissions.length,
    skippedCount: totalQuestions - submissions.length,
    totalQuestions,
  };
};


//    All submissions awaiting review. Optional studentId filter.

const getPendingReviews  = async ( studentId?: string ) => {
  const filter: Record<string, unknown> = {
    reviewStatus: { $in: ["pending_teacher", "under_review"] },
  };
  
  if (studentId) {
    const attempts = await Attempt.find({
      userId: new Types.ObjectId(studentId),
    }).select("_id");
    filter.attemptId = { $in: attempts.map((a) => a._id) };
  }

  return SpeakingSubmission.find(filter)
      .populate({
        path:     "attemptId",
        select:   "userId startedAt finishedAt",
        populate: { path: "userId", select: "name email" },
      })
      .populate(
          "questionId",
          "partNumber orderIndex prompt preparationTimeSeconds answeTimeSeconds",
      )
      .sort({ "question.partNumber": 1, "questionId.orderIndex": 1, createdAt: 1});
};

const markUnderReview = async (submissionId: string) => {
  return SpeakingSubmission.findOneAndUpdate(
    {

      _id:            new Types.ObjectId(submissionId),
      reviewStatus:   "pending_teacher",


    },
    { reviewStatus: " under_review" },
    { new: true },
  );
};


//    Teacher scores one question. When ALL submitted answers
//    for the attempt are teacher_reviewed, the overall band is
//    computed using the per-part weighted strategy and written
//    to attempt.score.
//
//    Scoring strategy:
//      part_band[p] = mean(teacherBand of all reviewed questions in part p)
//      overall      = mean(part_band[1], part_band[2], part_band[3])
//      rounded to nearest 0.5
//
//    Parts with zero reviewed questions are excluded from the
//    overall average (not penalised as zero).

const reviewSubmission = async (
  submissionId:           string,
  teacherBand:            number,
  teacherCriteriaScores:  SpeakingCriteriaScores,
  teacherFeedback:        string,
) => {
  const submission = await SpeakingSubmission.findByIdAndUpdate(
    new Types.ObjectId(submissionId),
    {
      teacherBand,
      teacherCriteriaScores,
      teacherFeedback,
      reviewStatus: "teacher_reviewd",
    },
    { new: true },
  );

  if (!submission) return null;

  //recompute overall band when all submitted answers are reviewd 
  const allSubmissions = await SpeakingSubmission.find({
    attemptId: submission.attemptId,
  });

  const allReviewd = allSubmissions.every(
    (s) => s.reviewStatus === "teacher_reviewd",
  );

  if (allReviewd) {
    const overall = computeOverallBand(
      allSubmissions.map((s) => ({
        teacherBand: s.teacherBand,
      })),
    );

    if (overall !== null) {
      await Attempt.findByIdAndUpdate(submission.attemptId, { score: overall });
    } 
  }

  return submission;

};

export const speakingService = {
  startTest,
  getAttemptState,
  uploadAnswer,
  submitAttempt,
  getPendingReviews,
  markUnderReview,
  reviewSubmission,
};