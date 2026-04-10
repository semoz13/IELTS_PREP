import {BaseType} from "./BaseType";

export type QuestionType = 
    | "multiple_choice"
    | "true_false_not_given"
    | "fill_blank"
    | "match_heading"
    | "complete_table"
    | "match_paragraph"
    | "short_answer"
    | "label_diagram"
    | "complete_sentence";

export type TestType = "reading" | "listening" | "writing" | "speakong"; 
export type TestSection = "academic" | "general"; 

export type Passage = BaseType & {
    testId: string;
    index: number;
    title: string;
    body: string;
};

export type Choice = BaseType & {
    questionId: string;
    text: string;
    isCoorect: boolean ;
};

export type Question = BaseType & {
    testId: string;
    passageId: string;
    type: QuestionType;
    text: string;
    correctAnswer?: string;
    orderIndex: number;
};

export type ReadingAttempt = BaseType & {
    userId: string;
    testId: string;
    startedAt: Date;
    finishedAt: Date;
    score?: number;
    passageTimings: PassageTiming[];
    status: "in_progress" | "submitted";
};

export type PassageTiming = {
    passageId: string;
    passageIndex: number;
    timeSpentSeconds: number;
};

export type UserAnswer = BaseType &{
    attemptId: string;
    questionId: string;
    choiceId?: string;
    textAnswer?: string;
    isCorrect: boolean;
};
