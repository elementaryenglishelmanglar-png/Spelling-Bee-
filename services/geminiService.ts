import { GoogleGenAI, Type } from "@google/genai";
import { WordEnrichmentResponse, GradeLevel } from "../types";

// ─── API Keys ────────────────────────────────────────────────────────────────
const geminiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
const openrouterKey = import.meta.env.VITE_OPENROUTER_API_KEY as string | undefined;

const ai = geminiKey ? new GoogleGenAI({ apiKey: geminiKey }) : null;

// ─── Rate-limit error with server-provided retry delay ────────────────────────
export class RateLimitError extends Error {
  retryAfterMs: number;
  provider: "gemini" | "openrouter";
  constructor(provider: "gemini" | "openrouter", retryAfterMs: number, message?: string) {
    super(message ?? `${provider} rate-limited, retry after ${retryAfterMs}ms`);
    this.provider = provider;
    this.retryAfterMs = retryAfterMs;
  }
}

// Extract the Gemini-provided retryDelay (e.g. "44.45s") from error text
function parseGeminiRetryMs(err: unknown): number {
  const text = String(err instanceof Error ? err.message : err);
  const match = text.match(/"retryDelay"\s*:\s*"([\d.]+)s"/);
  if (match) return Math.ceil(parseFloat(match[1]) * 1000) + 5000; // +5s buffer
  return 60_000; // default 60s if not found
}

// ─── Shared prompt ────────────────────────────────────────────────────────────
function buildPrompt(word: string, grade: GradeLevel): string {
  const isPreK = grade === 12;
  const audienceDescription = isPreK
    ? "a Pre-K / Preschool child aged 4-5 years old"
    : `a Grade ${grade} student (approximately ${grade + 5} years old)`;

  return `You are an educational assistant creating spelling bee flashcards.
Word to define: "${word}"

CRITICAL REQUIREMENT:
The target audience is ${audienceDescription}.
You MUST write the definition and example sentence at EXACTLY the right level.
${isPreK
      ? `This is a VERY YOUNG CHILD (4-5 years old). Use the SIMPLEST words possible.
- Definition: 1 short sentence as if explaining to a toddler.
- Example: A very short sentence about toys, animals, food, or family.
- NEVER use complex vocabulary.`
      : `Adjust for Grade ${grade}:
- Grades 1-3: very simple, everyday objects.
- Grades 4-6: school-level vocabulary.
- Grades 7-9: academic vocabulary.
- Grades 10-12: mature academic contexts.`
    }

Respond ONLY with a valid JSON object — no markdown, no extra text:
{"definition":"...","example":"...","partOfSpeech":"noun|verb|adjective|adverb|preposition|conjunction","theme":"1-3 word topic"}`;
}

// ─── Extract JSON from a string (handles ```json fences) ─────────────────────
function extractJson(text: string): WordEnrichmentResponse {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON object found in response");
  return JSON.parse(match[0]) as WordEnrichmentResponse;
}

// ─── Gemini ───────────────────────────────────────────────────────────────────
async function callGemini(word: string, grade: GradeLevel): Promise<WordEnrichmentResponse> {
  if (!geminiKey || !ai) throw new Error("Gemini API key missing");

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
    // Re-throw as RateLimitError if it's a 429 so the caller can handle it
    const msg = String(err instanceof Error ? err.message : err);
    if (msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("quota")) {
      throw new RateLimitError("gemini", parseGeminiRetryMs(err), msg);
    }
    throw err;
  }
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
      model: "upstage/solar-pro-3:free",
      messages: [{ role: "user", content: buildPrompt(word, grade) }],
    }),
  });

  if (!res.ok) {
    const retryHeader = res.headers.get("Retry-After");
    const retryAfterMs = retryHeader ? (parseInt(retryHeader, 10) * 1000 + 5000) : 60_000;
    const body = await res.text().catch(() => "");
    if (res.status === 429) {
      throw new RateLimitError("openrouter", retryAfterMs, `OpenRouter 429: ${body}`);
    }
    throw new Error(`OpenRouter ${res.status}: ${body}`);
  }

  const json = await res.json();
  const content: string = json?.choices?.[0]?.message?.content ?? "";
  if (!content) throw new Error("Empty OpenRouter response");
  return extractJson(content);
}

// ─── Public API ───────────────────────────────────────────────────────────────
// Strategy:
//  1. Try Gemini
//  2. If Gemini rate-limits → immediately try OpenRouter
//  3. If OpenRouter also rate-limits → throw a RateLimitError with
//     retryAfterMs = max(geminiDelay, openrouterDelay)
//     so ExcelImport waits the right amount before the next round.
export const enrichWordWithGemini = async (
  word: string,
  grade: GradeLevel,
): Promise<WordEnrichmentResponse> => {

  let geminiRateLimit: RateLimitError | null = null;

  // ── Step 1: Gemini ──────────────────────────────────────────────────────────
  try {
    return await callGemini(word, grade);
  } catch (err) {
    if (err instanceof RateLimitError) {
      console.warn(`Gemini rate-limited (${err.retryAfterMs}ms). Trying OpenRouter…`);
      geminiRateLimit = err;
    } else {
      // Non-rate-limit Gemini error → still try OpenRouter as best-effort
      console.warn("Gemini error (non-rate-limit), trying OpenRouter:", err);
    }
  }

  // ── Step 2: OpenRouter fallback ─────────────────────────────────────────────
  try {
    return await callOpenRouter(word, grade);
  } catch (err) {
    if (err instanceof RateLimitError) {
      // Both rate-limited — propagate the longer wait time
      const combinedWait = Math.max(
        geminiRateLimit?.retryAfterMs ?? 60_000,
        err.retryAfterMs,
      );
      throw new RateLimitError("openrouter", combinedWait,
        `Both APIs rate-limited. Waiting ${Math.round(combinedWait / 1000)}s before retry.`);
    }
    throw err;
  }
};
