const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GEMINI_MODEL_VISION = "gemini-flash-latest";

const EXTRACTION_PROMPT = `
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
    const base64Image = typeof body?.base64Image === "string" ? body.base64Image : "";
    const mimeType = typeof body?.mimeType === "string" ? body.mimeType : "image/jpeg";

    if (!base64Image) {
      return new Response(JSON.stringify({ error: "No image data provided for extraction." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL_VISION}:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ inlineData: { data: base64Image, mimeType } }, { text: EXTRACTION_PROMPT }],
            },
          ],
          generationConfig: { responseMimeType: "application/json" },
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
    const rawOutput: string = geminiJson?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    let parsed: { parlayLegs?: unknown[]; error_message?: string };
    try {
      parsed = JSON.parse(extractJsonFromModelText(rawOutput));
    } catch (_) {
      return new Response(
        JSON.stringify({
          rawOutput,
          structuredLegs: null,
          error: `Failed to parse structured parlay information from AI response. Raw AI output (first 200 chars): ${rawOutput.slice(0, 200)}`,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (parsed.error_message) {
      return new Response(
        JSON.stringify({ rawOutput, structuredLegs: null, error: parsed.error_message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!Array.isArray(parsed.parlayLegs)) {
      return new Response(
        JSON.stringify({ rawOutput, structuredLegs: null, error: "AI response did not contain valid parlay legs." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const structuredLegs = parsed.parlayLegs.map((leg: any, index: number) => ({
      id: leg.id || `leg${index + 1}`,
      playerTeam: leg.playerTeam || "N/A",
      stat: leg.stat || "N/A",
      condition: leg.condition || "N/A",
      value: leg.value || "",
      isEditableOverUnder: ["over", "under"].includes(String(leg.condition || "").toLowerCase()),
    }));

    return new Response(
      JSON.stringify({
        rawOutput,
        structuredLegs,
        error: structuredLegs.length === 0 ? "No parlay legs identified." : undefined,
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
