import React, { useEffect, useState } from 'react';
import { fetchDailyPicks } from '../services/standingsService';

type PreviewPick = {
  player: string;
  statLabel: string;
  side: string;
  line: string;
  confidence?: number;
  matchup?: string;
  reason?: string;
};

const formatPstDate = (date: Date = new Date()) => {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date);
};

const PREVIEW_LEAGUES: { id: string; label: string }[] = [
  { id: 'nfl', label: 'NFL' },
  { id: 'nba', label: 'NBA' },
];

// Public, no-login preview of the real daily picks pipeline — same cached data DailyProps.tsx
// shows behind the sign-in wall, just trimmed to 3 per league so anonymous visitors (and Google's
// crawler) see genuine, original content instead of the app being invisible until sign-in.
export const PicksPreview: React.FC = () => {
  const [picksByLeague, setPicksByLeague] = useState<Record<string, PreviewPick[]>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const dateLabel = formatPstDate();
      const results = await Promise.all(
        PREVIEW_LEAGUES.map(async (league) => {
          try {
            const response = await fetchDailyPicks(league.id, dateLabel);
            const raw = Array.isArray(response?.picks) ? response.picks : [];
            const cleaned: PreviewPick[] = raw
              .filter(
                (p: any) => p.player && p.statLabel && (p.side === 'Over' || p.side === 'Under') && p.line
              )
              .sort((a: any, b: any) => (b.confidence ?? 0) - (a.confidence ?? 0))
              .slice(0, 3)
              .map((p: any) => ({
                player: p.player,
                statLabel: p.statLabel,
                side: p.side,
                line: p.line,
                confidence: p.confidence,
                matchup: p.matchup,
                reason: p.reason,
              }));
            return [league.id, cleaned] as const;
          } catch (_) {
            return [league.id, []] as const;
          }
        })
      );
      if (cancelled) return;
      setPicksByLeague(Object.fromEntries(results));
      setIsLoading(false);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section id="picks-preview" className="px-6 py-16 md:py-20 bg-gradient-to-b from-gray-950 to-black">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-white">Today&apos;s AI Picks</h2>
        <p className="mt-3 text-gray-400 max-w-2xl">
          A live sample of PickVision&apos;s AI-generated player props, refreshed daily. Sign in free
          for the full Top 10 in every league plus game-by-game win predictions.
        </p>
        <p className="mt-2 text-xs text-gray-500 max-w-2xl">
          The confidence percentage on each pick is derived from how often that exact side and line
          would have hit across the player&apos;s last five relevant games — it&apos;s a signal of
          recent strength, not a guarantee.
        </p>
        <div className="mt-8 grid md:grid-cols-2 gap-6">
          {PREVIEW_LEAGUES.map((league) => (
            <div key={league.id} className="rounded-xl border border-white/10 bg-black/60 p-6">
              <h3 className="text-lg font-semibold text-purple-300">{league.label} Top Picks</h3>
              {isLoading ? (
                <p className="mt-4 text-sm text-gray-500">Loading today&apos;s picks...</p>
              ) : (picksByLeague[league.id]?.length ?? 0) === 0 ? (
                <p className="mt-4 text-sm text-gray-500">
                  Check back soon for today&apos;s {league.label} picks.
                </p>
              ) : (
                <div className="mt-4 space-y-3">
                  {picksByLeague[league.id].map((pick, index) => (
                    <div
                      key={`${league.id}-${index}`}
                      className="rounded-lg border border-gray-800 bg-gray-900/60 px-4 py-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-white text-sm">{pick.player}</p>
                        {pick.confidence !== undefined && (
                          <span className="text-xs text-purple-300 whitespace-nowrap">
                            {Math.round(pick.confidence * 100)}%
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-300 mt-1">
                        {pick.statLabel} • {pick.side} {pick.line}
                        {pick.matchup ? ` • ${pick.matchup}` : ''}
                      </p>
                      {pick.reason && (
                        <p className="text-xs text-gray-500 mt-1.5">{pick.reason}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
