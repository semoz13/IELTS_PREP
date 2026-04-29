// ─── AI Service ───────────────────────────────────────────────
// This is a stub. Replace the body of each function with
// real API calls once you decide on OpenAI / Claude / etc.
// Nothing outside this file needs to change.

import { GeneratedReadingTest } from "@/types/ai.types";



// ─── Stub ─────────────────────────────────────────────────────
export const aiService = {
  generateReadingTest: async (
    section: "academic" | "general",
  ): Promise<GeneratedReadingTest> => {
    // TODO: replace with real AI call
    // Example for OpenAI:
    //const response = await openai.chat.completions.create({ ... })
    // Example for Claude:
    //const response = await anthropic.messages.create({ ... })
    
    return {
      title: `IELTS ${section} Reading Practice Test`,
      section,
      passages: [
        {
          index: 1,
          title: "Stub Passage 1",
          body: "This is a placeholder passage body. Replace with real AI generation.",
          questions: [
            {
              type: "multiple_choice",
              text: "What is the main idea of the passage?",
              orderIndex: 1,
              choices: [
                { text: "Option A", isCorrect: true },
                { text: "Option B", isCorrect: false },
                { text: "Option C", isCorrect: false },
                { text: "Option D", isCorrect: false },
              ],
            },
            {
              type: "true_false_not_given",
              text: "The passage discusses environmental issues.",
              correctAnswer: "TRUE",
              orderIndex: 2,
            },
            {
              type: "fill_blank",
              text: "The author argues that ______ is essential.",
              correctAnswer: "education",
              orderIndex: 3,
            },
          ],
        },
      ],
    };
  },
};