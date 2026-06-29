const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const allowedLeagues = new Set(["nba", "nfl", "mlb", "nhl"]);

// Weight constants for the deterministic scoring layer — tune these once we have real outcome data.
const PICK_HIT_WEIGHT = 0.08; // per-hit nudge away from the 2.5/5 baseline
const PICK_CONFIDENCE_MIN = 0.3;
const PICK_CONFIDENCE_MAX = 0.93;

type DailyPropSuggestion = {
  player: string;
  statLabel: string;
  side: "Over" | "Under";
  line: string;
  matchup?: string;
  confidence: number;
  reason: string;
  last5Hits?: number;
};

type TeamStatFlags = Record<string, { offenseAboveAverage: boolean; defenseBelowAverage: boolean }>;

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

const scorePick = (last5Hits?: number): number => {
  if (last5Hits === undefined || Number.isNaN(last5Hits)) return 0.5;
  return clamp(0.5 + (last5Hits - 2.5) * PICK_HIT_WEIGHT, PICK_CONFIDENCE_MIN, PICK_CONFIDENCE_MAX);
};

// Real NBA standings -> league-average offense/defense flags per team. Free (SportsData.io key already
// configured for the unused nba-standings function); falls back to null on any failure so this never
// becomes a hard dependency for the picks pipeline.
const fetchNbaTeamStatFlags = async (): Promise<TeamStatFlags | null> => {
  try {
    const apiKey = Deno.env.get("SPORTSDATA_IO_KEY");
    if (!apiKey) return null;
    const now = new Date();
    const season = `${now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1}REG`;
    const response = await fetch(`https://api.sportsdata.io/v3/nba/scores/json/Standings/${season}`, {
      headers: { "Ocp-Apim-Subscription-Key": apiKey },
    });
    if (!response.ok) return null;
    const standings: any[] = await response.json();
    if (!Array.isArray(standings) || standings.length === 0) return null;

    const totalFor = standings.reduce((sum, t) => sum + Number(t.PointsPerGameFor ?? 0), 0);
    const totalAgainst = standings.reduce((sum, t) => sum + Number(t.PointsPerGameAgainst ?? 0), 0);
    const avgFor = totalFor / standings.length;
    const avgAgainst = totalAgainst / standings.length;

    const flags: TeamStatFlags = {};
    for (const team of standings) {
      const name = String(team.Name ?? team.Team ?? "").trim();
      if (!name) continue;
      flags[name] = {
        offenseAboveAverage: Number(team.PointsPerGameFor ?? 0) > avgFor,
        defenseBelowAverage: Number(team.PointsPerGameAgainst ?? 0) > avgAgainst, // allows more points than average = weaker defense
      };
    }
    return flags;
  } catch (_error) {
    return null;
  }
};

const buildStatContext = (flags: TeamStatFlags | null): string => {
  if (!flags) return "";
  const lines = Object.entries(flags).map(
    ([team, f]) =>
      `${team}: offense ${f.offenseAboveAverage ? "ABOVE" : "at/below"} league average, defense ${
        f.defenseBelowAverage ? "BELOW" : "at/above"
      } league average (i.e. ${f.defenseBelowAverage ? "weaker" : "not weaker"} than average).`
  );
  return `\nReal season stats for context (use these, don't re-derive via search):\n${lines.join("\n")}\n`;
};

const buildPrompt = (leagueLabel: string, dateLabel: string, maxProps: number, statContext: string) => `
You are an expert ${leagueLabel} props analyst. Use web search to find today's ${leagueLabel} games, available player props, and the strongest consensus or implied edges.
Return the top ${maxProps} props with the absolute highest probability of hitting across all stat types.
${statContext}
Rules:
- Each item MUST include: player, statLabel, side (Over/Under), line (must end with .5), matchup (optional), confidence (0-1, your own holistic read), reason (1 short sentence, max 18 words), last5Hits (integer 0-5 — in how many of this player's last 5 relevant games would this exact side/line have hit?).
- statLabel MUST be one of: Points, Rebounds, Assists, PRA, PR, PA, RA, 3PT Made, Turnovers, Blocks, Steals.
- NEVER return "Player Prop" or "Prop".
- Do NOT include parlays. Single props only.
- Avoid duplicates (same player + statLabel + line).
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
    confidence: scorePick(prop.last5Hits),
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
    const statFlags = league === "nba" ? await fetchNbaTeamStatFlags() : null;
    const prompt = buildPrompt(leagueLabel, date, 14, buildStatContext(statFlags));

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
