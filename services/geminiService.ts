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

  const model = "gemini-2.5-flash";

  // Grade 12 is used internally for "Group 3" which is Pre-K / Preschool (ages 4-5)
  const isPreK = grade === 12;
  const audienceDescription = isPreK
    ? "a Pre-K / Preschool child aged 4-5 years old"
    : `a Grade ${grade} student (approximately ${grade + 5} years old)`;

  const prompt = `
    You are an educational assistant creating spelling bee flashcards.
    Word to define: "${word}"

    CRITICAL REQUIREMENT:
    The target audience is ${audienceDescription}.
    You MUST write the definition and example sentence at EXACTLY the right level for this audience.
    ${isPreK
      ? `This is a VERY YOUNG CHILD (preschool/pre-K, 4-5 years old). Use the SIMPLEST possible words.
    - Definition: 1 short sentence, as if explaining to a toddler. Use words like "big", "happy", "eat", "run".
    - Example: Another very short, simple sentence about something a preschooler experiences (toys, animals, mommy, daddy, food, school).
    - NEVER use complex vocabulary or abstract concepts.`
      : `Adjust complexity for Grade ${grade}:
    - Grades 1-3: very simple words, short sentences, everyday objects (toys, pets, school).
    - Grades 4-6: slightly more complex, school-level vocabulary.
    - Grades 7-9: academic vocabulary, real-world contexts.
    - Grades 10-12: mature academic or professional vocabulary.`
    }

    Tasks:
    1. Provide a clear definition.
    2. Provide a single example sentence using the word in context.
    3. Classify the Part of Speech (noun, verb, adjective, adverb, preposition, conjunction).
    4. Provide a short 1-3 word "theme" (e.g., "Science", "Daily Life", "Animals", "Emotions").
  `;

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
};
