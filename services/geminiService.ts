import { GoogleGenAI, Type } from "@google/genai";
import { WordEnrichmentResponse, GradeLevel } from "../types";

// ─── API Keys ────────────────────────────────────────────────────────────────
const geminiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
const openrouterKey = import.meta.env.VITE_OPENROUTER_API_KEY as string | undefined;

const ai = geminiKey ? new GoogleGenAI({ apiKey: geminiKey }) : null;

// ─── Shared prompt builder ────────────────────────────────────────────────────
function buildPrompt(word: string, grade: GradeLevel): string {
  const isPreK = grade === 12;
  const audienceDescription = isPreK
    ? "a Pre-K / Preschool child aged 4-5 years old"
    : `a Grade ${grade} student (approximately ${grade + 5} years old)`;

  return `
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

    Respond ONLY with a valid JSON object (no markdown, no extra text) with exactly these keys:
    {
      "definition": "...",
      "example": "...",
      "partOfSpeech": "noun|verb|adjective|adverb|preposition|conjunction",
      "theme": "1-3 word topic"
    }
  `;
}

// ─── Gemini ───────────────────────────────────────────────────────────────────
async function callGemini(word: string, grade: GradeLevel): Promise<WordEnrichmentResponse> {
  if (!geminiKey || !ai) throw new Error("Gemini API key missing");

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: buildPrompt(word, grade),
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          definition: { type: Type.STRING, description: "A concise definition suitable for the grade level." },
          example: { type: Type.STRING, description: "A sentence using the word in context. Just the sentence, no prefix." },
          partOfSpeech: {
            type: Type.STRING,
            enum: ["noun", "verb", "adjective", "adverb", "preposition", "conjunction"],
            description: "The syntactic part of speech.",
          },
          theme: { type: Type.STRING, description: "A short 1-3 word topic or category (e.g., Animals, Technology)." },
        },
        required: ["definition", "example", "partOfSpeech", "theme"],
      },
    },
  });

  const text = response.text;
  if (!text) throw new Error("No response from Gemini");
  return JSON.parse(text) as WordEnrichmentResponse;
}

// ─── OpenRouter (Solar Pro 3 – free) ─────────────────────────────────────────
async function callOpenRouter(word: string, grade: GradeLevel): Promise<WordEnrichmentResponse> {
  if (!openrouterKey) throw new Error("OpenRouter API key missing");

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${openrouterKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://spelling-bee-beryl.vercel.app/",
      "X-Title": "Spelling Bee Manager",
    },
    body: JSON.stringify({
      model: "upstage/solar-pro-3:free",   // ✅ correct OpenRouter model ID
      messages: [{ role: "user", content: buildPrompt(word, grade) }],
      // NOTE: Solar Pro 3 does not support response_format, so we rely on prompt instructions
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`OpenRouter ${res.status}: ${body}`);
  }

  const json = await res.json();
  const content: string = json?.choices?.[0]?.message?.content ?? "";
  if (!content) throw new Error("No response from OpenRouter");

  // Extract JSON — some models wrap it in ```json ... ``` fences
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("OpenRouter response did not contain valid JSON");

  return JSON.parse(jsonMatch[0]) as WordEnrichmentResponse;
}

// ─── Public API: Gemini first, OpenRouter as fallback ────────────────────────
export const enrichWordWithGemini = async (
  word: string,
  grade: GradeLevel,
  provider: "gemini" | "openrouter" | "any" = "any",
): Promise<WordEnrichmentResponse> => {
  if (provider === "openrouter") return callOpenRouter(word, grade);
  if (provider === "gemini") return callGemini(word, grade);

  // "any" → try Gemini, on any error immediately fall back to OpenRouter
  try {
    return await callGemini(word, grade);
  } catch (geminiErr) {
    console.warn("Gemini failed, falling back to OpenRouter:", geminiErr);
    return await callOpenRouter(word, grade);
  }
};
