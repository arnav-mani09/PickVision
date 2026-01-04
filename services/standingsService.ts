import { supabase } from './supabaseClient';

const getFunctionAuthHeaders = async (): Promise<Record<string, string> | undefined> => {
  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (accessToken) {
    return {
      Authorization: `Bearer ${accessToken}`,
      ...(anonKey ? { apikey: anonKey } : {}),
    };
  }
  if (!anonKey) return undefined;
  return {
    Authorization: `Bearer ${anonKey}`,
    apikey: anonKey,
  };
};

export const fetchNbaStandings = async (season?: string) => {
  const headers = await getFunctionAuthHeaders();
  const { data, error } = await supabase.functions.invoke('nba-standings', {
    method: 'POST',
    body: season ? { season } : undefined,
    headers,
  });

  if (error) {
    throw new Error(error.message);
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
    throw new Error(error.message);
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
    throw new Error(error.message);
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
    throw new Error(error.message);
  }

  return data;
};
