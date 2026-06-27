const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const WINDOW_DAYS = 3;

type ScheduleMatch = {
  gameId: string;
  kickoff: string;
  homeTeam: string;
  awayTeam: string;
  homeCountryCode: string;
  awayCountryCode: string;
};

type WorldCupPick = {
  player: string;
  statLabel: string;
  side: "Over" | "Under";
  line: string;
  reason: string;
};

type Prediction = {
  gameId: string;
  predictedWinner: string;
  confidence: number;
  reasoning: string;
  topPicks: WorldCupPick[];
};

type WorldCupGame = ScheduleMatch & Omit<Prediction, "gameId">;

const addDays = (dateStr: string, days: number): string => {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

const toGameId = (homeCode: string, awayCode: string, kickoffIso: string): string => {
  const dateOnly = kickoffIso.slice(0, 10);
  return `${homeCode.toLowerCase()}-${awayCode.toLowerCase()}-${dateOnly}`;
};

const extractJson = <T>(rawText: string): T => {
  let jsonStr = rawText.trim();
  const fenceMatch = jsonStr.match(/```(?:\w*)?\s*([\s\S]*?)\s*```/);
  if (fenceMatch && fenceMatch[1]) {
    jsonStr = fenceMatch[1].trim();
  }
  const firstBrace = jsonStr.indexOf("{");
  const lastBrace = jsonStr.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    jsonStr = jsonStr.slice(firstBrace, lastBrace + 1);
  }
  return JSON.parse(jsonStr);
};

const buildSchedulePrompt = (date: string, endDate: string) => `
You are a soccer schedule lookup assistant. Use web search to find the OFFICIAL FIFA World Cup match schedule for matches kicking off between ${date} and ${endDate} (inclusive), in UTC.

Rules:
- Only include real, officially scheduled FIFA World Cup matches in that window.
- Each match MUST include: kickoff (ISO 8601 UTC datetime), homeTeam (full country name), awayTeam (full country name), homeCountryCode (ISO 3166-1 alpha-2), awayCountryCode (ISO 3166-1 alpha-2).
- If there are no World Cup matches in this window, return an empty array.
- Output JSON only: {"matches":[...]}.
`;

const buildPredictionPrompt = (matches: ScheduleMatch[]) => `
You are an expert soccer analyst. Use web search to research current form, injuries, head-to-head history, and lineup news for each of the following FIFA World Cup matches, then predict a winner for each.

Matches:
${matches.map((m, i) => `${i + 1}. ${m.homeTeam} vs ${m.awayTeam} (kickoff: ${m.kickoff}, gameId: ${m.gameId})`).join("\n")}

For EACH match, provide:
- gameId: must exactly match the gameId given for that match above.
- predictedWinner: the full team name predicted to win, or "Draw" if you genuinely expect a draw.
- confidence: numeric 0-1.
- reasoning: 2-4 concise sentences covering the key factors (form, injuries, head-to-head, home advantage).
- topPicks: EXACTLY 3 player prop picks for this match, each with: player, statLabel (one of: Goals, Shots on Target, Assists, Saves, Tackles, Cards), side (Over/Under), line (must end in .5), reason (max 16 words).

Output JSON only: {"predictions":[{"gameId":"...","predictedWinner":"...","confidence":0.0,"reasoning":"...","topPicks":[{"player":"...","statLabel":"...","side":"Over","line":"0.5","reason":"..."}]}]}
`;

const callGemini = async (geminiKey: string, prompt: string): Promise<string> => {
  const response = await fetch(
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
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini request failed (${response.status}): ${errorText}`);
  }
  const json = await response.json();
  return json?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = req.method !== "GET" ? await req.json().catch(() => ({})) : {};
    const url = new URL(req.url);
    const date = url.searchParams.get("date") ?? body.date ?? "";

    if (!date) {
      return new Response(JSON.stringify({ error: "Missing date." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: "Missing Supabase service role configuration." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!geminiKey) {
      return new Response(JSON.stringify({ error: "Missing Gemini API key." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const endDate = addDays(date, WINDOW_DAYS);
    const scheduleRaw = await callGemini(geminiKey, buildSchedulePrompt(date, endDate));
    const scheduleParsed = extractJson<{ matches: Omit<ScheduleMatch, "gameId">[] }>(scheduleRaw);
    const matches: ScheduleMatch[] = (scheduleParsed.matches ?? []).map((m) => ({
      ...m,
      gameId: toGameId(m.homeCountryCode, m.awayCountryCode, m.kickoff),
    }));

    if (matches.length === 0) {
      return new Response(JSON.stringify({ games: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ids = matches.map((m) => m.gameId);
    const cacheResponse = await fetch(
      `${supabaseUrl}/rest/v1/world_cup_picks?game_id=in.(${ids.join(",")})&select=*`,
      {
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
        },
      }
    );
    const cachedRows: any[] = cacheResponse.ok ? await cacheResponse.json() : [];
    const cachedById = new Map(cachedRows.map((row) => [row.game_id, row]));

    const uncachedMatches = matches.filter((m) => !cachedById.has(m.gameId));

    let newGames: WorldCupGame[] = [];
    if (uncachedMatches.length > 0) {
      const predictionRaw = await callGemini(geminiKey, buildPredictionPrompt(uncachedMatches));
      const predictionParsed = extractJson<{ predictions: Prediction[] }>(predictionRaw);
      const predictionsById = new Map(
        (predictionParsed.predictions ?? []).map((p) => [p.gameId, p])
      );

      newGames = uncachedMatches
        .map((match) => {
          const prediction = predictionsById.get(match.gameId);
          if (!prediction) return null;
          return {
            ...match,
            predictedWinner: prediction.predictedWinner,
            confidence: Number(prediction.confidence ?? 0),
            reasoning: prediction.reasoning ?? "",
            topPicks: (prediction.topPicks ?? []).slice(0, 3),
          };
        })
        .filter((g): g is WorldCupGame => g !== null);

      if (newGames.length > 0) {
        await fetch(`${supabaseUrl}/rest/v1/world_cup_picks?on_conflict=game_id`, {
          method: "POST",
          headers: {
            apikey: serviceRoleKey,
            Authorization: `Bearer ${serviceRoleKey}`,
            "Content-Type": "application/json",
            Prefer: "resolution=ignore-duplicates,return=minimal",
          },
          body: JSON.stringify(
            newGames.map((g) => ({
              game_id: g.gameId,
              kickoff: g.kickoff,
              home_team: g.homeTeam,
              away_team: g.awayTeam,
              home_country_code: g.homeCountryCode,
              away_country_code: g.awayCountryCode,
              predicted_winner: g.predictedWinner,
              confidence: g.confidence,
              reasoning: g.reasoning,
              top_picks: g.topPicks,
            }))
          ),
        });
      }
    }

    const cachedGames: WorldCupGame[] = cachedRows.map((row) => ({
      gameId: row.game_id,
      kickoff: row.kickoff,
      homeTeam: row.home_team,
      awayTeam: row.away_team,
      homeCountryCode: row.home_country_code,
      awayCountryCode: row.away_country_code,
      predictedWinner: row.predicted_winner,
      confidence: Number(row.confidence ?? 0),
      reasoning: row.reasoning,
      topPicks: row.top_picks ?? [],
    }));

    const allGames = [...cachedGames, ...newGames].sort(
      (a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime()
    );

    return new Response(
      JSON.stringify({
        games: allGames.map((g) => ({
          id: g.gameId,
          kickoff: g.kickoff,
          homeTeam: g.homeTeam,
          awayTeam: g.awayTeam,
          homeCountryCode: g.homeCountryCode,
          awayCountryCode: g.awayCountryCode,
          predictedWinner: g.predictedWinner,
          confidence: g.confidence,
          reasoning: g.reasoning,
          topPicks: g.topPicks,
        })),
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
