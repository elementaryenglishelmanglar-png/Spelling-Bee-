import { GoogleGenAI, Type } from "@google/genai";
import { WordEnrichmentResponse, GradeLevel } from "../types";

// Vite environment variable (defined as VITE_GEMINI_API_KEY in .env.local)
const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;

// Only create the client if we actually have a key, to avoid runtime crashes
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export const enrichWordWithGemini = async (word: string, grade: GradeLevel): Promise<WordEnrichmentResponse> => {
  if (!apiKey || !ai) {
    throw new Error("Gemini API key is missing. Set VITE_GEMINI_API_KEY in your .env.local file.");
  }

  const model = "gemini-3-flash-preview";

  const prompt = `
    Provide a clear definition and a simple example sentence for the spelling bee word: "${word}".
    The target audience is a Grade ${grade} student.
    Classify the Part of Speech of this word (noun, verb, adjective, adverb, preposition, conjunction).
    Also provide a short 1-3 word "theme" for this word (e.g., "Science", "Daily Life", "Animals", "Emotions").
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            definition: {
              type: Type.STRING,
              description: "A concise definition of the word suitable for the specific grade level.",
            },
            example: {
              type: Type.STRING,
              description: "A sentence using the word in context. Do not explicitly say 'Example:'. Just the sentence.",
            },
            partOfSpeech: {
              type: Type.STRING,
              enum: ["noun", "verb", "adjective", "adverb", "preposition", "conjunction"],
              description: "The syntactic part of speech of the word.",
            },
            theme: {
              type: Type.STRING,
              description: "A short 1-3 word topic or category this word belongs to (e.g., Animals, Technology).",
            },
          },
          required: ["definition", "example", "partOfSpeech", "theme"],
        },
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("No response from AI");
    }

    return JSON.parse(text) as WordEnrichmentResponse;
  } catch (error) {
    console.error("Error enriching word:", error);
    // Fallback if AI fails
    return {
      definition: "Definition unavailable.",
      example: `Please spell ${word}.`,
      partOfSpeech: "noun",
      theme: "General",
    };
  }
};
