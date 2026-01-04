const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const headerGameId = req.headers.get("x-game-id") ?? undefined;
    let bodyGameId: string | undefined;
    let includeParam: string | undefined;

    if (req.method !== "GET") {
      try {
        const body = await req.json();
        bodyGameId = typeof body?.gameId === "string" ? body.gameId : undefined;
        includeParam = typeof body?.include === "string" ? body.include : undefined;
      } catch (_) {
        bodyGameId = undefined;
      }
    }

    const gameId =
      url.searchParams.get("gameId") ??
      headerGameId ??
      bodyGameId;

    if (!gameId) {
      return new Response(JSON.stringify({ error: "Missing gameId." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("SPORTSDATA_IO_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Missing SPORTSDataIO key." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const includeValue = url.searchParams.get("include") ?? includeParam;
    const includeSuffix = includeValue ? `?include=${includeValue}` : "";
    const apiUrl = `https://api.sportsdata.io/v3/nba/odds/json/BettingMarketsByGameID/${gameId}${includeSuffix}`;

    const response = await fetch(apiUrl, {
      headers: {
        "Ocp-Apim-Subscription-Key": apiKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(JSON.stringify({ error: errorText }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    return new Response(JSON.stringify({ gameId, data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
