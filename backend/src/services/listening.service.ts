import { Types } from "mongoose";

import Test                 from "@/models/Test";
import ListeningSection     from "@/models/ListeningSection";
import ListeningPlayRecord  from "@/models/ListeningPlayRecord";
import Question             from "@/models/Question";
import Choice               from "@/models/Choice";
import Attempt              from "@/models/Attempt";
import UserAnswer           from "@/models/UserAnswer";
import { aiService }        from "@/services/ai.services";

// ─── Step 1 (Student): Start a listening test ────────────────
// AI generates the full test — audio URLs + questions for all 4 sections.
// Everything is created and persisted here before the student sees anything.
const startTest = async (
  userId: string,
): Promise<{ attemptId: string; testId: string }> => {
  // 1. Ask AI for the full test content
  const generated = await aiService.generateListeningTest();

  // 2. Persist the test shell
  const test = await Test.create({
    title: generated.title,
    type: "listening",
    section: "academic",
    duration: 40,                              // IELTS listening = 40 minutes
    createdBy: new Types.ObjectId(userId),
    isAiGenerated: true,
  });

  // 3. Persist each section + its questions + choices
  for (const s of generated.sections) {
    const section = await ListeningSection.create({
      testId: test._id,
      sectionNumber: s.sectionNumber,
      audioUrl: s.audioUrl,                    // provided by AI
      maxPlays: 2,
    });

    for (const q of s.questions) {
      const question = await Question.create({
        testId: test._id,
        sectionId: section._id,
        passageId: null,
        type: q.type,
        text: q.text,
        correctAnswer: q.correctAnswer ?? null,
        orderIndex: q.orderIndex,
      });

      if (q.choices && q.choices.length > 0) {
        await Choice.insertMany(
          q.choices.map((c: { text: string; isCorrect: boolean }) => ({
            questionId: question._id,
            text: c.text,
            isCorrect: c.isCorrect,
          })),
        );
      }
    }
  }

  // 4. Open the attempt
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

// ─── Step 2 (Student): Get sections + questions ───────────────
// Returns audio URL and play status per section.
// Correct answers are never included in this response.
const getAttemptState = async (attemptId: string, userId: string) => {
  const attempt = await Attempt.findOne({
    _id: new Types.ObjectId(attemptId),
    userId: new Types.ObjectId(userId),
  });

  if (!attempt) return null;

  const sections = await ListeningSection.find({
    testId: attempt.testId,
  }).sort({ sectionNumber: 1 });

  const sectionsWithData = await Promise.all(
    sections.map(async (section) => {
      const playRecord = await ListeningPlayRecord.findOne({
        attemptId: new Types.ObjectId(attemptId),
        sectionId: section._id,
      });

      const questions = await Question.find({
        sectionId: section._id,
      }).sort({ orderIndex: 1 });

      const questionsWithChoices = await Promise.all(
        questions.map(async (q) => {
          const choices =
            q.type === "multiple_choice"
              ? await Choice.find({ questionId: q._id }).select("-isCorrect")
              : [];

          return {
            _id: q._id,
            type: q.type,
            text: q.text,
            orderIndex: q.orderIndex,
            choices,
          };
        }),
      );

      return {
        _id: section._id,
        sectionNumber: section.sectionNumber,
        audioUrl: section.audioUrl,
        maxPlays: section.maxPlays,
        playsUsed: playRecord?.playCount ?? 0,
        canPlay: (playRecord?.playCount ?? 0) < section.maxPlays,
        questions: questionsWithChoices,
      };
    }),
  );

  return {
    attemptId: attempt._id,
    testId: attempt.testId,
    status: attempt.status,
    startedAt: attempt.startedAt,
    sections: sectionsWithData,
  };
};

// ─── Step 3 (Student): Register an audio play ────────────────
// Called every time the student presses play on a section.
// The $lt guard makes the cap atomic — the DB enforces it, not just JS.
const registerPlay = async (
  attemptId: string,
  userId: string,
  sectionId: string,
): Promise<{ playsUsed: number; maxPlays: number; canPlay: boolean }> => {
  const attempt = await Attempt.findOne({
    _id: new Types.ObjectId(attemptId),
    userId: new Types.ObjectId(userId),
    status: "in_progress",
  });

  if (!attempt) return Promise.reject(new Error("Attempt not found or already submitted"));

  const section = await ListeningSection.findById(sectionId);
  if (!section) return Promise.reject(new Error("Section not found"));

  const record = await ListeningPlayRecord.findOneAndUpdate(
    {
      attemptId: new Types.ObjectId(attemptId),
      sectionId: new Types.ObjectId(sectionId),
      playCount: { $lt: section.maxPlays },    // atomic cap — never exceeds maxPlays
    },
    { $inc: { playCount: 1 } },
    { upsert: true, new: true },
  );

  if (!record) {
    return Promise.reject(
      new Error(
        `Play limit reached — this section can only be played ${section.maxPlays} times`,
      ),
    );
  }

  return {
    playsUsed: record.playCount,
    maxPlays: section.maxPlays,
    canPlay: record.playCount < section.maxPlays,
  };
};

// ─── Step 4 (Student): Save or overwrite a single answer ─────
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

  const answer = await UserAnswer.findOneAndUpdate(
    {
      attemptId: new Types.ObjectId(attemptId),
      questionId: new Types.ObjectId(questionId),
    },
    {
      choiceId: choiceId ? new Types.ObjectId(choiceId) : null,
      textAnswer: textAnswer ?? null,
    },
    { upsert: true, new: true },
  );

  return answer;
};

// ─── Step 5 (Student): Submit and auto-score ─────────────────
const submitAttempt = async (attemptId: string, userId: string) => {
  const attempt = await Attempt.findOne({
    _id: new Types.ObjectId(attemptId),
    userId: new Types.ObjectId(userId),
    status: "in_progress",
  });

  if (!attempt) return null;

  const answers = await UserAnswer.find({
    attemptId: new Types.ObjectId(attemptId),
  });

  let totalQuestions = 0;
  let correctCount = 0;

  for (const answer of answers) {
    const question = await Question.findById(answer.questionId);
    if (!question) continue;

    totalQuestions++;
    let isCorrect = false;

    if (question.type === "multiple_choice" && answer.choiceId) {
      const choice = await Choice.findById(answer.choiceId);
      isCorrect = choice?.isCorrect ?? false;
    } else if (answer.textAnswer && question.correctAnswer) {
      isCorrect =
        answer.textAnswer.trim().toLowerCase() ===
        question.correctAnswer.trim().toLowerCase();
    }

    answer.isCorrect = isCorrect;
    await answer.save();

    if (isCorrect) correctCount++;
  }

  const rawScore =
    totalQuestions > 0 ? (correctCount / totalQuestions) * 40 : 0;
  const band = mapRawScoreToBand(Math.round(rawScore));

  attempt.score = band;
  attempt.finishedAt = new Date();
  attempt.status = "submitted";
  await attempt.save();

  // Per-section breakdown for the results screen
  const sections = await ListeningSection.find({
    testId: attempt.testId,
  }).sort({ sectionNumber: 1 });

  const sectionBreakdown = await Promise.all(
    sections.map(async (section) => {
      const questions = await Question.find({ sectionId: section._id });
      const questionIds = questions.map((q) => q._id);

      const sectionAnswers = await UserAnswer.find({
        attemptId: new Types.ObjectId(attemptId),
        questionId: { $in: questionIds },
      });

      const playRecord = await ListeningPlayRecord.findOne({
        attemptId: new Types.ObjectId(attemptId),
        sectionId: section._id,
      });

      return {
        sectionNumber: section.sectionNumber,
        correct: sectionAnswers.filter((a) => a.isCorrect).length,
        total: sectionAnswers.length,
        playsUsed: playRecord?.playCount ?? 0,
      };
    }),
  );

  const totalSeconds =
    attempt.finishedAt && attempt.startedAt
      ? Math.round(
          (attempt.finishedAt.getTime() - attempt.startedAt.getTime()) / 1000,
        )
      : 0;

  return {
    attemptId: attempt._id,
    band,
    correctCount,
    totalQuestions,
    totalSeconds,
    sectionBreakdown,
  };
};

// ─── IELTS Listening band scale (out of 40 raw questions) ─────
const mapRawScoreToBand = (raw: number): number => {
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
  if (raw >= 8)  return 3.5;
  if (raw >= 6)  return 3;
  if (raw >= 4)  return 2.5;
  return 2;
};

export const listeningService = {
  startTest,
  getAttemptState,
  registerPlay,
  saveAnswer,
  submitAttempt,
};
