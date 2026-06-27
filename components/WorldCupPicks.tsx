import React, { useEffect, useMemo, useState } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { fetchWorldCupPicks } from '../services/standingsService';
import type { WorldCupGame } from '../types';

const formatPstDate = (date: Date = new Date()) => {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date);
};

const MAX_VISIBLE_GAMES = 6;
// Scotland/England/Wales play as separate FIFA nations but share the "GB" ISO code,
// so the country-code flag algorithm can't tell them apart. Key off the team name instead.
const HOME_NATION_FLAGS: Record<string, string> = {
  scotland: '\u{1F3F4}\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}',
  england: '\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}',
  wales: '\u{1F3F4}\u{E0067}\u{E0062}\u{E0077}\u{E006C}\u{E0073}\u{E007F}',
};
// No live match-status feed, so "completed" is estimated as kickoff + ~2h (regulation + stoppage/halftime),
// then kept visible for the requested 4h grace period on top of that.
const REMOVAL_WINDOW_MS = (2 + 4) * 60 * 60 * 1000;

const flagEmoji = (teamName: string, countryCode?: string): string => {
  const special = HOME_NATION_FLAGS[teamName.trim().toLowerCase()];
  if (special) return special;
  if (!countryCode || countryCode.length !== 2) return '🏳️';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
};

const formatKickoff = (iso: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(date);
};

export const WorldCupPicks: React.FC = () => {
  const [games, setGames] = useState<WorldCupGame[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasTechnicalIssue, setHasTechnicalIssue] = useState(false);
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const visibleGames = useMemo(() => {
    return [...games]
      .filter((game) => {
        const kickoffTime = new Date(game.kickoff).getTime();
        if (Number.isNaN(kickoffTime)) return true;
        return now < kickoffTime + REMOVAL_WINDOW_MS;
      })
      .sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime())
      .slice(0, MAX_VISIBLE_GAMES);
  }, [games, now]);

  useEffect(() => {
    const loadGames = async () => {
      setIsLoading(true);
      setError(null);
      setHasTechnicalIssue(false);

      const dateLabel = formatPstDate();
      const cacheKey = `pickvision:world-cup-picks:${dateLabel}`;

      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          try {
            const parsed = JSON.parse(cached) as { games: WorldCupGame[] };
            if (Array.isArray(parsed.games) && parsed.games.length > 0) {
              setGames(parsed.games);
              setIsLoading(false);
              return;
            }
          } catch (_) {
            // Ignore invalid cache.
          }
        }

        const response = await fetchWorldCupPicks(dateLabel);
        const fetchedGames: WorldCupGame[] = Array.isArray(response?.games) ? response.games : [];
        setGames(fetchedGames);
        localStorage.setItem(cacheKey, JSON.stringify({ games: fetchedGames }));
      } catch (fetchError) {
        const message = fetchError instanceof Error ? fetchError.message : 'Failed to load matches.';
        if (
          message.includes('429') ||
          message.toLowerCase().includes('quota') ||
          message.toLowerCase().includes('not json') ||
          message.includes('403') ||
          message.toLowerCase().includes('permission') ||
          message.toLowerCase().includes('suspended')
        ) {
          setHasTechnicalIssue(true);
        } else {
          setError(message);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadGames();
  }, []);

  const reveal = (gameId: string) => {
    setRevealedIds((prev) => {
      const next = new Set(prev);
      next.add(gameId);
      return next;
    });
  };

  if (isLoading) {
    return (
      <Card>
        <div className="p-6">
          <p className="text-gray-400 text-sm">Loading World Cup matches...</p>
        </div>
      </Card>
    );
  }

  if (hasTechnicalIssue) {
    return (
      <div className="rounded-2xl border border-purple-500/30 bg-black/70 p-8 text-center shadow-[0_0_30px_rgba(168,85,247,0.35)]">
        <p className="text-xs uppercase tracking-[0.35em] text-purple-200/70">Technical Difficulties</p>
        <h4 className="mt-3 text-lg font-semibold text-white">We&apos;re tuning today&apos;s match feed.</h4>
        <p className="mt-2 text-sm text-gray-400">Please check back soon. Your data is safe.</p>
      </div>
    );
  }

  if (error) {
    return <p className="text-red-400 text-sm">{error}</p>;
  }

  if (visibleGames.length === 0) {
    return (
      <div className="rounded-2xl border border-purple-500/30 bg-black/70 p-8 text-center shadow-[0_0_30px_rgba(168,85,247,0.35)]">
        <p className="text-xs uppercase tracking-[0.35em] text-purple-200/70">No Matches Found</p>
        <h4 className="mt-3 text-lg font-semibold text-white">No World Cup matches in the next few days.</h4>
        <p className="mt-2 text-sm text-gray-400">Check back as the schedule updates.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {visibleGames.map((game) => {
        const isRevealed = revealedIds.has(game.id);
        return (
          <div
            key={game.id}
            className="rounded-2xl border border-purple-500/30 bg-black/70 p-5 shadow-[0_0_24px_rgba(168,85,247,0.25)] space-y-4"
          >
            <p className="text-center text-xs text-gray-400">{formatKickoff(game.kickoff)}</p>

            <div className="flex items-center justify-center gap-4 text-center">
              <div className="flex-1">
                <div className="text-4xl">{flagEmoji(game.homeTeam, game.homeCountryCode)}</div>
                <p className="mt-1 font-semibold text-white">{game.homeTeam}</p>
              </div>
              <span className="text-purple-300 font-bold text-sm">VS</span>
              <div className="flex-1">
                <div className="text-4xl">{flagEmoji(game.awayTeam, game.awayCountryCode)}</div>
                <p className="mt-1 font-semibold text-white">{game.awayTeam}</p>
              </div>
            </div>

            {!isRevealed ? (
              <Button onClick={() => reveal(game.id)} className="w-full">
                Reveal Predicted Winner
              </Button>
            ) : (
              <>
                <div className="rounded-lg bg-purple-900/30 border border-purple-500/40 p-4 text-center">
                  <p className="text-xs uppercase tracking-wide text-purple-200/80">Predicted Winner</p>
                  <p className="text-xl font-bold text-white mt-1">{game.predictedWinner}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {Math.round((game.confidence ?? 0) * 100)}% confidence
                  </p>
                </div>
                <div className="flex justify-end">
                  <details className="rounded-lg border border-purple-500/30 bg-gray-900/40 p-3 text-right">
                    <summary className="cursor-pointer text-purple-300 font-semibold text-sm">
                      Show Reasoning
                    </summary>
                    <p className="mt-3 text-sm text-gray-300 text-left whitespace-pre-wrap">
                      {game.reasoning}
                    </p>
                  </details>
                </div>
              </>
            )}

            <div>
              <h4 className="text-sm font-semibold text-purple-300 mb-2">Top 3 PrizePicks</h4>
              <div className="space-y-2">
                {game.topPicks.map((pick, index) => (
                  <div
                    key={`${game.id}-pick-${index}`}
                    className="rounded-md border border-gray-700/60 bg-gray-900/60 px-3 py-2"
                  >
                    <p className="font-semibold text-white text-sm">{pick.player}</p>
                    <p className="text-xs text-gray-300">
                      {pick.statLabel} • {pick.side} {pick.line}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{pick.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
