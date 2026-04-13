import { QuestionType } from "./Reading.types";

export type GeneratedChoice = {
    text: string;
    isCorrect: boolean;
};

export type GeneratedQuestion = {
    text: string;
    type: QuestionType;
    correctAnswer? : string;
    choices?: GeneratedChoice[];
    orderIndex: number;
};

export type GeneratedPassage = {
    index: number;
    title: string;
    body: string;
    questions: GeneratedQuestion[];
};

export type GeneratedReadingTest = {
    title: string; 
    section: "academic" | "general";
    passages: GeneratedPassage[]; //real data because passage is a type
};

