import { Types } from "mongoose";
import { aiService } from "./ai.services";

import Passage from "@/models/Passage";
import Test from "@/models/Test";
import Question from "@/models/Questions";
import Choice from "@/models/Choice";
import Attempt from "@/models/Attempt";
import UserAnswer  from "@/models/UserAnswer";
import { passageTiming } from "@/types/Reading.types";

const startTest = async (
    userId: string,
    section: "academic" | "general", 
): Promise<{ attemptId: string; testId: string }> => {
    //generate content from Ai
    const generated = await aiService.generateReadingTest(section);

    //create the test document 
    const test = await Test.create({
        title: generated.title,
        type: "reading",
        section: generated.section,
        duration: 60,
        createdBy: new Types.ObjectId(userId),
        isAiGenerated: true,
    });
    
    //create passage and question and choices 
    for (const p of generated.passages){
        const passage = await Passage.create({
            testId: test._id,
            index: p.index,
            title: p.title,
            body: p.body,
        });

    for (const q of p.questions){
        const question = await Question.create({
            testId: test._id,
            passageId: passage._id,
            type: q.type,
            text: q.text,
            correctAnswer: q.correctAnswer ?? undefined,
            orderIndex: q.orderIndex,
        });
    
    if (q.choices && q.choices.length > 0){
        await Choice.insertMany(
            q.choices.map((c: { text: string; isCorrect: boolean}) => ({
                questionId: question._id,
                text: c.text,
                isCorrect: c.isCorrect,
            })),
        );
    }
    }   
}
//create the attempt
const attempt = await Attempt.create({
    userId: new Types.ObjectId(userId),
    testId: test._id,
    startedAt: new Date(),
    status: "in_progress",
});

return {
    attemptId: attempt._id.toString(),
    testId: test._id.toString(),
};
};

//get attempt state (passages + question for the student)
const getAttemptState = async (attemptId: string, userId: string) => {
    const attempt = await Attempt.findOne({
        _id: new Types.ObjectId(attemptId),
        userId: new Types.ObjectId(userId),
    });

    if (!attempt) return null;
    const passages = await Passage.find({testId: attempt.testId}).sort({
        index: 1,
    });

    const passagesWithQuestions = await Promise.all(
        passages.map(async(passage)=> {
            const questions = await Question.find({
                passageId: passage._id,
            }).sort({orderIndex: 1});

            const questionWithChoice = await Promise.all(
                questions.map(async (q)=> {
                    const choice =
                     q.type === "multiple_choice"
                     ?await Choice.find({ questionId: q._id}).select(
                        "-isCorrect", //never expose correct answer to student
                     )
                     : [];
                    
                    return {
                        _id: q._id,
                        type: q.type,
                        text: q.text,
                        orderIndex: q.orderIndex,
                        choice,
                    };
                }),
            );
            return {
                _id: passage._id,
                index: passage.index,
                title: passage.title,
                body: passage.body,
                question: questionWithChoice,
            };
        }),
    );
    return { 
        attemptId: attempt._id,
        testId: attempt.testId,
        status: attempt.status,
        startedAt: attempt.startedAt,
        passageTimings: attempt.passageTimings,
        passages: passagesWithQuestions,
    };
};

//save a single answer
const saveAnswer = async (
    attemptId: string,
    userId: string,
    questionId: string,
    choiceId?: string,
    textAnswer?: string,
) => {
    const attempt = await Attempt.findOne({
        _id: new Types.ObjectId(attemptId),
        userId: new Types.ObjectId(userId),
        status: "in_progress",
    });
    if (!attempt) return null;
    
    //Upsert: one answer per question per attempt
    const answer = await UserAnswer.findOneAndUpdate(
        {
            attemptId: new Types.ObjectId(attemptId),
            questionId: new Types.ObjectId(questionId),
        },
        {
            choiceId: choiceId ? new Types.ObjectId(choiceId): null,
            textAnswer: textAnswer ?? null
        },
        { upsert: true, new: true},
    );
    return answer;
};