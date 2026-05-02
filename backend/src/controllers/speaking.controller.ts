import { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";

import { speakingService }        from "@/services/speaking.service";
import { buildAudioUrl }          from "@/middleware/upload.middleware";
import { SpeakingCriteriaScores } from "@/types/Speaking.types";

const startTest = async (
    req: Request,
    res: Response, 
    next: NextFunction
): Promise<void> => {
    try {
      const result = await speakingService.startTest(req.user.userId);
      res.status(StatusCodes.CREATED).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
};

const getAttemptState = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {

    const state = await speakingService.getAttemptState(
      req.params.attemptId as string,
      req.user.userId,
    );
    if (!state) {
      res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: "Attempt not found" 
      });
      return;
    }
    res.status(StatusCodes.OK).json({ success: true, data: state });
  } catch (error) {
    next(error);
  }
};

// multipart/form-data  →  field "audio" (file) + field "questionId" (string)
const uploadAnswer = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { questionId } = req.body as { questionId?: string };

    if (!req.file) {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "audio file is required(multipart field name: audio)",
      });
      return;
    }

    if (!questionId || questionId.trim() === "") {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "questionId is required",
      });
      return;
    }
    const result = await speakingService.uploadAnswer(
      req.params.attemptId as string,
      req.user.userId,
      questionId,
      buildAudioUrl(req.file.filename),
    );

    res.status(StatusCodes.CREATED).json({ success: true, data: result });
  } catch (error) {
    if (error instanceof Error && error.message.includes("not found")) {
      res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: error.message,
      });
      return;
    } 
    next(error);
  }

};


// multipart/form-data: { partId, transcript?, audio(file) }
const submitAttempt = async (
  req: Request,
  res: Response, 
  next: NextFunction
): Promise<void> => {
  try {
    const result = await speakingService.submitAttempt(
      req.params.attemptId as string,
      req.user.userId
    ); 
    res.status(StatusCodes.OK).json({ success: true, data: result });
  } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          message: error.message,
        });
        return;
      }
      next(error);
  }
};

const getPendingReviews = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const data = await speakingService.getPendingReviews(
      req.query.studentId as string | undefined,
    );
    res.status(StatusCodes.OK).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const markUnderReview = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = await speakingService.markUnderReview(
      req.params.submissionId as string);

    if (!result) {
      res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: "submission not found or already claimed / reviewd",
      });
      return;
    }

    res.status(StatusCodes.OK).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

const reviewSubmission = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { teacherBand, teacherCriteriaScores, teacherFeedback } = req.body as {
      teacherBand: unknown;
      teacherCriteriaScores: unknown;
      teacherFeedback: unknown;
    };

    if (teacherBand === undefined || teacherBand === null) {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "teacherBand is required",
      });
      return;
    }

  // ── teacherCriteriaScores ─────────────────────────────
    if (typeof teacherBand !== "number" || teacherBand < 0 || teacherBand > 9 ) {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "teacherBand must be between 0 and 9",
      });
      return;
    }

    if (!teacherCriteriaScores || typeof teacherCriteriaScores !== "object"){
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false, message: "teacherCriteriaScores is required",
      });
      return;

    }
    const criteriaKeys: (keyof SpeakingCriteriaScores)[] = [
      "fluencyCoherence" , "lexicalResource",
      "grammaticalRange" , "pronunciation"
    ];

    const criteria = teacherCriteriaScores as Record<string, unknown>;
    for (const key of criteriaKeys) {
      const val = criteria[key];
      if (typeof val !== "number" || val < 0 || val > 9) {
        res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          message: `teacherCriteriaScores.${key} must be a number between 0 and 9 `,
        });
        return;
      }
    }

    //teacherFeedback
    if (typeof teacherFeedback !== "string" || teacherFeedback.trim().length === 0){
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "teacherFeedback is required and must be a non-empty string",
      });
      return;
    }

    const result = await speakingService.reviewSubmission(
      req.params.submissionId as string,
      teacherBand,
      teacherCriteriaScores as SpeakingCriteriaScores,
      teacherFeedback.trim(),
    );

    if (!result) {
      res.status(StatusCodes.NOT_FOUND).json({ success: false, message: "submission not found" });
      return;
    }

    res.status(StatusCodes.OK).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};



export const speakingController = {
  startTest,
  getAttemptState,
  uploadAnswer,
  submitAttempt,
  getPendingReviews,
  markUnderReview,
  reviewSubmission,
  
};

