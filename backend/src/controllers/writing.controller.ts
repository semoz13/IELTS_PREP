import { Request, Response, NextFunction } from "express";

import { writingService } from "@/services/writing.service";
import { StatusCodes } from "http-status-codes";
import { WritingCriteriaScores } from "@/types/Writing.types";




const startTest = async (
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        const userId =  (req as any).user.userId;
        const section = (req.body.section as "academic" | "general") ?? "academic";

        const result = await writingService.startTest(userId, section);
        res.status(StatusCodes.CREATED).json({ success: true, data: result });
    } catch (error) {
        next (error);
    }
};


const getAttemptState = async (
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        const userId = (req as any).user.userId;
        const { attemptId } = req.params;

        const state = await writingService.getAttemptState(attemptId as string, userId);

        if (!state) {
            res 
                .status(StatusCodes.NOT_FOUND)
                .json({ success:false, message:"Attempt not found" });
            return;
        }

        res
            .status(StatusCodes.OK)
            .json({ success: true, data: state });

    } catch (error) {
        next (error);
    }
};


const submitTask = async (
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        const userId = (req as any).user.userId;
        const { attemptId } =req.params;

        const { taskId, responseText } = req.body;

        if (!taskId || !responseText) {
            res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: "taskId and responseText are required", });
            return;
        }

        if (typeof responseText !== "string" || responseText.trim().length === 0) {
            res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: "responseText must be a non-empty string", });
            return;
        }

        const result = await writingService.submitTask(
            attemptId as string,
            userId,  
            taskId, 
            responseText
        );

        res
            .status(StatusCodes.OK)
            .json({ success: true,data: result });

    } catch (error) {
        if (error instanceof Error && error.message.includes("not found")) {
            res
              .status(StatusCodes.NOT_FOUND)
              .json({ success: false, message: error.message });
            return;
          }
        next (error);
    }
};

// ─── PATCH /api/writing/submissions/:submissionId/review  (teacher) ─
// Body: { teacherBand, teacherCriteriaScores, teacherFeedback }
const reviewSubmission = async (
    req: Request,
    res: Response,
    nextt: NextFunction,
): Promise<void> => {
    try {
        const teacherId = ( req as any ).user.userId;
        const { submissionId } = req.params;
        const { teacherBand , teacherCriteriaScores , teacherFeedback } = req.body;

        if ( 
            teacherBand === undefined ||
            !teacherCriteriaScores ||
            !teacherFeedback
        ) {
            res.status(StatusCodes.BAD_REQUEST).json({
                success: false, 
                message: "teacherBand , teacherCriteriaScores, and teacherFeedBack are required",
        });
        return;
        }

        if (teacherBand < 0 || teacherBand > 9 ) {
            res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: "teacherBand must be between 0 and 9",
            });
            return;
        }

        const result = await writingService.reviewSubmission(
            submissionId as string,
            teacherId,
            teacherBand,
            teacherCriteriaScores as WritingCriteriaScores,
            teacherFeedback,
        );

        if (!result) {
            res
              .status(StatusCodes.NOT_FOUND)
              .json({ success:false , message: "submission not found" });
            return;
        }

        res.status(StatusCodes.OK).json({ success: true, data: result });
    } catch (error) {
        nextt(error);
    }
};

// ─── GET /api/writing/reviews/pending  (teacher) ─────────────
// Optional query param: ?studentId=xxx to filter by student
const getPendingReviews = async (
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        const { studentId } = req.query;

        const submissions = await writingService.getPendingReviews(
            studentId as string | undefined,
        );

        res.status(StatusCodes.OK).json({ success: true, data: submissions });
    } catch (error) {
        next(error);
    }
};

export const writingController = {
    startTest,
    getAttemptState,
    submitTask,
    reviewSubmission,
    getPendingReviews,
};
