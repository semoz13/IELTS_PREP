import { listeningService } from "@/services/listening.service";
import { Request , Response , NextFunction } from "express";
import { StatusCodes } from "http-status-codes";




const startTest = async (
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> => {
    try { 
        const userId = (req as any).user.userId;

        const result = await listeningService.startTest(userId);
        res.status(StatusCodes.CREATED).json({ success: true,data: result });
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
        const userId = (req as any).user.userId
        const { attemptId } = req.params;

        const state = await listeningService.getAttemptState(attemptId as string, userId);

        if (!state) {
            res 
                .status(StatusCodes.NOT_FOUND)
                .json({ success: false, message: "Attempt not found" });
            return;
        }

        res.status(StatusCodes.OK).json({ success: true, data:state });
    } catch (error) {
        next(error);
    }
};
// body {sectionId}
const registerPlay = async (
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        const userId = (req as any).user.userId;
        const { attemptId } = req.params;
        const { sectionId } = req.body;

        if (!sectionId) {
            res
                .status(StatusCodes.BAD_REQUEST)
                .json({ success: false, message: "sectionId is required" });
            return;
        }
        const result = await listeningService.registerPlay(
            attemptId as string,
            userId,
            sectionId,
        );

        res.status(StatusCodes.OK).json({ success: true, data: result });
    } catch (error) {
        if (error instanceof Error && error.message.includes("play limit")) {
            res
                .status(StatusCodes.FORBIDDEN)
                .json({ success: false, message: error.message });
            return;
        }
        next(error);
    }
};

// body {questionId, choiceId?, textAnswer?}
const saveAnswer = async (
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        const userId = ( req as any ).user.userId;
        const { attemptId } = req.params;
        const { questionId, choiceId, textAnswer } = req.body;

        if (!questionId) {
            res
                .status(StatusCodes.BAD_REQUEST)
                .json({ success: false, message: "questionId is required" });
            return;
        }

        const answer = await listeningService.saveAnswer(
            attemptId as string,
            userId,
            questionId,
            choiceId,
            textAnswer,
        );

        if(!answer) {
            res
                .status(StatusCodes.NOT_FOUND)
                .json({success: false, message: "Attempt not found or already submitted"});
            return;
        }

        res.status(StatusCodes.OK).json({ success: true, data:answer });
    } catch (error) {
        next(error);
    }
};

const submitAttempt = async (
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        const userId = (req as any).user.userId;
        const { attemptId } = req.params;

        const result = await listeningService.submitAttempt(attemptId as string, userId);

        if (!result) {
            res.status(StatusCodes.NOT_FOUND).json({ 
                success: false,
                message: "Attempt not found or already submitted",
            });
            return;
        }
        res.status(StatusCodes.OK).json({ success: true,data: result });
    } catch (error) {
        next(error);
    }
};

export const listeningController = {
    startTest,
    getAttemptState,
    registerPlay,
    saveAnswer,
    submitAttempt,
};
