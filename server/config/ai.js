import { GoogleGenAI } from "@google/genai";

let aiInstance = null;

export const getAIClient = () => {
  if (!aiInstance) {
    aiInstance = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return aiInstance;
};
