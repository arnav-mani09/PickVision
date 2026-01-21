import React, { useMemo, useState } from 'react';
import { Card } from './ui/Card';
import { DailyProps, type DailyProp } from './DailyProps';

const sportsTabs = [
  {
    id: 'nba',
    label: 'NBA',
    image: '/season.webp',
    blurb: 'Daily props and matchup-driven angles for tonight.',
  },
  {
    id: 'nfl',
    label: 'NFL',
    image:
      'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1200&q=80',
    blurb: 'Game-day insights, usage trends, and injury watch.',
  },
  {
    id: 'mlb',
    label: 'MLB',
    image:
      'https://images.unsplash.com/photo-1508344928928-7165b5cf7b87?auto=format&fit=crop&w=1200&q=80',
    blurb: 'Pitching splits and batter prop watchlists.',
  },
  {
    id: 'nhl',
    label: 'NHL',
    image:
      'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=1200&q=80',
    blurb: 'Line combos, goalie trends, and shot volume props.',
  },
];

export const PicksOfDay: React.FC = () => {
  const [activeTab, setActiveTab] = useState(sportsTabs[0]);
  const [topPropsByLeague, setTopPropsByLeague] = useState<Record<string, DailyProp[]>>({});
  const [activeParlaySize, setActiveParlaySize] = useState<2 | 3 | 4 | 6 | null>(null);

  const combinedTopProps = useMemo(() => {
    const allProps = Object.entries(topPropsByLeague).flatMap(([leagueId, props]) =>
      props.map((prop) => ({ ...prop, leagueId }))
    );
    const deduped = new Map<string, (DailyProp & { leagueId: string })>();
    allProps.forEach((prop) => {
      const key = `${prop.leagueId}|${prop.player}|${prop.statLabel}|${prop.line}|${prop.side ?? ''}`;
      const existing = deduped.get(key);
      const existingScore = existing?.confidence ?? 0;
      const nextScore = prop.confidence ?? 0;
      if (!existing || nextScore > existingScore) {
        deduped.set(key, prop);
      }
    });
    return Array.from(deduped.values()).sort(
      (a, b) => (b.confidence ?? 0) - (a.confidence ?? 0)
    );
  }, [topPropsByLeague]);

  const parlayProps = useMemo(() => {
    if (!activeParlaySize) return [];
    return combinedTopProps.slice(0, activeParlaySize);
  }, [activeParlaySize, combinedTopProps]);

  return (
    <Card>
      <div className="p-6 border-b border-gray-800">
        <h2 className="text-2xl font-semibold text-purple-300">Picks of the Day</h2>
        <p className="text-sm text-gray-400 mt-1">
          Multi-sport AI tabs for daily props and parlay builds. More leagues will be added.
        </p>
      </div>
      <div className="p-6 space-y-6">
        <div className="flex flex-wrap gap-3">
          {sportsTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
                activeTab.id === tab.id
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div
          className="relative h-40 rounded-xl overflow-hidden border border-gray-800"
          style={{
            backgroundImage: `url(${activeTab.image})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div className="absolute inset-0 bg-black/60" />
          <div className="absolute bottom-4 left-4">
            <h3 className="text-lg font-semibold text-white">{activeTab.label} Spotlight</h3>
            <p className="text-sm text-gray-200">{activeTab.blurb}</p>
          </div>
        </div>

        <DailyProps
          key={activeTab.id}
          leagueId={activeTab.id}
          leagueLabel={activeTab.label}
          onPropsLoaded={(props) =>
            setTopPropsByLeague((prev) => ({
              ...prev,
              [activeTab.id]: props,
            }))
          }
        />
        <div className="bg-gray-900/60 border border-gray-800 rounded-lg p-5">
          <h4 className="text-lg font-semibold text-purple-300">Parlay Builder</h4>
          <p className="text-sm text-gray-400 mt-2">
            Auto-build parlays from the best picks across all leagues.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-gray-300">
            <button
              type="button"
              onClick={() => setActiveParlaySize(6)}
              className="rounded-lg border border-gray-700 bg-black/40 p-3 text-left transition hover:border-purple-500/60 hover:bg-purple-500/10"
            >
              <p className="font-semibold text-white">6-Man Flex</p>
              <p className="text-xs text-gray-400 mt-1">Balanced risk build</p>
            </button>
            <button
              type="button"
              onClick={() => setActiveParlaySize(2)}
              className="rounded-lg border border-gray-700 bg-black/40 p-3 text-left transition hover:border-purple-500/60 hover:bg-purple-500/10"
            >
              <p className="font-semibold text-white">2-Man Power</p>
              <p className="text-xs text-gray-400 mt-1">High conviction plays</p>
            </button>
            <button
              type="button"
              onClick={() => setActiveParlaySize(4)}
              className="rounded-lg border border-gray-700 bg-black/40 p-3 text-left transition hover:border-purple-500/60 hover:bg-purple-500/10"
            >
              <p className="font-semibold text-white">4-Man Flex</p>
              <p className="text-xs text-gray-400 mt-1">Mid-range combos</p>
            </button>
            <button
              type="button"
              onClick={() => setActiveParlaySize(3)}
              className="rounded-lg border border-gray-700 bg-black/40 p-3 text-left transition hover:border-purple-500/60 hover:bg-purple-500/10"
            >
              <p className="font-semibold text-white">3-Man Power</p>
              <p className="text-xs text-gray-400 mt-1">Aggressive odds</p>
            </button>
          </div>
          {activeParlaySize && (
            <div className="mt-5 rounded-lg border border-purple-500/30 bg-black/50 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-purple-200">
                  {activeParlaySize}-Leg Premade Parlay (All Leagues)
                </p>
                <button
                  type="button"
                  onClick={() => setActiveParlaySize(null)}
                  className="text-xs text-purple-300 hover:text-purple-200"
                >
                  Clear
                </button>
              </div>
              {parlayProps.length === 0 ? (
                <p className="mt-3 text-xs text-gray-400">Loading top props…</p>
              ) : (
                <div className="mt-3 space-y-2 text-sm text-gray-200">
                  {parlayProps.map((prop) => (
                    <div
                      key={`parlay-${prop.id}`}
                      className="rounded-md border border-gray-700/60 bg-gray-900/60 px-3 py-2"
                    >
                      <p className="font-semibold text-white">{prop.player}</p>
                      <p className="text-xs text-gray-300">
                        {prop.statLabel} • {prop.side} • {prop.line}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};
