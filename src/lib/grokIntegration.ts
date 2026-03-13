/**
 * Grok-4 Integration via X.ai API
 * OpenAI-compatible interface for advanced reasoning
 */

import { ChatOpenAI } from "@langchain/openai";

const GROK_API_KEY = process.env.GROK_API_KEY || "";
const GROK_BASE_URL = "https://api.x.ai/v1";

// Initialize Grok LLM with OpenAI-compatible interface
export const grokLLM = new ChatOpenAI({
  apiKey: GROK_API_KEY,
  configuration: {
    baseURL: GROK_BASE_URL,
  },
  model: "grok-4",
  temperature: 0.7,
  maxTokens: 1024,
  timeout: 10000, // 10s hard timeout per request
}) as any;

/**
 * Run simple prompts through Grok
 */
export async function runGrokPrompt(prompt: string): Promise<string> {
  try {
    const response = await grokLLM.invoke([
      {
        role: "user",
        content: prompt,
      },
    ]);

    const content = response.content;
    return typeof content === "string" ? content : String(content);
  } catch (error) {
    console.error("[Grok] API Error:", error);
    // Return fallback response if Grok fails
    return "Grok reasoning unavailable. Using default recommendations.";
  }
}

/**
 * Reasoning function for complex queries
 */
export async function grokReason(context: string, question: string): Promise<string> {
  const systemPrompt = `You are an expert travel consultant for Lina Point Resort in Belize.
Use the following context to provide personalized recommendations.
Context: ${context}

Answer concisely in 1-2 sentences max.`;

  try {
    const response = await grokLLM.invoke([
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: question,
      },
    ]);

    const content = response.content;
    return typeof content === "string" ? content : String(content);
  } catch (error) {
    console.error("[Grok] Reasoning error:", error);
    return "Unable to generate recommendation at this time.";
  }
}
