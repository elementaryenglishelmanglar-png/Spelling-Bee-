import { GoogleGenAI, Type } from "@google/genai";
import { WordEnrichmentResponse, GradeLevel } from "../types";

// ─── API Keys ────────────────────────────────────────────────────────────────
const geminiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
const openrouterKey = import.meta.env.VITE_OPENROUTER_API_KEY as string | undefined;

const ai = geminiKey ? new GoogleGenAI({ apiKey: geminiKey }) : null;

// ─── Rate-limit error (carries server-provided retry delay) ──────────────────
export class RateLimitError extends Error {
  retryAfterMs: number;
  constructor(retryAfterMs: number, message?: string) {
    super(message ?? `Rate-limited, retry after ${retryAfterMs}ms`);
    this.retryAfterMs = retryAfterMs;
  }
}

// ─── Pool of free OpenRouter models (tried in order on rate-limit) ───────────
// Each has an independent rate-limit quota, so spreading requests across them
// avoids 429s on any single model.
const OPENROUTER_MODELS = [
  "upstage/solar-pro-3:free",
  "google/gemini-2.0-flash-exp:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "deepseek/deepseek-chat-v3-0324:free",
  "mistralai/mistral-7b-instruct:free",
] as const;

// ─── Prompt builder ───────────────────────────────────────────────────────────
function buildPrompt(word: string, grade: GradeLevel): string {
  const isPreK = grade === 12;
  const audience = isPreK
    ? "a Pre-K / Preschool child aged 4-5 years old"
    : `a Grade ${grade} student (approximately ${grade + 5} years old)`;

  return `You are an educational assistant creating spelling bee flashcards.
Word to define: "${word}"

The target audience is ${audience}.
${isPreK
      ? `Use the SIMPLEST words possible (4-5 year old level). One short sentence definition,
one simple example sentence about toys, animals, food, or family.`
      : `Adjust complexity for Grade ${grade}:
Grades 1-3: simple everyday words. Grades 4-6: school-level. Grades 7-9: academic. Grades 10-12: advanced.`}

Respond ONLY with valid JSON, no markdown fences:
{"definition":"...","example":"...","partOfSpeech":"noun|verb|adjective|adverb|preposition|conjunction","theme":"1-3 word topic"}`;
}

// ─── JSON extractor (handles ```json fences that some models add) ─────────────
function extractJson(text: string): WordEnrichmentResponse {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error(`No JSON in response: ${text.slice(0, 200)}`);
  return JSON.parse(m[0]) as WordEnrichmentResponse;
}

// ─── Gemini call ──────────────────────────────────────────────────────────────
async function callGemini(word: string, grade: GradeLevel): Promise<WordEnrichmentResponse> {
  if (!geminiKey || !ai) throw new RateLimitError(0, "Gemini API key missing");

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: buildPrompt(word, grade),
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            definition: { type: Type.STRING },
            example: { type: Type.STRING },
            partOfSpeech: { type: Type.STRING, enum: ["noun", "verb", "adjective", "adverb", "preposition", "conjunction"] },
            theme: { type: Type.STRING },
          },
          required: ["definition", "example", "partOfSpeech", "theme"],
        },
      },
    });
    const text = response.text;
    if (!text) throw new Error("Empty Gemini response");
    return JSON.parse(text) as WordEnrichmentResponse;
  } catch (err) {
    const msg = String(err instanceof Error ? err.message : err);
    if (msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("quota")) {
      // Parse server-suggested retry delay e.g. "retryDelay":"44.45s"
      const delayMatch = msg.match(/"retryDelay"\s*:\s*"([\d.]+)s"/);
      const delayMs = delayMatch ? Math.ceil(parseFloat(delayMatch[1]) * 1000) + 3000 : 60_000;
      throw new RateLimitError(delayMs, `Gemini 429 (wait ${Math.round(delayMs / 1000)}s)`);
    }
    throw err;
  }
}

// ─── Single OpenRouter model call ─────────────────────────────────────────────
async function callOpenRouterModel(
  model: string,
  word: string,
  grade: GradeLevel,
): Promise<WordEnrichmentResponse> {
  if (!openrouterKey) throw new Error("OpenRouter API key missing");

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openrouterKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://spelling-bee-beryl.vercel.app/",
      "X-Title": "Spelling Bee Manager",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: buildPrompt(word, grade) }],
    }),
  });

  if (!res.ok) {
    const retryHeader = res.headers.get("Retry-After");
    const retryMs = retryHeader ? parseInt(retryHeader, 10) * 1000 + 3000 : 30_000;
    const body = await res.text().catch(() => "");
    if (res.status === 429) throw new RateLimitError(retryMs, `${model} 429`);
    throw new Error(`${model} ${res.status}: ${body}`);
  }

  const json = await res.json();
  const content: string = json?.choices?.[0]?.message?.content ?? "";
  if (!content) throw new Error(`Empty response from ${model}`);
  return extractJson(content);
}

// ─── Public enrichment function ───────────────────────────────────────────────
// Strategy: Gemini first → cycle through OpenRouter model pool on rate-limit.
// Only throws if EVERY model in the pool is rate-limited; returns the max
// wait time so ExcelImport can sleep exactly the right amount.
export const enrichWordWithGemini = async (
  word: string,
  grade: GradeLevel,
): Promise<WordEnrichmentResponse> => {

  let maxWaitMs = 0;

  // 1. Try Gemini
  try {
    return await callGemini(word, grade);
  } catch (err) {
    if (err instanceof RateLimitError) {
      console.warn(`[Gemini] rate-limited (${err.retryAfterMs}ms). Trying OpenRouter pool…`);
      maxWaitMs = Math.max(maxWaitMs, err.retryAfterMs);
    } else {
      console.warn(`[Gemini] error, trying OpenRouter pool:`, err);
    }
  }

  // 2. Try each OpenRouter model in order
  for (const model of OPENROUTER_MODELS) {
    try {
      console.log(`[OpenRouter] Trying ${model}…`);
      return await callOpenRouterModel(model, word, grade);
    } catch (err) {
      if (err instanceof RateLimitError) {
        console.warn(`[OpenRouter] ${model} rate-limited (${err.retryAfterMs}ms). Next model…`);
        maxWaitMs = Math.max(maxWaitMs, err.retryAfterMs);
      } else {
        console.warn(`[OpenRouter] ${model} error, trying next:`, err);
        // Non-rate-limit error — still try next model
      }
    }
  }

  // All models exhausted — tell ExcelImport how long to wait before next round
  throw new RateLimitError(
    maxWaitMs || 60_000,
    `All AI models rate-limited. Will retry after ${Math.round((maxWaitMs || 60_000) / 1000)}s.`,
  );
};
