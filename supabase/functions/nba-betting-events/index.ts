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
    const headerDate = req.headers.get("x-date") ?? undefined;
    let bodyDate: string | undefined;

    if (req.method !== "GET") {
      try {
        const body = await req.json();
        bodyDate = typeof body?.date === "string" ? body.date : undefined;
      } catch (_) {
        bodyDate = undefined;
      }
    }

    const date = url.searchParams.get("date") ?? headerDate ?? bodyDate;
    if (!date) {
      return new Response(JSON.stringify({ error: "Missing date." }), {
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

    const apiUrl = `https://api.sportsdata.io/v3/nba/odds/json/BettingEventsByDate/${date}`;
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
    return new Response(JSON.stringify({ date, data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
