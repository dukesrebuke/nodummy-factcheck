import { GoogleGenerativeAI } from "@google/generative-ai";
import { SOURCES } from "../../src/lib/sources.js";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Simple in-memory rate limit (OK for MVP)
const RATE_LIMIT = 10;
const WINDOW_MS = 60 * 60 * 1000;
const ipHits = {};

function isRateLimited(ip) {
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

export async function handler(event) {
  // CORS headers for all responses
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  const ip =
    event.headers["x-forwarded-for"] ||
    event.headers["client-ip"] ||
    "unknown";

  if (isRateLimited(ip)) {
    return {
      statusCode: 429,
      headers,
      body: JSON.stringify({ error: "Rate limit exceeded. Please try again in an hour." }),
    };
  }

  const body = JSON.parse(event.body || "{}");
  const claim = body.claim?.trim();

  if (!claim || claim.length < 10) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "Claim must be at least 10 characters long" }),
    };
  }

  // Format sources with enhanced detail
  const formattedSources = SOURCES.map((s) => {
    let sourceText = `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📚 ${s.title}\n`;
    sourceText += `   Publisher: ${s.publisher} (${s.year}) [Tier ${s.tier}]\n`;
    sourceText += `   URL: ${s.url}\n`;
    sourceText += `   Category: ${s.category}\n`;
    
    if (s.keyFacts && s.keyFacts.length > 0) {
      sourceText += `\n   📊 KEY DATA POINTS:\n`;
      s.keyFacts.forEach((fact, idx) => {
        sourceText += `      ${idx + 1}. ${fact}\n`;
      });
    }
    return sourceText;
  }).join("\n");

  const prompt = `You are an elite fact-checker with expertise in research methodology and data analysis. Your mission is to provide thorough, evidence-based fact-checks that educate users about the truth.

CORE PRINCIPLES:
• Use ONLY the provided authoritative sources
• Cite specific data, statistics, and facts from the KEY DATA POINTS
• Compare claims against actual numbers - if claim says "20%", state the real number
• Explain discrepancies clearly with context
• Be precise, not vague
• Maintain academic rigor and neutrality

ANALYSIS FRAMEWORK:
1. Identify the core assertion in the claim
2. Locate relevant data in the KEY DATA POINTS sections
3. Compare claim vs. reality with specific numbers
4. Explain the magnitude of any discrepancy
5. Provide context that helps users understand the issue

OUTPUT REQUIREMENTS:
• Verdict must be one of: "Supported" | "Mixed" | "Unsupported" | "Insufficient Evidence"
• Summary must be 3-5 detailed points that:
  - Start with the relevant data point from sources
  - Compare it directly to the claim
  - Explain the significance
  - Use specific numbers, percentages, and dates
• Sources must include ONLY those you actually referenced
• Output must be valid JSON (no markdown, no preamble)

CLAIM TO FACT-CHECK:
"${claim}"

AUTHORITATIVE SOURCES WITH DATA:
${formattedSources}

REQUIRED JSON FORMAT:
{
  "verdict": "Supported | Mixed | Unsupported | Insufficient Evidence",
  "summary": [
    "Point 1: State the relevant official data/statistic, then compare to claim",
    "Point 2: Provide additional context or related data that clarifies the situation",
    "Point 3: Explain the magnitude of discrepancy (if any) and what it means",
    "Point 4 (optional): Address any nuances or related considerations",
    "Point 5 (optional): Summarize the conclusion with specific evidence"
  ],
  "sources": [
    { 
      "title": "Exact title from sources above", 
      "publisher": "Exact publisher name", 
      "year": "Exact year", 
      "url": "Exact URL" 
    }
  ]
}

EXAMPLE OF EXCELLENT ANALYSIS:
Claim: "Unemployment is 23%"
Summary: [
  "According to the Bureau of Labor Statistics Employment Situation Summary (December 2024), the actual U.S. unemployment rate is 4.1%, not 23%. This represents a discrepancy of nearly 19 percentage points.",
  "The claim of 23% unemployment is approximately 5.6 times higher than the actual rate. A 23% unemployment rate would indicate a severe economic depression comparable to the Great Depression of the 1930s.",
  "Current labor force participation rate is 62.5%, meaning the vast majority of working-age Americans are employed or actively seeking work. The economy added 256,000 jobs in December 2024.",
  "For context, the unemployment rate peaked at 14.8% during the COVID-19 pandemic in April 2020, which was considered a crisis. The current 4.1% rate is close to historical norms and indicates a healthy labor market."
]

Now provide your fact-check in this exact JSON format. Be thorough and cite specific data.`;

  try {
    const model = genAI.getGenerativeModel({ 
      model: "gemini-3-flash-preview",
      generationConfig: {
        temperature: 0.1,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 2048,
        responseMimeType: "application/json",
      },
    });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();

    // Clean up any markdown artifacts
    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    // Validate JSON structure
    const parsed = JSON.parse(text);
    
    if (!parsed.verdict || !parsed.summary || !Array.isArray(parsed.summary) || parsed.summary.length === 0) {
      throw new Error("Invalid response format from AI");
    }

    // Ensure verdict is one of the allowed values
    const validVerdicts = ["Supported", "Mixed", "Unsupported", "Insufficient Evidence"];
    if (!validVerdicts.includes(parsed.verdict)) {
      parsed.verdict = "Insufficient Evidence";
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(parsed),
    };
  } catch (error) {
    console.error("Gemini API error:", error);
    
    // More helpful error messages
    let errorMessage = "Failed to analyze claim";
    let errorDetails = error.message;
    
    if (error.message?.includes("API key")) {
      errorMessage = "API configuration error";
      errorDetails = "The fact-checker service is temporarily unavailable";
    } else if (error.message?.includes("quota")) {
      errorMessage = "Service temporarily unavailable";
      errorDetails = "Please try again in a few minutes";
    } else if (error.message?.includes("JSON")) {
      errorMessage = "Analysis format error";
      errorDetails = "Please try rephrasing your claim";
    }
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: errorMessage,
        details: errorDetails 
      }),
    };
  }
}