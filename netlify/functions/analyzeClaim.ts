import type { Handler } from "@netlify/functions";
import OpenAI from "openai";
import { SOURCES } from "../../src/lib/sources.js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// simple in-memory rate limit (OK for MVP)
const RATE_LIMIT = 3;
const WINDOW_MS = 60 * 60 * 1000;
const ipHits: Record<string, { count: number; start: number }> = {};

function isRateLimited(ip: string) {
  const now = Date.now();
  const record = ipHits[ip];

  if (!record) {
    ipHits[ip] = { count: 1, start: now };
    return false;
  }

  if (now - record.start > WINDOW_MS) {
    ipHits[ip] = { count: 1, start: now };
    return false;
  }

  record.count++;
  return record.count > RATE_LIMIT;
}

export const handler: Handler = async (event) => {
  const ip =
    event.headers["x-forwarded-for"] ||
    event.headers["client-ip"] ||
    "unknown";

  if (isRateLimited(ip)) {
    return {
      statusCode: 429,
      body: JSON.stringify({ error: "Rate limit exceeded" }),
    };
  }

  const body = JSON.parse(event.body || "{}");
  const claim = body.claim?.trim();

  if (!claim || claim.length < 10) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Invalid claim" }),
    };
  }

  const formattedSources = SOURCES.map(
    (s) =>
      `- ${s.title} (${s.publisher}, ${s.year}) [Tier ${s.tier}] ${s.url}`
  ).join("\n");

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    messages: [
      {
        role: "system",
        content: `
You are an evidence-based fact-checking assistant.

Rules:
- Use ONLY the provided sources
- Do NOT add outside knowledge
- Do NOT speculate
- Cite every factual claim
- If evidence is insufficient, say so
- Use neutral academic language
- Output ONLY valid JSON
        `,
      },
      {
        role: "user",
        content: `
Claim:
"${claim}"

Sources:
${formattedSources}

Return JSON:
{
  "verdict": "Supported | Mixed | Unsupported | Insufficient Evidence",
  "summary": ["...", "..."],
  "sources": [
    { "title": "", "publisher": "", "year": "", "url": "" }
  ]
}
        `,
      },
    ],
  });

  const result = response.choices[0].message.content;

  return {
    statusCode: 200,
    body: result || "{}",
  };
};
