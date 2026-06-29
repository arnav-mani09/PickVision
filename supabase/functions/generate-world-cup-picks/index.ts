const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const WINDOW_DAYS = 3;

// Weight constants for the deterministic scoring layer — tune these once we have real outcome data.
const PICK_HIT_WEIGHT = 0.08; // per-hit nudge away from the 2.5/5 baseline, for player props
const PICK_CONFIDENCE_MIN = 0.3;
const PICK_CONFIDENCE_MAX = 0.93;
const TEAM_FACTOR_WEIGHT = 0.12; // per-point-of-diff nudge for match confidence
const TEAM_CONFIDENCE_MIN = 0.5;
const TEAM_CONFIDENCE_MAX = 0.95;
const RULE_BLEND = 0.7; // how much of match confidence comes from our rules vs Gemini's own number
const GEMINI_BLEND = 1 - RULE_BLEND;

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
  last5Hits?: number;
};

type ScoredWorldCupPick = WorldCupPick & { confidence: number };

type PredictionFactors = {
  homeOffenseAboveAverage?: boolean;
  awayOffenseAboveAverage?: boolean;
  homeDefenseBelowAverage?: boolean;
  awayDefenseBelowAverage?: boolean;
  homeFormWins?: number;
  awayFormWins?: number;
  geminiConfidence?: number;
};

type Prediction = {
  gameId: string;
  predictedWinner: string;
  confidence: number;
  reasoning: string;
  topPicks: WorldCupPick[];
  homeOffenseAboveAverage?: boolean;
  awayOffenseAboveAverage?: boolean;
  homeDefenseBelowAverage?: boolean;
  awayDefenseBelowAverage?: boolean;
  homeFormWins?: number;
  awayFormWins?: number;
};

type WorldCupGame = ScheduleMatch &
  Omit<Prediction, "gameId" | "topPicks"> & {
    topPicks: ScoredWorldCupPick[];
    factors?: PredictionFactors;
  };

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

const scorePick = (last5Hits?: number): number => {
  if (last5Hits === undefined || Number.isNaN(last5Hits)) return 0.5;
  return clamp(0.5 + (last5Hits - 2.5) * PICK_HIT_WEIGHT, PICK_CONFIDENCE_MIN, PICK_CONFIDENCE_MAX);
};

const factorScore = (
  offenseAboveAverage: boolean | undefined,
  opponentDefenseBelowAverage: boolean | undefined,
  formWins: number | undefined
): number => {
  return (
    (offenseAboveAverage ? 1 : 0) +
    (opponentDefenseBelowAverage ? 1 : 0) +
    (formWins !== undefined ? formWins / 5 : 0.5)
  );
};

const scoreMatch = (prediction: Prediction, homeTeam: string, awayTeam: string): number => {
  const homeScore = factorScore(prediction.homeOffenseAboveAverage, prediction.awayDefenseBelowAverage, prediction.homeFormWins);
  const awayScore = factorScore(prediction.awayOffenseAboveAverage, prediction.homeDefenseBelowAverage, prediction.awayFormWins);

  let diff = 0;
  if (prediction.predictedWinner === homeTeam) diff = homeScore - awayScore;
  else if (prediction.predictedWinner === awayTeam) diff = awayScore - homeScore;
  // Draw or unrecognized winner string: diff stays 0, rule confidence falls back to 0.5.

  const ruleConfidence = clamp(0.5 + diff * TEAM_FACTOR_WEIGHT, TEAM_CONFIDENCE_MIN, TEAM_CONFIDENCE_MAX);
  const geminiConfidence = clamp(Number(prediction.confidence ?? 0.5), 0, 1);
  return clamp(ruleConfidence * RULE_BLEND + geminiConfidence * GEMINI_BLEND, TEAM_CONFIDENCE_MIN, TEAM_CONFIDENCE_MAX);
};

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
- confidence: numeric 0-1 (your own holistic read).
- reasoning: 2-4 concise sentences covering the key factors (form, injuries, head-to-head, home advantage).
- homeOffenseAboveAverage / awayOffenseAboveAverage: boolean — is this team's goal-scoring output above the World Cup field average?
- homeDefenseBelowAverage / awayDefenseBelowAverage: boolean — is this team's defense WEAKER (more goals conceded) than the World Cup field average?
- homeFormWins / awayFormWins: integer 0-5 — how many of this team's last 5 competitive matches were wins?
- topPicks: EXACTLY 3 player prop picks for this match, each with: player, statLabel (one of: Goals, Shots on Target, Assists, Saves, Tackles, Cards), side (Over/Under), line (must end in .5), reason (max 16 words), last5Hits (integer 0-5 — in how many of this player's last 5 relevant games would this exact side/line have hit?).

Output JSON only: {"predictions":[{"gameId":"...","predictedWinner":"...","confidence":0.0,"reasoning":"...","homeOffenseAboveAverage":true,"awayOffenseAboveAverage":false,"homeDefenseBelowAverage":false,"awayDefenseBelowAverage":true,"homeFormWins":3,"awayFormWins":2,"topPicks":[{"player":"...","statLabel":"...","side":"Over","line":"0.5","reason":"...","last5Hits":3}]}]}
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
    const isoCodePattern = /^[A-Za-z]{2}$/;
    const matches: ScheduleMatch[] = (scheduleParsed.matches ?? [])
      .filter(
        // Excludes knockout-stage placeholders ("TBD" teams, "N/A" codes) where the bracket
        // hasn't resolved yet, not just malformed responses — both fail the 2-letter ISO check.
        (m) =>
          typeof m?.kickoff === "string" &&
          typeof m?.homeTeam === "string" &&
          typeof m?.awayTeam === "string" &&
          isoCodePattern.test(m?.homeCountryCode ?? "") &&
          isoCodePattern.test(m?.awayCountryCode ?? "")
      )
      .map((m) => ({
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
        .map((match): WorldCupGame | null => {
          const prediction = predictionsById.get(match.gameId);
          if (!prediction) return null;
          const scoredPicks: ScoredWorldCupPick[] = (prediction.topPicks ?? []).slice(0, 3).map((pick) => ({
            ...pick,
            confidence: scorePick(pick.last5Hits),
          }));
          return {
            ...match,
            predictedWinner: prediction.predictedWinner,
            confidence: scoreMatch(prediction, match.homeTeam, match.awayTeam),
            reasoning: prediction.reasoning ?? "",
            topPicks: scoredPicks,
            factors: {
              homeOffenseAboveAverage: prediction.homeOffenseAboveAverage,
              awayOffenseAboveAverage: prediction.awayOffenseAboveAverage,
              homeDefenseBelowAverage: prediction.homeDefenseBelowAverage,
              awayDefenseBelowAverage: prediction.awayDefenseBelowAverage,
              homeFormWins: prediction.homeFormWins,
              awayFormWins: prediction.awayFormWins,
              geminiConfidence: prediction.confidence,
            },
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
              factors: g.factors,
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
