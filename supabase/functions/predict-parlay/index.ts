const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GEMINI_MODEL_TEXT = "gemini-flash-latest";

const buildPredictionPrompt = (parlayDetailsString: string) => `
You are an expert sports analyst AI. You have been provided with details of a sports parlay.
Your task is to:
1.  USE YOUR WEB SEARCH CAPABILITIES (Google Search tool) to find relevant, up-to-date contextual information for each leg of the parlay. This includes team injury reports, player status, recent performance, win/loss streaks, and head-to-head data. Rosters change via trades, free agency, and waivers — do not assume a player is still on the team you remember from training data; verify their current team via search, and flag it in context_summary if a leg references a player who has since moved teams.
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

const extractJsonFromModelText = (rawText: string): string => {
  let jsonStr = rawText.trim();
  const fenceMatch = jsonStr.match(/^```(?:\w*)?\s*\n?([\s\S]*?)\n?\s*```$/);
  if (fenceMatch && fenceMatch[1]) {
    jsonStr = fenceMatch[1].trim();
  }
  return jsonStr;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiKey) {
      return new Response(JSON.stringify({ error: "Missing Gemini API key." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const parlayDetailsString = typeof body?.parlayDetailsString === "string" ? body.parlayDetailsString.trim() : "";

    if (!parlayDetailsString) {
      return new Response(JSON.stringify({ error: "No parlay details provided for prediction." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL_TEXT}:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: buildPredictionPrompt(parlayDetailsString) }] }],
          tools: [{ googleSearch: {} }],
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      return new Response(JSON.stringify({ error: `AI service error: ${errorText}` }), {
        status: geminiResponse.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const geminiJson = await geminiResponse.json();
    const candidate = geminiJson?.candidates?.[0];
    const rawText: string = candidate?.content?.parts?.[0]?.text ?? "";

    let parsed: {
      prediction?: string;
      overall_summary?: string;
      suggestions?: string;
      context_summary?: string;
    };
    try {
      parsed = JSON.parse(extractJsonFromModelText(rawText));
    } catch (_) {
      return new Response(
        JSON.stringify({
          overallOutcome: "ERROR",
          overall_summary: `AI Service Error: Failed to parse prediction response. Response text (first 200 chars): ${rawText.slice(0, 200)}`,
          suggestions: "Could not generate suggestions due to an error.",
          contextualDataUsed: "AI response parsing error.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const groundingSources: { web: { uri: string; title: string } }[] = [];
    const groundingChunks = candidate?.groundingMetadata?.groundingChunks ?? [];
    for (const chunk of groundingChunks) {
      if (chunk?.web?.uri && chunk?.web?.title) {
        groundingSources.push({ web: { uri: chunk.web.uri, title: chunk.web.title } });
      }
    }

    return new Response(
      JSON.stringify({
        overallOutcome: parsed.prediction || "INDETERMINATE",
        overall_summary: parsed.overall_summary || "No summary provided by AI.",
        suggestions: parsed.suggestions || "No suggestions provided by AI.",
        contextualDataUsed: parsed.context_summary || "No context summary provided by AI.",
        groundingSources: groundingSources.length > 0 ? groundingSources : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
