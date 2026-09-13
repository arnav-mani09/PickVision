const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// NFL plays in weekly windows (Thu/Sun/Mon), not daily like a tournament — look a full week ahead
// so the whole slate shows up regardless of which day of the week this is called.
const WINDOW_DAYS = 7;

// Games can be cached days before kickoff. Rosters change (trades, waivers) in that window, so a
// prediction generated once and never touched again can go stale with a wrong player/team for days.
// Re-run predictions for any not-yet-played game whose cached row is older than this.
const REFRESH_AFTER_MS = 24 * 60 * 60 * 1000;

const NFL_STAT_LABELS = [
  "Passing Yards",
  "Passing TDs",
  "Completions",
  "Interceptions",
  "Rushing Yards",
  "Rushing TDs",
  "Receiving Yards",
  "Receptions",
  "Receiving TDs",
  "Longest Reception",
  "Sacks",
  "Tackles + Assists",
  "Kicking Points",
];

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
};

type NflPick = {
  player: string;
  statLabel: string;
  side: "Over" | "Under";
  line: string;
  reason: string;
  last5Hits?: number;
};

type ScoredNflPick = NflPick & { confidence: number };

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
  topPicks: NflPick[];
  homeOffenseAboveAverage?: boolean;
  awayOffenseAboveAverage?: boolean;
  homeDefenseBelowAverage?: boolean;
  awayDefenseBelowAverage?: boolean;
  homeFormWins?: number;
  awayFormWins?: number;
};

type NflGame = ScheduleMatch &
  Omit<Prediction, "gameId" | "topPicks"> & {
    topPicks: ScoredNflPick[];
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

  const ruleConfidence = clamp(0.5 + diff * TEAM_FACTOR_WEIGHT, TEAM_CONFIDENCE_MIN, TEAM_CONFIDENCE_MAX);
  const geminiConfidence = clamp(Number(prediction.confidence ?? 0.5), 0, 1);
  return clamp(ruleConfidence * RULE_BLEND + geminiConfidence * GEMINI_BLEND, TEAM_CONFIDENCE_MIN, TEAM_CONFIDENCE_MAX);
};

const addDays = (dateStr: string, days: number): string => {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const toGameId = (homeTeam: string, awayTeam: string, kickoffIso: string): string => {
  const dateOnly = kickoffIso.slice(0, 10);
  return `${slugify(homeTeam)}-${slugify(awayTeam)}-${dateOnly}`;
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
You are an NFL schedule lookup assistant. Use web search to find the OFFICIAL NFL game schedule for games kicking off between ${date} and ${endDate} (inclusive), in UTC.

Rules:
- Only include real, officially scheduled NFL regular season or postseason games in that window.
- Each game MUST include: kickoff (ISO 8601 UTC datetime), homeTeam (full team name, e.g. "Kansas City Chiefs"), awayTeam (full team name).
- If there are no NFL games in this window, return an empty array.
- Output JSON only: {"matches":[...]}.
`;

const buildPredictionPrompt = (matches: ScheduleMatch[]) => `
You are an expert NFL analyst. Use web search to research current form, injuries, head-to-head history, and depth chart news for each of the following NFL games, then predict a winner for each.

ROSTER ACCURACY IS CRITICAL: NFL rosters change constantly via trades, free agency, and waivers, and
your training data can be out of date on this. Do NOT rely on prior/remembered knowledge of which
team a player is on. Before naming any player in topPicks, use web search to confirm which team
they are CURRENTLY on as of right now. Every player you list in a game's topPicks MUST currently be
on the active roster of that game's homeTeam or awayTeam — if search results are unclear, conflicting,
or you cannot confirm a player's current team, do not use that player; pick a different one you can
verify instead.

Games:
${matches.map((m, i) => `${i + 1}. ${m.homeTeam} vs ${m.awayTeam} (kickoff: ${m.kickoff}, gameId: ${m.gameId})`).join("\n")}

For EACH game, provide:
- gameId: must exactly match the gameId given for that game above.
- predictedWinner: the full team name predicted to win.
- confidence: numeric 0-1 (your own holistic read).
- reasoning: 2-4 concise sentences covering the key factors (form, injuries, matchup, home field advantage).
- homeOffenseAboveAverage / awayOffenseAboveAverage: boolean — is this team's offensive output above the current NFL league average?
- homeDefenseBelowAverage / awayDefenseBelowAverage: boolean — is this team's defense WEAKER (allows more yards/points) than the current NFL league average?
- homeFormWins / awayFormWins: integer 0-5 — how many of this team's last 5 games were wins?
- topPicks: EXACTLY 3 player prop picks for this game, each with: player, statLabel (one of: ${NFL_STAT_LABELS.join(", ")}), side (Over/Under), line (must end in .5), reason (max 16 words), last5Hits (integer 0-5 — in how many of this player's last 5 relevant games would this exact side/line have hit?).

Output JSON only: {"predictions":[{"gameId":"...","predictedWinner":"...","confidence":0.0,"reasoning":"...","homeOffenseAboveAverage":true,"awayOffenseAboveAverage":false,"homeDefenseBelowAverage":false,"awayDefenseBelowAverage":true,"homeFormWins":3,"awayFormWins":2,"topPicks":[{"player":"...","statLabel":"...","side":"Over","line":"0.5","reason":"...","last5Hits":3}]}]}
`;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Gemini's "high demand" 503s observed in production reliably clear within a few seconds — retry
// the whole call+parse step rather than just the HTTP request, since a malformed/empty parse is
// just as likely to be a transient blip as an outright HTTP error.
const RETRY_DELAYS_MS = [1500, 3000];
const withRetry = async <T>(fn: () => Promise<T>): Promise<T> => {
  let lastError: unknown;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < RETRY_DELAYS_MS.length) await sleep(RETRY_DELAYS_MS[attempt]);
    }
  }
  throw lastError;
};

const callGemini = async (geminiKey: string, prompt: string): Promise<string> => {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${geminiKey}`,
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
    const scheduleParsed = await withRetry(async () => {
      const scheduleRaw = await callGemini(geminiKey, buildSchedulePrompt(date, endDate));
      return extractJson<{ matches: Omit<ScheduleMatch, "gameId">[] }>(scheduleRaw);
    });
    const matches: ScheduleMatch[] = (scheduleParsed.matches ?? [])
      .filter(
        (m) => typeof m?.kickoff === "string" && typeof m?.homeTeam === "string" && typeof m?.awayTeam === "string"
      )
      .map((m) => ({
        ...m,
        gameId: toGameId(m.homeTeam, m.awayTeam, m.kickoff),
      }));

    if (matches.length === 0) {
      return new Response(JSON.stringify({ games: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ids = matches.map((m) => m.gameId);
    const cacheResponse = await fetch(
      `${supabaseUrl}/rest/v1/nfl_picks?game_id=in.(${ids.join(",")})&select=*`,
      {
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
        },
      }
    );
    const cachedRows: any[] = cacheResponse.ok ? await cacheResponse.json() : [];
    const now = Date.now();
    const isStale = (row: any): boolean => {
      const kickoffTime = new Date(row.kickoff).getTime();
      if (!Number.isNaN(kickoffTime) && kickoffTime <= now) return false; // already played — leave it
      const createdAt = new Date(row.created_at).getTime();
      return Number.isNaN(createdAt) || now - createdAt >= REFRESH_AFTER_MS;
    };
    const freshRows = cachedRows.filter((row) => !isStale(row));
    const freshById = new Map(freshRows.map((row) => [row.game_id, row]));

    const uncachedMatches = matches.filter((m) => !freshById.has(m.gameId));

    let newGames: NflGame[] = [];
    if (uncachedMatches.length > 0) {
      const predictionParsed = await withRetry(async () => {
        const predictionRaw = await callGemini(geminiKey, buildPredictionPrompt(uncachedMatches));
        return extractJson<{ predictions: Prediction[] }>(predictionRaw);
      });
      const predictionsById = new Map((predictionParsed.predictions ?? []).map((p) => [p.gameId, p]));

      newGames = uncachedMatches
        .map((match): NflGame | null => {
          const prediction = predictionsById.get(match.gameId);
          if (!prediction) return null;
          const scoredPicks: ScoredNflPick[] = (prediction.topPicks ?? []).slice(0, 3).map((pick) => ({
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
        .filter((g): g is NflGame => g !== null);

      if (newGames.length > 0) {
        // merge-duplicates (not ignore-duplicates) so a stale row actually gets overwritten with the
        // freshly re-researched prediction instead of silently keeping the old, possibly wrong one.
        await fetch(`${supabaseUrl}/rest/v1/nfl_picks?on_conflict=game_id`, {
          method: "POST",
          headers: {
            apikey: serviceRoleKey,
            Authorization: `Bearer ${serviceRoleKey}`,
            "Content-Type": "application/json",
            Prefer: "resolution=merge-duplicates,return=minimal",
          },
          body: JSON.stringify(
            newGames.map((g) => ({
              game_id: g.gameId,
              kickoff: g.kickoff,
              home_team: g.homeTeam,
              away_team: g.awayTeam,
              predicted_winner: g.predictedWinner,
              confidence: g.confidence,
              reasoning: g.reasoning,
              top_picks: g.topPicks,
              factors: g.factors,
              created_at: new Date().toISOString(),
            }))
          ),
        });
      }
    }

    const cachedGames: NflGame[] = freshRows.map((row) => ({
      gameId: row.game_id,
      kickoff: row.kickoff,
      homeTeam: row.home_team,
      awayTeam: row.away_team,
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
