const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const allowedLeagues = new Set(["nba", "nfl", "mlb", "nhl"]);

type DailyPropSuggestion = {
  player: string;
  statLabel: string;
  side: "Over" | "Under";
  line: string;
  matchup?: string;
  confidence: number;
  reason: string;
};

const buildPrompt = (leagueLabel: string, dateLabel: string, maxProps: number) => `
You are an expert ${leagueLabel} props analyst. Use web search to find today's ${leagueLabel} games, available player props, and the strongest consensus or implied edges.
Return the top ${maxProps} props with the absolute highest probability of hitting across all stat types.

Rules:
- Each item MUST include: player, statLabel, side (Over/Under), line (must end with .5), matchup (optional), confidence (0-1), reason (1 short sentence, max 18 words).
- statLabel MUST be one of: Points, Rebounds, Assists, PRA, PR, PA, RA, 3PT Made, Turnovers, Blocks, Steals.
- NEVER return "Player Prop" or "Prop".
- Do NOT include parlays. Single props only.
- Avoid duplicates (same player + statLabel + line).
- Confidence must be numeric between 0 and 1, and should be >= 0.60 unless no options exist.
- Sort results by confidence descending.
- Output JSON only: {"props":[...]}.

Date context: ${dateLabel}
`;

const parseGeminiJson = (rawText: string): DailyPropSuggestion[] => {
  let jsonStr = rawText.trim();
  const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
  const match = jsonStr.match(fenceRegex);
  if (match && match[2]) {
    jsonStr = match[2].trim();
  }
  const parsed = JSON.parse(jsonStr);
  if (!parsed?.props || !Array.isArray(parsed.props)) {
    throw new Error("AI did not return a props array.");
  }
  return parsed.props.map((prop: any) => ({
    player: String(prop.player ?? "").trim(),
    statLabel: String(prop.statLabel ?? "").trim(),
    side: prop.side === "Under" ? "Under" : "Over",
    line: String(prop.line ?? "").trim(),
    matchup: prop.matchup ? String(prop.matchup).trim() : undefined,
    confidence: Number(prop.confidence ?? 0),
    reason: String(prop.reason ?? "").trim(),
  }));
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const body = req.method !== "GET" ? await req.json().catch(() => ({})) : {};
    const league = (url.searchParams.get("league") ?? body.league ?? "").toLowerCase();
    const date = url.searchParams.get("date") ?? body.date ?? "";

    if (!allowedLeagues.has(league)) {
      return new Response(JSON.stringify({ error: "Invalid league." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!date) {
      return new Response(JSON.stringify({ error: "Missing date." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: "Missing Supabase service role configuration." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiKey) {
      return new Response(JSON.stringify({ error: "Missing Gemini API key." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cacheResponse = await fetch(`${supabaseUrl}/rest/v1/daily_picks?league=eq.${league}&date=eq.${date}&select=picks&order=created_at.desc&limit=1`, {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    });
    if (cacheResponse.ok) {
      const cached = await cacheResponse.json();
      if (Array.isArray(cached) && cached.length > 0) {
        return new Response(JSON.stringify({ cached: true, picks: cached[0].picks }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const leagueLabel = league.toUpperCase();
    const prompt = buildPrompt(leagueLabel, date, 14);

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          tools: [{ googleSearch: {} }],
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      return new Response(JSON.stringify({ error: errorText }), {
        status: geminiResponse.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const geminiJson = await geminiResponse.json();
    const rawText = geminiJson?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const props = parseGeminiJson(rawText);

    await fetch(`${supabaseUrl}/rest/v1/daily_picks`, {
      method: "POST",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ league, date, picks: props }),
    });

    return new Response(JSON.stringify({ cached: false, picks: props }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
