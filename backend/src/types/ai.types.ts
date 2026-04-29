import { QuestionType } from "./Reading.type";


//reading AI types 
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

//listening AI types
export type GeneratedListeningQuestion = {
    type : "multiple_choice" | "fill_blank" | "match_statement" | "complete_table";
    text: string;
    correctAnswer?: string;
    choices?: GeneratedChoice[];
    orderIndex: number;
};

export type GeneratedListeningSection = {
    sectionNumber: number;
    audioUrl: string;
    questions: GeneratedListeningQuestion[];
};

export type GeneratedListeningTest = {
    title: string;
    sections: GeneratedListeningSection[];
};
