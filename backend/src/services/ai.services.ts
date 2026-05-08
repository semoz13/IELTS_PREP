// ─── AI Service ───────────────────────────────────────────────
// This is a stub. Replace the body of each function with
// real API calls once you decide on OpenAI / Claude / etc.
// Nothing outside this file needs to change.

import {
  GeneratedReadingTest,
  GeneratedListeningTest,
  GeneratedWritingTest,
  AiWritingScore,
  GeneratedSpeakingTest,
} from "@/types/ai.types";

// ─── Stub ─────────────────────────────────────────────────────
export const aiService = {
  //reading
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

  //listening
  generateListeningTest: async (): Promise<GeneratedListeningTest> => {
    // TODO: replace with real AI call
    // The real implementation will call a TTS or audio-gen service
    // and return actual hosted audio URLs alongside the questions.
    const sections = Array.from({ length: 4 }, (_, i) => ({
      sectionNumber: i + 1,
      // Stub audio URL — replace with real AI-generated or TTS audio path
      audioUrl: `/uploads/audio/stub-section-${i + 1}.mp3`,
      questions: [
        {
          type: "multiple_choice" as const,
          text: `section ${i + 1} — what is the speakers's main point?`,
          orderIndex: 1,
          choices: [
            { text: "Option A", isCorrect: true },
            { text: "Option B", isCorrect: false },
            { text: "Option C", isCorrect: false },
            { text: "Option D", isCorrect: false },
          ],
        },
        {
          type: "fill_blank" as const,
          text: "The meeting is scheduled for ______.",
          correctAnswer: "Monday",
          orderIndex: 2,
        },
        {
          type: "complete_table" as const,
          text: "complete the table: Name: John, Age: ____",
          correctAnswer: "32",
          orderIndex: 3,
        },
      ],
    }));

    return {
      title: "IELTS Listening Practice Test",
      sections,
    };
  },

  //writing: generate prompts
  generateWritingTest: async (
    section: "academic" | "general",
  ): Promise<GeneratedWritingTest> => {
    //to replace with real ai call
    const task1: GeneratedWritingTest["task1"] =
      section === "academic"
        ? {
            taskType: "task1",
            prompt:
              "the chart below show the percentage of households with access in five countries between 2010 and 2020. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.",
            imageDescription:
              "A bar chart comparing internet access rates across five countries (USA, UK, Germany, Brazil, India)",
            minWordCount: 150,
            timeAllowedMinutes: 20,
          }
        : {
            taskType: "task1",
            prompt:
              "You recently stayed at a hotel and found the service unsatisfactory. Write a letter to the hotel manager",
            minWordCount: 150,
            timeAllowedMinutes: 20,
          };
    return {
      title: `IELTS ${section} Writing Practice Test`,
      section,
      task1,
      task2: {
        taskType: "task2",
        prompt:
          "Some people believe that universities should focus on providing academic knowledge, while others think they should better prepare students for the job market. Discuss both views and give your own opinion.",
        minWordCount: 250,
        timeAllowedMinutes: 40,
      },
    };
  },

  //writing: score the submission
  scoreWritingResponse: async (
    taskType: "task1" | "task2",
    section: "academic" | "general",
    prompt: string,
    responseText: string,
  ): Promise<AiWritingScore> => {
    // TODO: replace with real AI call
    return {
      band: 6.0,
      criteriaScores: {
        taskAchievement: 6,
        coherenceCohesion: 6,
        lexicalResource: 6,
        grammaticalRange: 6,
      },
      feedback:
        "Stub feedback — replace with real AI analysis. Your response addresses the task, but could benefit from more specific examples and varied vocabulary.",
    };
  },

  // speaking: generate questions (flexible count per part, AI decides)
  generateSpeakingTest: async (): Promise<GeneratedSpeakingTest> => {
 // TODO: replace with real AI call (Claude / GPT-4o / etc.)
    // The AI should return questions for all 3 parts with
    // appropriate preparationTimeSeconds and answerTimeSeconds
    return {
      title: "IELTS Speaking Practice Test",
      questions: [
        // Part 1 — personal questions (0 s prep, 60 s answer)
        {
          partNumber: 1,
          orderIndex: 1,
          preparationTimeSeconds: 0,
          answerTimeSeconds: 60,
          prompt:
            "Can you describe the area where you grew up? What do you like most about it?",
        },
        {
          partNumber: 1,
          orderIndex: 2,
          preparationTimeSeconds: 0,
          answerTimeSeconds: 60,
          prompt:
            "How do you usually spend your weekends? Has this changed over the years?",
        },
        {
          partNumber: 1,
          orderIndex: 3,
          preparationTimeSeconds: 0,
          answerTimeSeconds: 60,
          prompt:
            "Do you enjoy reading? What kinds of books or articles do you prefer?",
        },
        // Part 2 — cue card long turn (60 s prep, 120 s answer)
        {
          partNumber: 2,
          orderIndex: 1,
          preparationTimeSeconds: 60,
          answerTimeSeconds: 120,
          prompt:
            "Describe a place in the countryside that you have visited.\n" +
            "You should say:\n" +
            "• where it is\n" +
            "• when you went there\n" +
            "• what you did there\n" +
            "and explain why you enjoyed the visit.",
        },
        // Part 3 — abstract discussion (0 s prep, 120 s answer)
        {
          partNumber: 3,
          orderIndex: 1,
          preparationTimeSeconds: 0,
          answerTimeSeconds: 120,
          prompt:
            "Do you think people in your country are moving away from rural areas toward cities? Why?",
        },
        {
          partNumber: 3,
          orderIndex: 2,
          preparationTimeSeconds: 0,
          answerTimeSeconds: 120,
          prompt:
            "What are the advantages and disadvantages of living in the countryside compared to urban areas?",
        },
        {
          partNumber: 3,
          orderIndex: 3,
          preparationTimeSeconds: 0,
          answerTimeSeconds: 120,
          prompt:
            "How does tourism affect small rural communities? Do the benefits outweigh the drawbacks?",
        },
      ],
    };
  },
};


  
