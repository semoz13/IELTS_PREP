import { Types } from "mongoose";

import Test from "@/models/Test";
import WritingTask      from "@/models/WritingTask";
import WritingSubmission from "@/models/WritingSubmission";
import Attempt          from "@/models/Attempt";
import { aiService }   from "@/services/ai.services";
import { WritingCriteriaScores } from "@/types/Writing.types";

//count words on splits on whitespace — punctuation attached to words still counts as one word

const countWords = ( text: string): number =>
    text.trim().split(/\s+/).filter(Boolean).length;

// Start writing Test 
//AI generates both tasks at once. Returns the attempt + both task prompts.
const startTest = async (
    userId: string,
    section: "academic" | "general",
): Promise<{
    attemptId: string;
    testId: string;
    task1: object;
    task2: object;
}> => {

    // 1. Generate both task prompts from AI
    const generated = await aiService.generateWritingTest(section);

    // 2. Persist the test shell
    const test = await Test.create({
        title: generated.title,
        type: "writing",
        section,
        duration: 60,
        createdBy: new Types.ObjectId(userId),
        isAiGenerated: true,
    });

    // 3. Persist Task 1
    const task1 = await WritingTask.create({
        testId: test._id,
        taskType: "task1",
        section,
        prompt: generated.task1.prompt,
        imageDescription: generated.task1.imageDescription ?? null,
        minWordCount: generated.task1.minWordCount,
        timeAllowedMinutes: generated.task1.timeAllowedMinutes
    });

    // 4. Persist Task 2
    const task2 = await WritingTask.create({
        testId: test._id,
        taskType: "task2",
        section,
        prompt: generated.task2.prompt,
        imageDescription: null,
        minWordCount: generated.task2.minWordCount,
        timeAllowedMinutes: generated.task2.timeAllowedMinutes,
    });

    // 5. Open the attempt
    const attempt = await Attempt.create({
        userId: new Types.ObjectId(userId),
        testId: test._id,
        startedAt: new Date(),
        status: "in_progress",
    });

    return {
        attemptId: attempt._id.toString(),
        testId: test._id.toString(),
        task1: {
          taskId: task1._id,
          taskType: task1.taskType,
          prompt: task1.prompt,
          imageDescription: task1.imageDescription,
          minWordCount: task1.minWordCount,
          timeAllowedMinutes: task1.timeAllowedMinutes,
        },
        task2: {
          taskId: task2._id,
          taskType: task2.taskType,
          prompt: task2.prompt,
          minWordCount: task2.minWordCount,
          timeAllowedMinutes: task2.timeAllowedMinutes,
        },
    };
};

//Get current Attempt State 
const getAttemptState = async (attemptId: string, userId: string) => {
    const attempt = await Attempt.findOne({
        _id: new Types.ObjectId(attemptId),
        userId: new Types.ObjectId(userId),
    });

    if (!attempt) return null;

    const tasks = await WritingTask.find({ testId: attempt.testId }).sort({
        taskType: 1,
    });

    // Attach any existing submissions so the frontend can resume a draft
    const tasksWithSubmissions = await Promise.all(
        tasks.map(async (task) => {
            const submission = await WritingSubmission.findOne({
                attemptId: new Types.ObjectId(attemptId),
                taskId: task._id,
            });

            return {
                taskId: task._id,
                taskType: task.taskType,
                prompt: task.prompt,
                imageDescription: task.imageDescription,
                timeAllowedMinutes: task.timeAllowedMinutes,
                submission: submission
                    ? {
                        responseText: submission.responseText,
                        wordCount: submission.wordCount,
                        reviewStatus: submission.reviewStatus,
                        aiBand: submission.aiBand ?? null,
                        aiFeedback: submission.aiFeedback ?? null,
                        teacherBand: submission.teacherBand ?? null,
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
        tasks: tasksWithSubmissions,
    };
};

//submit one task 
// called separately for Task 1 and Task 2.
// AI scores it immediately and stores the result.
// the attempt stays "in_progress" until both tasks are submitted.
const submitTask = async (
    attemptId: string,
    userId: string,
    taskId: string,
    responseText: string,
): Promise<{
    submissionId: string;
    wordCount: number;
    meetsMinimum: boolean;
    aiBand: number;
    aiCriteriaScores: WritingCriteriaScores;
    aiFeedback: string;
}> => {
    const attempt = await Attempt.findOne({
        _id: new Types.ObjectId(attemptId),
        userId: new Types.ObjectId(userId),
        status: "in_progress"
    });

    if (!attempt) return Promise.reject(new Error("Attempt not found or already submitted"));

    const task = await WritingTask.findOne({
        _id: new Types.ObjectId(taskId),
        testId: attempt.testId,
    });

    if(!task) return Promise.reject(new Error("Task not found for this attempt"));

    const wordCount = countWords(responseText);
    const meetsMinimum = wordCount >= task.minWordCount;

    // AI scores regardless of word count — the band will reflect under-length responses
    const aiScore = await aiService.scoreWritingResponse(
        task.taskType,
        task.section,
        task.prompt,
        responseText,
    );

    // Upsert: if the student re-submits the same task, overwrite the previous attempt
    const submission = await WritingSubmission.findOneAndUpdate(
        {
          attemptId: new Types.ObjectId(attemptId),
          taskId: new Types.ObjectId(taskId),
        },
        {
          taskType: task.taskType,
          responseText,
          wordCount,
          aiBand: aiScore.band,
          aiCriteriaScores: aiScore.criteriaScores,
          aiFeedback: aiScore.feedback,
          reviewStatus: "pending_teacher",         // ready for teacher review
        },
        { upsert: true, new: true },
    );

    // Check if both tasks are now submitted — if so, close the attempt
    const allTasks = await WritingTask.find({ testId: attempt.testId });
    const submissions = await WritingSubmission.find({
        attemptId: new Types.ObjectId(attemptId),
    });

    if (submissions.length === allTasks.length) {
        // Both tasks submitted — compute overall band and close
        const overallBand = computeOverallBand(submissions.map((s) => s.aiBand ?? 0));
        attempt.score = overallBand;
        attempt.finishedAt = new Date();
        attempt.status = "submitted";
        await attempt.save();
    }

    return {
        submissionId: submission._id.toString(),
        wordCount,
        meetsMinimum,
        aiBand: aiScore.band,
        aiCriteriaScores: aiScore.criteriaScores,
        aiFeedback: aiScore.feedback,
    };
};

// ─── Step 4 (Teacher): Review and override AI scores ─────────
// Teacher can set their own band and criteria scores for either task.
// Their band replaces the AI band on the student's results screen.

const reviewSubmission = async (
    submissionId: string,
    teacherId: string,
    teacherBand: number,
    teacherCriteriaScores: WritingCriteriaScores,
    teacherFeedback: string,
  ) => {
    const submission = await WritingSubmission.findByIdAndUpdate(
      new Types.ObjectId(submissionId),
      {
        teacherBand,
        teacherCriteriaScores,
        teacherFeedback,
        reviewStatus: "teacher_reviewed",
      },
      { new: true },
    );
  
    if (!submission) return null;
    return submission;
};

// ─── Step 5 (Teacher): Get all submissions pending review ─────
// Returns all writing submissions where review is still pending,
// optionally filtered to a specific student.
const getPendingReviews = async (studentId?: string) => {
    const filter: Record<string, unknown> = {
      reviewStatus: "pending_teacher",
    };
  
    if (studentId) {
      // Find all attempt IDs for this student first
      const attempts = await Attempt.find({
        userId: new Types.ObjectId(studentId),
      }).select("_id");
  
      filter.attemptId = { $in: attempts.map((a) => a._id) };
    }
  
    const submissions = await WritingSubmission.find(filter)
      .populate({
        path: "attemptId",
        select: "userId startedAt finishedAt",
        populate: { path: "userId", select: "name email" },
      })
      .populate("taskId", "taskType prompt section")
      .sort({ createdAt: 1 });                   // oldest first — FIFO review queue
  
    return submissions;
};

// ─── Helper: IELTS overall Writing band ──────────────────────
// Official formula: average of Task 1 and Task 2 bands,
// but Task 2 is weighted double
const computeOverallBand = (bands: number[]): number => {
    if (bands.length === 0) return 0;
    if (bands.length === 1) return bands[0];
    // bands[0] = task1, bands[1] = task2
    const weighted = (bands[0] + bands[1] * 2) / 3;
    // Round to nearest 0.5
    return Math.round(weighted * 2) / 2;
};
  
export const writingService = {
    startTest,
    getAttemptState,
    submitTask,
    reviewSubmission,
    getPendingReviews,
};
