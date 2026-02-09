import { GoogleGenerativeAI } from "@google/generative-ai";
import { SOURCES } from "../../src/lib/sources.js";

export async function handler(event, context) {
  // Only allow POST requests
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    // Parse the request body
    const { claim } = JSON.parse(event.body);

    if (!claim) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Claim is required" }),
      };
    }

    // Initialize Gemini
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

    // Create prompt with sources
    const prompt = `Analyze the following claim and provide a fact-check using these authoritative sources:

CLAIM: ${claim}

SOURCES AVAILABLE:
${SOURCES.map((source, idx) => `
[${idx + 1}] ${source.title}
Publisher: ${source.publisher}
Year: ${source.year}
Category: ${source.category}
Tier: ${source.tier}
${source.keyFacts ? `Key Facts:\n${source.keyFacts.map(fact => `- ${fact}`).join('\n')}` : ''}
`).join('\n---\n')}

Please analyze this claim and provide:
1. A verdict (True, False, Misleading, or Needs Context)
2. A detailed explanation
3. References to specific sources used (by number)
4. Key facts that support or refute the claim

Format your response as JSON with this structure:
{
  "verdict": "True|False|Misleading|Needs Context",
  "explanation": "detailed explanation here",
  "sourceReferences": [1, 2, 3],
  "keyPoints": ["point 1", "point 2"]
}`;

    // Generate response
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();

    // Try to parse as JSON
    let analysis;
    try {
      // Remove markdown code blocks if present
      text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      analysis = JSON.parse(text);
    } catch (parseError) {
      // If JSON parsing fails, create a structured response
      analysis = {
        verdict: "Needs Context",
        explanation: text,
        sourceReferences: [],
        keyPoints: []
      };
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        success: true,
        claim,
        analysis,
      }),
    };

  } catch (error) {
    console.error("Error analyzing claim:", error);
    
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        success: false,
        error: error.message || "Failed to analyze claim",
      }),
    };
  }
}