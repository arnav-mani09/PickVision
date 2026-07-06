import { supabase } from './supabaseClient';

const getFunctionAuthHeaders = async (): Promise<Record<string, string> | undefined> => {
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (!anonKey) return undefined;
  return {
    Authorization: `Bearer ${anonKey}`,
    apikey: anonKey,
  };
};

// supabase-js collapses a non-2xx edge function response into a generic
// "Edge Function returned a non-2xx status code" message, discarding the actual
// { error: "..." } body our functions return. Unwrap it so real causes (missing
// keys, upstream 429s, etc.) reach the UI instead of that generic string.
const unwrapFunctionError = async (error: unknown): Promise<Error> => {
  const context = (error as { context?: unknown })?.context;
  if (context instanceof Response) {
    try {
      const body = await context.clone().json();
      if (body?.error) return new Error(String(body.error));
    } catch (_) {
      // Body wasn't JSON (or already consumed) — fall back to the generic message below.
    }
  }
  return error instanceof Error ? error : new Error(String(error));
};

export const fetchNbaStandings = async (season?: string) => {
  const headers = await getFunctionAuthHeaders();
  const { data, error } = await supabase.functions.invoke('nba-standings', {
    method: 'POST',
    body: season ? { season } : undefined,
    headers,
  });

  if (error) {
    throw await unwrapFunctionError(error);
  }

  return data;
};

export const fetchNbaBettingMarketsByGame = async (
  gameId: string,
  include?: 'available' | 'unlisted'
) => {
  const headers = await getFunctionAuthHeaders();
  const { data, error } = await supabase.functions.invoke('nba-betting-markets', {
    method: 'POST',
    body: { gameId, include },
    headers,
  });

  if (error) {
    throw await unwrapFunctionError(error);
  }

  return data;
};

export const fetchNbaBettingEventsByDate = async (date: string) => {
  const headers = await getFunctionAuthHeaders();
  const { data, error } = await supabase.functions.invoke('nba-betting-events', {
    method: 'POST',
    body: { date },
    headers,
  });

  if (error) {
    throw await unwrapFunctionError(error);
  }

  return data;
};

export const fetchNbaPlayerPropsByGame = async (
  gameId: string,
  include?: 'available' | 'unlisted',
  sportsbookGroup?: string
) => {
  const headers = await getFunctionAuthHeaders();
  const { data, error } = await supabase.functions.invoke('nba-player-props', {
    method: 'POST',
    body: { gameId, include, sportsbookGroup },
    headers,
  });

  if (error) {
    throw await unwrapFunctionError(error);
  }

  return data;
};

export const fetchDailyPicks = async (league: string, date: string) => {
  const headers = await getFunctionAuthHeaders();
  const { data, error } = await supabase.functions.invoke('generate-daily-picks', {
    method: 'POST',
    body: { league, date },
    headers,
  });

  if (error) {
    throw await unwrapFunctionError(error);
  }

  return data;
};

export const fetchWorldCupPicks = async (date: string) => {
  const headers = await getFunctionAuthHeaders();
  const { data, error } = await supabase.functions.invoke('generate-world-cup-picks', {
    method: 'POST',
    body: { date },
    headers,
  });

  if (error) {
    throw await unwrapFunctionError(error);
  }

  return data;
};
