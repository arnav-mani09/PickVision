
import { GoogleGenAI, GenerateContentResponse, HarmCategory, HarmBlockThreshold } from "@google/genai";
import type { PredictionResult, GroundingChunk, ExtractedImageResult, EditableParlayLeg } from '../types';
import { GEMINI_API_KEY_ERROR_MESSAGE, GEMINI_MODEL_TEXT, GEMINI_MODEL_VISION } from '../constants';

const API_KEY = process.env.API_KEY;

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
  // Parameter changed to accept a descriptive string of the parlay
  parlayDetailsString: string 
): Promise<Omit<PredictionResult, 'parlaySentForPrediction'>> => {
  if (!ai) {
    return {
      overallOutcome: 'ERROR',
      reasoning: `AI Features Disabled: ${GEMINI_API_KEY_ERROR_MESSAGE}`,
      contextualDataUsed: "AI features disabled.",
    };
  }
  if (!parlayDetailsString.trim()) {
    return {
      overallOutcome: 'ERROR',
      reasoning: "No parlay details provided for prediction.",
      contextualDataUsed: "No parlay details.",
    }
  }

  const prompt = `
You are an expert sports analyst AI. You have been provided with details of a sports parlay.
Your task is to:
1.  USE YOUR WEB SEARCH CAPABILITIES (Google Search tool) to find relevant, up-to-date contextual information for each leg of the parlay. This includes, but is not limited to:
    *   Team injury reports and key player statuses.
    *   Recent win/loss streaks and overall team form.
    *   Historical head-to-head (H2H) data for the matchups involved.
    *   Specific player matchups and how they might influence player-specific bets.
    *   Opponent defensive schemes (e.g., strength against a certain position, pace of play impacts).
    *   Player's recent performance trends (e.g., scoring form, rebound rates against similar opponents).
    *   Any other significant factors like travel, rest, or game importance.
2.  Analyze the parlay in conjunction with the information you find.
3.  Predict the overall outcome of the parlay (HIT or MISS).
4.  Provide a detailed reasoning for your prediction.
    VERY IMPORTANT REASONING FORMATTING FOR THE 'reasoning' FIELD:
    - The entire 'reasoning' field must be a single JSON string.
    - Use headings for each parlay leg and the overall summary. Follow each heading with '\\n'. Example: "Analysis for Leg 1 (Player X Over Y Points):\\n".
    - Under each heading, provide your analysis using bullet points. Start each bullet point with "- " (a hyphen and a space).
    - EACH bullet point line MUST end with '\\n' to ensure it renders on a new line.
    - Example for one leg: "Analysis for Leg 1 (Player X Over Y Points):\\n- Player X has been on a scoring streak, averaging Z points in the last 5 games.\\n- The opponent has a weak defense against Player X's position.\\n- Web search confirms Player X is healthy and expected to play full minutes.\\n"
    - Ensure you do this for ALL legs and the overall summary.
5.  CRITICALLY: If you CANNOT find specific crucial information for a leg (e.g., a specific defensive scheme detail, or up-to-the-minute injury news for a lesser-known player), YOU MUST EXPLICITLY STATE THIS in your bullet-point reasoning for that leg AND in the context_summary. Explain how the lack of this information impacts your confidence or the prediction for that leg. It is much better to acknowledge missing information than to make assumptions.
6.  Summarize the key pieces of contextual information you found and used (or couldn't find) in the 'context_summary' field. This summary should also ideally use concise bullet points if appropriate for readability, with each bullet point ending in '\\n'.

PARLAY DETAILS:
${parlayDetailsString}

Respond in JSON format with the following structure.
VERY IMPORTANT: Your entire response MUST be a single, valid JSON object. Do NOT include any text, explanations, or markdown (like \`\`\`json) before or after this JSON object.
CRITICAL JSON FORMATTING RULES FOR ALL STRING VALUES: All string values (for "prediction", "reasoning", "context_summary", "confidence_level") MUST be properly escaped. This means any double quotes (") within a string value must be escaped as \\", newline characters (e.g., for bullet points and headings) as \\n, backslashes as \\\\, etc.

{
  "prediction": "HIT" | "MISS" | "INDETERMINATE",
  "reasoning": "Analysis for Leg 1 (Details of Leg 1 from PARLAY DETAILS):\\n- Bullet point reasoning for leg 1...\\n- Another bullet point for leg 1...\\n\\nAnalysis for Leg 2 (Details of Leg 2 from PARLAY DETAILS):\\n- Bullet point reasoning for leg 2...\\n- If info was missing, state: Not Found: Specific detail XYZ for Leg 2, impacting confidence.\\n\\nOverall Parlay Summary:\\n- Based on the analysis of individual legs...\\n- The parlay has a (high/medium/low) chance because...\\n",
  "context_summary": "- Found: Team A has 2 key starters injured.\\n- Player X averaging 30 PPG last 5 games.\\n- Not Found: Specific defensive matchup details for Player Y.\\n",
  "confidence_level": "High" | "Medium" | "Low"
}

Be critical and insightful. Do not just repeat the input parlay details. Provide a thoughtful analysis based on web-sourced data.
If the parlay details are too vague or if, even with web search, you lack sufficient contextual data for a meaningful prediction, set prediction to "INDETERMINATE" and explain why.
Adhere strictly to these JSON formatting and escaping rules, especially for newlines (\\\\n) within the reasoning and context_summary strings to ensure bullet points and headings are correctly formatted.
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
      reasoning: parsedData.reasoning || "No reasoning provided by AI.",
      contextualDataUsed: parsedData.context_summary || "No context summary provided by AI.",
      groundingSources: groundingSources.length > 0 ? groundingSources : undefined,
      // confidenceLevel: parsedData.confidence_level || 'Medium', // Add if you want to use this
    };

  } catch (error) {
    console.error("Error generating enhanced parlay prediction from Gemini API:", error);
    let reasoning = "Failed to generate AI prediction due to an unexpected error.";
    let contextSummary = "Contextual data search failed or was inconclusive.";
    if (error instanceof Error) {
        if (error.message.includes("API key not valid")) {
            reasoning = "AI Service Error: The API key is not valid.";
            contextSummary = "API key invalid, could not perform search.";
        } else if (error.message.toLowerCase().includes("json")) {
            reasoning = `AI Service Error: Failed to parse prediction response. The AI may have returned an invalid JSON format or an error message not in JSON. Original error: ${error.message}. Response text (first 200 chars): ${genAIResponse?.text?.substring(0,200) ?? 'N/A'}`;
            contextSummary = `AI response parsing error. Details: ${error.message}`;
        } else if (error.message.includes("got status: 400 INVALID_ARGUMENT")) {
             reasoning = `AI Service Error: Invalid argument to API. Details: ${error.message}`;
             contextSummary = `AI service error: Invalid argument. ${error.message}`;
        }
         else {
            reasoning = `AI Service Error: ${error.message}`;
            contextSummary = `AI service error during search: ${error.message}`;
        }
    }
    return {
      overallOutcome: 'ERROR',
      reasoning: reasoning,
      contextualDataUsed: contextSummary,
    };
  }
};
