import React, { useEffect, useMemo, useState } from 'react';
import { Card } from './ui/Card';
import { fetchNbaBettingEventsByDate, fetchNbaPlayerPropsByGame } from '../services/standingsService';

type DailyProp = {
  id: string;
  player: string;
  stat: string;
  line: string;
  odds?: string;
  confidence?: number;
  matchup?: string;
};

const formatPstDate = () => {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(new Date());
};

const getValue = (value: unknown): string | undefined => {
  if (value === null || value === undefined) return undefined;
  return String(value);
};

const parseProbability = (value: unknown): number | undefined => {
  const num = typeof value === 'number' ? value : Number(value);
  if (Number.isFinite(num)) return num;
  return undefined;
};

export const DailyProps: React.FC = () => {
  const [props, setProps] = useState<DailyProp[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  useEffect(() => {
    const loadProps = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const date = formatPstDate();
        const eventsResponse = await fetchNbaBettingEventsByDate(date);
        const events = Array.isArray(eventsResponse?.data) ? eventsResponse.data : [];

        const gameMap = new Map<string, string>();
        const gameIds: string[] = [];

        events.forEach((event: any) => {
          const gameId = getValue(event.GameID ?? event.GameId ?? event.ScoreID ?? event.ScoreId);
          if (!gameId) return;
          if (!gameMap.has(gameId)) {
            const away = event.AwayTeam ?? event.AwayTeamKey ?? '';
            const home = event.HomeTeam ?? event.HomeTeamKey ?? '';
            const matchup = away && home ? `${away} @ ${home}` : `Game ${gameId}`;
            gameMap.set(gameId, matchup);
            gameIds.push(gameId);
          }
        });

        const maxGames = 10;
        const selectedGames = gameIds.slice(0, maxGames);
        const allProps: DailyProp[] = [];

        for (const gameId of selectedGames) {
          try {
            const propsResponse = await fetchNbaPlayerPropsByGame(gameId, 'available');
            const markets = Array.isArray(propsResponse?.data) ? propsResponse.data : [];

            markets.forEach((market: any) => {
              const outcomes = market.BettingOutcomes ?? market.BettingOutcome ?? [];
              if (!Array.isArray(outcomes) || outcomes.length === 0) {
                const marketName = getValue(market.Name ?? market.BettingMarketTypeName) ?? 'Player Prop';
                allProps.push({
                  id: `${gameId}-${market.BettingMarketID ?? market.BettingMarketId ?? marketName}`,
                  player: getValue(market.PlayerName ?? market.Participant) ?? 'Unknown Player',
                  stat: marketName,
                  line: getValue(market.Point ?? market.Line ?? market.Value ?? 'N/A') ?? 'N/A',
                  matchup: gameMap.get(gameId),
                });
                return;
              }

              outcomes.forEach((outcome: any, index: number) => {
                const player =
                  getValue(outcome.Participant ?? outcome.PlayerName ?? outcome.Name) ??
                  getValue(market.PlayerName ?? market.Participant) ??
                  'Unknown Player';
                const stat =
                  getValue(outcome.BetType ?? outcome.MarketType ?? outcome.OutcomeType) ??
                  getValue(market.BettingMarketTypeName ?? market.Name) ??
                  'Player Prop';
                const line =
                  getValue(outcome.Point ?? outcome.Line ?? outcome.Value ?? outcome.OutcomeValue) ??
                  'N/A';
                const odds = getValue(outcome.AmericanOdds ?? outcome.Odds ?? outcome.Payout);
                const confidence =
                  parseProbability(outcome.Probability ?? outcome.ConsensusProbability) ??
                  parseProbability(outcome.ConsensusOutcome?.Probability) ??
                  parseProbability(market.ConsensusOutcome?.Probability);

                allProps.push({
                  id: `${gameId}-${market.BettingMarketID ?? market.BettingMarketId ?? market.Name}-${index}`,
                  player,
                  stat,
                  line,
                  odds,
                  confidence,
                  matchup: gameMap.get(gameId),
                });
              });
            });
          } catch (innerError) {
            console.error('Failed to load props for game', gameId, innerError);
          }
        }

        const rankedProps = allProps
          .map((item) => ({
            ...item,
            confidence: typeof item.confidence === 'number' ? item.confidence : 0,
          }))
          .sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0))
          .slice(0, 10);

        setProps(rankedProps);
        setLastUpdated(`${date} (6:00 AM PST update)`);
      } catch (fetchError) {
        setError(fetchError instanceof Error ? fetchError.message : 'Failed to load props.');
      } finally {
        setIsLoading(false);
      }
    };

    loadProps();
  }, []);

  const renderedProps = useMemo(() => props, [props]);

  return (
    <Card>
      <div className="p-6 border-b border-gray-800">
        <h3 className="text-xl font-semibold text-purple-300">Top 10 NBA Props (Daily)</h3>
        <p className="text-sm text-gray-400 mt-1">
          Ranked by available consensus probability when provided by the data feed.
        </p>
        {lastUpdated && (
          <p className="text-xs text-gray-500 mt-2">Updated daily: {lastUpdated}</p>
        )}
      </div>
      <div className="p-6">
        {isLoading && <p className="text-gray-400 text-sm">Loading today&apos;s props...</p>}
        {error && <p className="text-red-400 text-sm">{error}</p>}
        {!isLoading && !error && renderedProps.length === 0 && (
          <p className="text-gray-400 text-sm">No props available yet for today.</p>
        )}
        <div className="grid gap-4">
          {renderedProps.map((prop, index) => (
            <div
              key={prop.id}
              className="rounded-lg border border-gray-800 bg-gray-900/60 p-4"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm text-purple-300 font-semibold">#{index + 1}</span>
                {prop.matchup && (
                  <span className="text-xs text-gray-400">{prop.matchup}</span>
                )}
              </div>
              <h4 className="text-lg font-semibold text-white mt-2">{prop.player}</h4>
              <p className="text-sm text-gray-300 mt-1">
                {prop.stat} — Line: {prop.line}
              </p>
              <div className="flex flex-wrap gap-4 mt-3 text-xs text-gray-400">
                {prop.odds && <span>Odds: {prop.odds}</span>}
                <span>
                  Confidence: {prop.confidence ? `${Math.round(prop.confidence * 100)}%` : 'N/A'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};
