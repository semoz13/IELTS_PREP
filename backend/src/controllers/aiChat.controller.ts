import { Request, Response } from 'express';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

// Define the expected response from your AI FastAPI service
interface AIResponse {
  intent: 'faq' | 'frequent' | 'uncertain';
  confidence: number;
  response: string;
}

export const chatWithAI = async (req: Request, res: Response) => {
  try {
    const userMessage = req.body.message;

    if (!userMessage || typeof userMessage !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid "message" field' });
    }

    const aiResponse = await fetch(`${AI_SERVICE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: userMessage,
        top_k_faq: 5,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI service error:', aiResponse.status, errorText);
      return res.status(502).json({ error: 'AI service responded with an error' });
    }

    // ✅ Type assertion – we know the shape from the AI tool's spec
    const aiData = (await aiResponse.json()) as AIResponse;

    // Optional: validate that required fields exist
    if (!aiData.response || typeof aiData.response !== 'string') {
      console.error('Invalid AI response structure:', aiData);
      return res.status(502).json({ error: 'AI service returned unexpected data' });
    }

    res.json({
      reply: aiData.response,
      intent: aiData.intent,
      confidence: aiData.confidence,
    });
  } catch (error) {
    console.error('Failed to reach AI service:', error);
    res.status(503).json({ error: 'AI service is unavailable' });
  }
};

export const checkAIHealth = async (_req: Request, res: Response) => {
  try {
    const healthRes = await fetch(`${AI_SERVICE_URL}/health`);
    const healthData = await healthRes.json();
    res.json(healthData);
  } catch (error) {
    res.status(503).json({ status: 'unavailable', error: 'Cannot reach AI service' });
  }
};