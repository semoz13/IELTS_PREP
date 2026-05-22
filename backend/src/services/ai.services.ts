// ─── AI Service ───────────────────────────────────────────────
// All stubs replaced with real HTTP calls to the unified Python FastAPI service.
// Base URL is controlled by AI_SERVICE_URL env var (default: http://localhost:8000).
// Nothing outside this file needs to change.

import {
  GeneratedReadingTest,
  GeneratedListeningTest,
  GeneratedWritingTest,
  AiWritingScore,
  GeneratedSpeakingTest,
} from "@/types/ai.types";

const AI_BASE = process.env.AI_SERVICE_URL ?? "http://localhost:8000";

// ── Shared fetch helper ─────────────────────────────────────────────────────
async function aiPost<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${AI_BASE}${path}`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`AI service error ${res.status} at ${path}: ${text}`);
  }
  return res.json() as Promise<T>;
}

// ── Reading ─────────────────────────────────────────────────────────────────
export const aiService = {

  generateReadingTest: async (
    section: "academic" | "general",
  ): Promise<GeneratedReadingTest> => {
    return aiPost<GeneratedReadingTest>("/reading/generate", { section });
  },

  // ── Listening ──────────────────────────────────────────────────────────────
  generateListeningTest: async (): Promise<GeneratedListeningTest> => {
    return aiPost<GeneratedListeningTest>("/listening/generate");
  },

  // ── Writing: generate prompts ──────────────────────────────────────────────
  generateWritingTest: async (
    section: "academic" | "general",
  ): Promise<GeneratedWritingTest & { task1RowId: number; task2RowId: number }> => {
    const raw = await aiPost<{
      title:   string;
      section: string;
      task1: {
        taskType: string;
        prompt: string;
        imageUrl: string | null;
        imageDescription: string | null;
        rowId: number;
        minWordCount: number;
        timeAllowedMinutes: number;
      };
      task2: {
        taskType: string;
        prompt: string;
        rowId: number;
        minWordCount: number;
        timeAllowedMinutes: number;
      };
    }>("/writing/generate", { section });

    return {
      title:      raw.title,
      section:    raw.section as "academic" | "general",
      task1: {
        taskType:            "task1",
        prompt:              raw.task1.prompt,
        imageDescription:    raw.task1.imageDescription ?? undefined,
        minWordCount:        raw.task1.minWordCount,
        timeAllowedMinutes:  raw.task1.timeAllowedMinutes,
      },
      task2: {
        taskType:            "task2",
        prompt:              raw.task2.prompt,
        minWordCount:        raw.task2.minWordCount,
        timeAllowedMinutes:  raw.task2.timeAllowedMinutes,
      },
      // Row IDs passed through so the writing service can store them
      task1RowId: raw.task1.rowId,
      task2RowId: raw.task2.rowId,
    };
  },

  // ── Writing: score a submission ────────────────────────────────────────────
  scoreWritingResponse: async (
    taskType: "task1" | "task2",
    _section: "academic" | "general",  // not needed by Roy's model
    _prompt: string,                   // not needed directly (retrieved via rowId)
    responseText: string,
    rowId: number,
  ): Promise<AiWritingScore> => {
    const raw = await aiPost<{
      band:           number;
      criteriaScores: {
        taskAchievement:   number;
        coherenceCohesion: number;
        lexicalResource:   number;
        grammaticalRange:  number;
      };
      feedback: string; // JSON string of Roy's nested feedback object
    }>("/writing/score", { taskType, rowId, essay: responseText });

    return {
      band:           raw.band,
      criteriaScores: raw.criteriaScores,
      feedback:       raw.feedback,
    };
  },

  // ── Speaking: generate test ────────────────────────────────────────────────
  generateSpeakingTest: async (): Promise<GeneratedSpeakingTest> => {
    return aiPost<GeneratedSpeakingTest>("/speaking/generate");
  },
};
