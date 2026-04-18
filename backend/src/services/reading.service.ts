import { Types } from "mongoose";
import { aiService } from "./ai.services";

import Passage from "@/models/Passage";
import Test from "@/models/Test";
import Question from "@/models/Question";
import Choice from "@/models/Choice";
import Attempt from "@/models/Attempt";
import UserAnswer  from "@/models/UserAnswer";


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

            const questionsWithChoices = await Promise.all(
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
                question: questionsWithChoices,
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

//update passage timing 
const updatePassageTiming = async (
    attemptId: string,
    userId: string,
    passageId: string,
    timeSpentSeconds: number,
) => {
    const attempt = await Attempt.findOne({
        _id: new Types.ObjectId(attemptId),
        userId: new Types.ObjectId(userId),
        status: "in_progress",
    });

    if (!attempt) return null; 

    const passage = await Passage.findById(passageId);
    if(!passage) return null;

    const existing = attempt.passageTimings.find(
        (t) => t.passageId.toString() ===passageId,
    );

    if (existing) { 
        existing.timeSpentSeconds = timeSpentSeconds;
    } else { 
        attempt.passageTimings.push({
            passageId: new Types.ObjectId(passageId) as any,
            passageIndex: passage.index,
            timeSpentSeconds,
        });
    }
    await attempt.save();
    return attempt.passageTimings;
};

//submit and auto score 
const submitAttempt = async (attemptId: string, userId: string) => {
    const attempt = await Attempt.findOne({
        _id: new Types.ObjectId(attemptId),
        userId: new Types.ObjectId(userId),
        status: "in_progress"
    });

    if (!attempt) return null;

    const answers = await UserAnswer.find({
        attemptId: new Types.ObjectId(attemptId),
    });
    
    let totalQuestion = 0;
    let correctCount = 0;

    //score each answer
    //currently we fetch per question for simplicity, but it can be optimized using batch queries
    for (const answer of answers) {
        const question = await Question.findById(answer.questionId);
        if (!question) continue;

        totalQuestion++;
        let isCorrect = false;

        if (question.type === "multiple_choice" && answer.choiceId){
            const choice = await Choice.findById(answer.choiceId);
            isCorrect = choice?.isCorrect ?? false;
        } else if (answer.textAnswer && question.correctAnswer){
            //case insensetive match for text answer
            isCorrect = 
            answer.textAnswer.trim().toLowerCase() ===
            question.correctAnswer.trim().toLowerCase();
        }

        answer.isCorrect = isCorrect;
        await answer.save();

        if (isCorrect) correctCount++; 
    }

    //IELTS raw score -> Band conversion (standard scale)
    const rawScore = totalQuestion > 0 ? (correctCount / totalQuestion) * 40 : 0;
    const band = convertRawScoreToBand(Math.round(rawScore)); 

    attempt.score = band;
    attempt.finishedAt = new Date();
    attempt.status = "submitted";
    await attempt.save();

    //build pre-passage breakdown 
    const passages = await Passage.find({ testId: attempt.testId }).sort({
        index: 1,
    });

    const passageBreakdown =  await Promise.all(
        passages.map(async (passage) => {
            const questions = await Question.find({ passageId: passage._id });
            const questionIds = questions.map((q) => q._id);
            
            const passageAnswers = await UserAnswer.find({
                attemptId: new Types.ObjectId(attemptId),
                questionId: { $in: questionIds },
            });

            const correct = passageAnswers.filter((a) => a.isCorrect).length;
            const total = passageAnswers.length;

            const timing = attempt.passageTimings.find(
                (t) => t.passageId.toString() === passage._id.toString(),
            );

            return {
                passageIndex: passage.index,
                title: passage.title,
                correct,
                total,
                timeSpentSeconds: timing?.timeSpentSeconds ?? 0,
            };
        }),
    );

    return { 
        attemptId: attempt._id,
        band,
        correctCount,
        totalQuestion,
        totalTimeSpentSeconds: attempt.finishedAt
        ? Math.round(
            (attempt.finishedAt.getTime() - attempt.startedAt.getTime()) / 1000,
            )
        :   0,
        passageBreakdown,
    };

}; 

//IELTS band conversion
//standerd IELTS reqding band scale (out of 40 questions) 

const convertRawScoreToBand = (raw: number): number => {
    if (raw >= 39) return 9;
    if (raw >= 37) return 8.5;
    if (raw >= 35) return 8;
    if (raw >= 33) return 7.5;
    if (raw >= 30) return 7;
    if (raw >= 27) return 6.5;
    if (raw >= 23) return 6;
    if (raw >= 19) return 5.5;
    if (raw >= 15) return 5;
    if (raw >= 13) return 4.5;
    if (raw >= 10) return 4;
    if (raw >= 8) return 3.5;
    if (raw >= 6) return 3;
    if (raw >= 4) return 2.5;
    return 2;
};

export const readingService = {
    startTest,
    getAttemptState,
    saveAnswer,
    updatePassageTiming,
    submitAttempt,
}