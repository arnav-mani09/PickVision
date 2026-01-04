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
    const headerSeason = req.headers.get("x-season") ?? undefined;
    let bodySeason: string | undefined;
    if (req.method !== "GET") {
      try {
        const body = await req.json();
        bodySeason = typeof body?.season === "string" ? body.season : undefined;
      } catch (_) {
        bodySeason = undefined;
      }
    }
    const now = new Date();
    const defaultSeasonStartYear = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
    const season =
      url.searchParams.get("season") ??
      headerSeason ??
      bodySeason ??
      `${defaultSeasonStartYear}REG`;
    const apiKey = Deno.env.get("SPORTSDATA_IO_KEY");

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Missing SPORTSDataIO key." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiUrl = `https://api.sportsdata.io/v3/nba/scores/json/Standings/${season}`;
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
    return new Response(JSON.stringify({ season, data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
