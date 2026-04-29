import { BaseType } from "./BaseType";
import { Types , Schema } from "mongoose";

// ─── Section type: drives which prompt format is shown ────────
export type WritingSection = "academic" | "general";

// ─── Task type: Task1 (describe data/situation), Task2 (essay) ─
export type WritingTaskType = "task1" | "task2";

// ─── AI scoring criteria — mirrors the official IELTS rubric ──
export type WritingCriteriaScores = {
    taskAchievement: number;     // 0–9  (Task 1) or Task Response (Task 2)
    coherenceCohesion: number;   // 0–9
    lexicalResource: number;     // 0–9
    grammaticalRange: number;    // 0–9
};

// one one task inside writingTest
export type WritingTask = BaseType & {
    testId: Types.ObjectId;
    taskType: WritingTaskType;
    section: WritingSection;
    //in ielts we have 2 types of writing task: task1 (describe data/situation) and task2 (essay)
    prompt: string;
    imageDescription?: string | null; // for task 1 descripe chart data
    minWordCount: number;
    timeAllowedMinutes: number;
};

export type WritingSubmission = BaseType & { 
    attemptId: Types.ObjectId;
    taskId: Types.ObjectId;
    taskType: WritingTaskType;
    responseText: string;
    wordCount: number;
    aiBand?: number;
    aiCriteriaScores?: WritingCriteriaScores;
    aiFeedback?: string;
    teacherBand?: number;
    teacherCriteriaScores?: WritingCriteriaScores;
    teacherFeedback?: string;
    reviewStatus: "pending_ai" | "ai_scored" | "pending_teacher" | "teacher_reviewed" ;
}

