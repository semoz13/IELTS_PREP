import { Request, Response, NextFunction } from "express";
import { readingService } from "@/services/reading.service";
import { StatusCodes } from "http-status-codes";
import { BadRequestError } from '@/utils/errors'; 
const startTest = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user.userId;
    const {section} = req.body;
    if (!section || !['academic' , 'general'].includes(section)){

      throw new BadRequestError(`section is required,expectedacademic or general and got : ${section}`);
    }
  

    const result = await readingService.startTest(userId, section);

    res.status(StatusCodes.CREATED).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

//get current attempt state
const getAttemptState = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user.userId;
    const { attemptId } = req.params;

    const state = await readingService.getAttemptState(
      attemptId as string,
      userId,
    );

    if (!state) {
      res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: "Attempt not found",
      });
      return;
    }

    res.status(StatusCodes.OK).json({ success: true, data: state });
  } catch (error) {
    next(error);
  }
};

//save a single answer
const saveAnswer = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user.userId;
    const { attemptId } = req.params as { attemptId: string };
    const { questionId, choiceId, textAnswer } = req.body;

    if (!questionId) {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "questionId is required",
      });
      return;
    }

    const answer = await readingService.saveAnswer(
      attemptId,
      userId,
      questionId,
      choiceId,
      textAnswer,
    );

    if (!answer) {
      res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: "Attempt not found or already submitted",
      });
      return;
    }

    res.status(StatusCodes.OK).json({ success: true, data: answer });
  } catch (error) {
    next(error);
  }
};

//update passage timing
const updatePassageTiming = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user.userId;
    const { attemptId } = req.params as { attemptId: string };
    const { passageId, timeSpentSeconds } = req.body;

    if (!passageId || timeSpentSeconds === undefined) {
      res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: "passageId and timeSpentSeconds are required",
      });
      return;
    }
    const timings = await readingService.updatePassageTiming(
      attemptId,
      userId,
      passageId,
      timeSpentSeconds,
    );

    if (!timings) {
      res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: "Attempt not found or already submitted",
      });
    }
    res.status(StatusCodes.OK).json({ success: true, data: timings });
  } catch (error) {
    next(error);
  }
};

//submit attempt + get results

const submitAttempt = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user.userId;
    const { attemptId } = req.params as { attemptId: string };

    const result = await readingService.submitAttempt(attemptId, userId);

    if (!result) {
      res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: "Attempt not found or already submitted",
      });
      return;
    }

    res.status(StatusCodes.OK).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const readingController = {
  startTest,
  getAttemptState,
  saveAnswer,
  updatePassageTiming,
  submitAttempt,
};
