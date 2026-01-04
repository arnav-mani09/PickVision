

import { GoogleGenAI, GenerateContentResponse, HarmCategory, HarmBlockThreshold } from "@google/genai";
import type { PredictionResult, GroundingChunk, ExtractedImageResult, EditableParlayLeg } from '../types';
import { GEMINI_API_KEY_ERROR_MESSAGE, GEMINI_MODEL_TEXT, GEMINI_MODEL_VISION } from '../constants';

// For Vite projects, add this type declaration at the top of the file or in a global .d.ts file:
// declare interface ImportMeta {
//   env: {
//     VITE_API_KEY: string;
//   };
// }
const API_KEY = (import.meta as any).env?.VITE_API_KEY || process.env.VITE_API_KEY;


let ai: GoogleGenAI | null = null;
if (API_KEY) {
  ai = new GoogleGenAI({ apiKey: API_KEY });
} else {
  console.warn(GEMINI_API_KEY_ERROR_MESSAGE);
}

const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
];

// Function to convert image file to generative part
async function fileToGenerativePart(base64Image: string, mimeType: string) {
  return {
    inlineData: {
      data: base64Image,
      mimeType
    },
  };
}

export const extractParlayInfoFromImage = async (base64Image: string, mimeType: string = 'image/jpeg'): Promise<ExtractedImageResult> => {
  if (!ai) {
    return { 
      rawOutput: `AI Features Disabled: ${GEMINI_API_KEY_ERROR_MESSAGE}`,
      structuredLegs: null,
      error: `AI Features Disabled: ${GEMINI_API_KEY_ERROR_MESSAGE}`
    };
  }
  if (!base64Image) {
    return { 
      rawOutput: "Error: No image data provided for extraction.",
      structuredLegs: null,
      error: "No image data provided for extraction."
    };
  }

  const imagePart = await fileToGenerativePart(base64Image, mimeType);
  const prompt = `
Analyze the provided image, which is expected to be a sports betting parlay slip or a list of sports bets.
Extract the key details of each leg in the parlay.

VERY IMPORTANT: Your entire response MUST be a single, valid JSON object. Do NOT include any text, explanations, or markdown (like \`\`\`json) before or after this JSON object.

The JSON object should contain a single key "parlayLegs". The value of "parlayLegs" should be an array of objects, where each object represents a single leg of the parlay and has the following structure:
{
  "id": "legN", (e.g., "leg1", "leg2")
  "playerTeam": "Player Name or Team Name",
  "stat": "Statistic type (e.g., Points, Rebounds, Moneyline, Spread)",
  "condition": "Condition (e.g., Over, Under, To Win, specific spread like -2.5)",
  "value": "Value (e.g., 27.5, +150, or empty if included in condition like a spread)"
}

CRITICAL JSON FORMATTING RULES FOR ALL STRING VALUES:
1.  All string values (for "playerTeam", "stat", "condition", "value", and "error_message" if used) MUST be meticulously escaped.
2.  Any double quotes (") within a string value MUST be escaped as \\". For example, if a player's name is 'Player "Nickname" Smith', the JSON string value for that field must be "Player \\"Nickname\\" Smith".
3.  Any newline characters within a string value MUST be escaped as \\n.
4.  Any backslashes (\\) within a string value MUST be escaped as \\\\.
5.  Other special characters (tabs, form feeds, etc.) must also be appropriately escaped (e.g., \\t).

If a leg is clearly an Over/Under type bet on a player statistic, ensure the "condition" field is "Over" or "Under" and the "value" field is the numerical threshold.
Example: "LeBron James Over 27.5 Points" should be:
{ "id": "leg1", "playerTeam": "LeBron James", "stat": "Points", "condition": "Over", "value": "27.5" }

If it's a Moneyline bet: "Kansas City Chiefs to win"
{ "id": "leg2", "playerTeam": "Kansas City Chiefs", "stat": "Moneyline", "condition": "To Win", "value": "" }

If specific values are hard to read, note that in the respective field (e.g., "value": "obscured") or use a placeholder.

If the image is unclear or not a parlay slip, return a JSON object like this:
{
  "parlayLegs": [],
  "error_message": "The uploaded image does not appear to be a parlay slip. Be sure to escape any special characters in this error message string, for example, any internal quotes like \\"this\\"."
}

Example of a valid JSON response (remember, ALL string values must be correctly escaped, especially internal double quotes like this example for playerTeam: "Team \\"Dominators\\""):
{
  "parlayLegs": [
    { "id": "leg1", "playerTeam": "LeBron James (Lakers)", "stat": "Points Scored", "condition": "Over", "value": "27.5" },
    { "id": "leg2", "playerTeam": "Stephen Curry", "stat": "3-Pointers Made", "condition": "Under", "value": "4.5" },
    { "id": "leg3", "playerTeam": "Team \\"Dominators\\"", "stat": "Moneyline", "condition": "To Win", "value": "+150" }
  ]
}
Adhere strictly to these JSON formatting and escaping rules for ALL string values.
`;

  let rawOutputText = "";
  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: GEMINI_MODEL_VISION, 
        contents: [{ parts: [imagePart, {text: prompt}] }],
        config: { 
          safetySettings,
          responseMimeType: "application/json", // Request JSON directly
        },
    });
    
    rawOutputText = response.text.trim(); // Store the raw text response
    
    let jsonToParse = rawOutputText;
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonToParse.match(fenceRegex);
    if (match && match[2]) {
      jsonToParse = match[2].trim(); // Use the content inside the markdown fence if present
    }
    
    const parsedJson = JSON.parse(jsonToParse);

    if (parsedJson.error_message) {
      return {
        rawOutput: rawOutputText,
        structuredLegs: null,
        error: parsedJson.error_message
      };
    }

    if (parsedJson.parlayLegs && Array.isArray(parsedJson.parlayLegs)) {
      const structuredLegs: EditableParlayLeg[] = parsedJson.parlayLegs.map((leg: any, index: number) => ({
        id: leg.id || `leg${index + 1}`,
        playerTeam: leg.playerTeam || "N/A",
        stat: leg.stat || "N/A",
        condition: leg.condition || "N/A",
        value: leg.value || "",
        isEditableOverUnder: ["over", "under"].includes((leg.condition || "").toLowerCase()),
      }));
      return { rawOutput: rawOutputText, structuredLegs, error: structuredLegs.length === 0 ? "No parlay legs identified." : undefined };
    } else {
       return { rawOutput: rawOutputText, structuredLegs: null, error: "AI response did not contain valid parlay legs." };
    }

  } catch (error) {
    console.error("Error extracting parlay info from image with Gemini API:", error);
    let errorMessage = "Failed to extract parlay information from image due to an AI service error.";
    if (error instanceof Error) {
        if (error.message.includes("API key not valid")) {
            errorMessage = "AI Service Error: The provided API key is not valid. Please check configuration.";
        } else if (error.message.includes("Invalid IANA MimeType")) {
            errorMessage = `AI Service Error: Invalid image MIME type provided: ${mimeType}. Please upload a valid image format (e.g., JPEG, PNG).`;
        } else if (rawOutputText && error.message.toLowerCase().includes("json")) { 
            errorMessage = `AI Service Error: Failed to parse structured parlay information from AI response. Original error: ${error.message}. Raw AI output (first 200 chars): ${rawOutputText.substring(0, 200)}`;
        } else {
            errorMessage = `AI Service Error: ${error.message}`;
        }
    }
     return { rawOutput: rawOutputText || "No response from AI.", structuredLegs: null, error: errorMessage };
  }
};


export const getEnhancedParlayPrediction = async (
  parlayDetailsString: string 
): Promise<Omit<PredictionResult, 'parlaySentForPrediction'>> => {
  if (!ai) {
    return {
      overallOutcome: 'ERROR',
      overall_summary: `AI Features Disabled: ${GEMINI_API_KEY_ERROR_MESSAGE}`,
      suggestions: 'AI features disabled.',
      contextualDataUsed: "AI features disabled.",
    };
  }
  if (!parlayDetailsString.trim()) {
    return {
      overallOutcome: 'ERROR',
      overall_summary: "No parlay details provided for prediction.",
      suggestions: "No parlay details.",
      contextualDataUsed: "No parlay details.",
    }
  }

  const prompt = `
You are an expert sports analyst AI. You have been provided with details of a sports parlay.
Your task is to:
1.  USE YOUR WEB SEARCH CAPABILITIES (Google Search tool) to find relevant, up-to-date contextual information for each leg of the parlay. This includes team injury reports, player status, recent performance, win/loss streaks, and head-to-head data.
2.  Analyze the parlay in conjunction with the information you find.
3.  Predict the overall outcome of the parlay (HIT or MISS).
4.  Provide a concise "overall_summary" of your prediction, limited to a maximum of 3-4 short, scannable bullet points. Explain the key factors influencing your decision. Each bullet point MUST start with a hyphen (-) and end with a newline character (\\n).
5.  Provide actionable "suggestions" to improve the parlay's chances of winning, limited to 2-3 bullet points.
    - If a leg is risky, suggest an alternative (e.g., flipping 'Over' to 'Under').
    - Frame suggestions as direct, helpful advice. Each bullet point MUST start with a hyphen (-) and end with a newline character (\\n).
    - If the parlay looks truly elite and no changes are needed, set "suggestions" to "No suggestions." (exact string).
6.  Summarize the key pieces of contextual information you found (or couldn't find) in the 'context_summary' field using very concise bullet points (max 3-4). Each bullet point MUST start with a hyphen (-) and end with a newline character (\\n).

PARLAY DETAILS:
${parlayDetailsString}

Respond in JSON format with the following structure.
VERY IMPORTANT: Your entire response MUST be a single, valid JSON object. Do NOT include any text, explanations, or markdown (like \`\`\`json) before or after this JSON object.
CRITICAL JSON FORMATTING RULES: All string values MUST be properly escaped. This means any double quotes (") must be escaped as \\", and newlines for bullet points MUST be escaped as \\n.

{
  "prediction": "HIT" | "MISS" | "INDETERMINATE",
  "overall_summary": "- This parlay has a medium chance...\\n- Key factor is Player X's health...\\n- Team Y's defense is a major hurdle...\\n",
  "suggestions": "- Change Player A from 'Over 28.5' to 'Over 26.5' for a safer bet.\\n- Consider swapping Player B's 'Under 8.5 Rebounds' to 'Over' as the opponent is weak on the glass.\\n",
  "context_summary": "- Found: Player X is confirmed to play.\\n- Not Found: Head-to-head data for this season.\\n",
  "confidence_level": "High" | "Medium" | "Low"
}

Be critical and insightful. Only output "HIT" when you are almost entirely sure the parlay will hit AND there are no changes to be made. If you provide any actionable suggestions, set prediction to "MISS". If the parlay details are too vague or you lack sufficient data, set prediction to "INDETERMINATE".
Adhere strictly to these JSON formatting and escaping rules.
`;
  let genAIResponse: GenerateContentResponse | null = null;

  try {
    genAIResponse = await ai.models.generateContent({
      model: GEMINI_MODEL_TEXT,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }], 
        safetySettings: safetySettings,
      },
    });

    let jsonStr = genAIResponse.text.trim();
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[2]) {
      jsonStr = match[2].trim();
    }

    const parsedData = JSON.parse(jsonStr);

    const groundingSources: GroundingChunk[] = [];
    if (genAIResponse.candidates && genAIResponse.candidates[0]?.groundingMetadata?.groundingChunks) {
        genAIResponse.candidates[0].groundingMetadata.groundingChunks.forEach(attr => {
            if(attr.web && attr.web.uri && attr.web.title) {
              groundingSources.push({ web: { uri: attr.web.uri, title: attr.web.title } });
            }
        });
    }

    return {
      overallOutcome: parsedData.prediction || 'INDETERMINATE',
      overall_summary: parsedData.overall_summary || "No summary provided by AI.",
      suggestions: parsedData.suggestions || "No suggestions provided by AI.",
      contextualDataUsed: parsedData.context_summary || "No context summary provided by AI.",
      groundingSources: groundingSources.length > 0 ? groundingSources : undefined,
    };

  } catch (error) {
    console.error("Error generating enhanced parlay prediction from Gemini API:", error);
    let overall_summary = "Failed to generate AI prediction due to an unexpected error.";
    let contextSummary = "Contextual data search failed or was inconclusive.";
    if (error instanceof Error) {
        if (error.message.includes("API key not valid")) {
            overall_summary = "AI Service Error: The API key is not valid.";
            contextSummary = "API key invalid, could not perform search.";
        } else if (error.message.toLowerCase().includes("json")) {
            overall_summary = `AI Service Error: Failed to parse prediction response. The AI may have returned an invalid JSON format or an error message not in JSON. Original error: ${error.message}. Response text (first 200 chars): ${genAIResponse?.text?.substring(0,200) ?? 'N/A'}`;
            contextSummary = `AI response parsing error. Details: ${error.message}`;
        } else if (error.message.includes("got status: 400 INVALID_ARGUMENT")) {
             overall_summary = `AI Service Error: Invalid argument to API. Details: ${error.message}`;
             contextSummary = `AI service error: Invalid argument. ${error.message}`;
        }
         else {
            overall_summary = `AI Service Error: ${error.message}`;
            contextSummary = `AI service error during search: ${error.message}`;
        }
    }
    return {
      overallOutcome: 'ERROR',
      overall_summary: overall_summary,
      suggestions: 'Could not generate suggestions due to an error.',
      contextualDataUsed: contextSummary,
    };
  }
};
