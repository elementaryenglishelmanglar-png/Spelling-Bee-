import { GoogleGenAI, Type } from "@google/genai";
import { WordEnrichmentResponse, GradeLevel } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export const enrichWordWithGemini = async (word: string, grade: GradeLevel): Promise<WordEnrichmentResponse> => {
  if (!apiKey) {
    throw new Error("API Key is missing");
  }

  const model = "gemini-3-flash-preview";
  
  const prompt = `
    Provide a clear definition and a simple example sentence for the spelling bee word: "${word}".
    The target audience is a Grade ${grade} student.
    Classify the difficulty of this word for a Grade ${grade} student.
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
            difficulty: {
              type: Type.STRING,
              enum: ["Easy", "Medium", "Hard"],
              description: "The estimated difficulty level for this grade.",
            },
          },
          required: ["definition", "example", "difficulty"],
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
      difficulty: "Medium",
    };
  }
};
