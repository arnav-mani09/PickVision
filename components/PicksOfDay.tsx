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
  const [topProps, setTopProps] = useState<DailyProp[]>([]);
  const [activeParlaySize, setActiveParlaySize] = useState<2 | 3 | 4 | 6 | null>(null);

  const parlayProps = useMemo(() => {
    if (!activeParlaySize) return [];
    return topProps.slice(0, activeParlaySize);
  }, [activeParlaySize, topProps]);

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

        {activeTab.id === 'nba' ? (
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
        ) : (
          <div className="relative h-40 rounded-xl border border-purple-500/30 bg-black/70 shadow-[0_0_24px_rgba(168,85,247,0.35)]">
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-purple-900/20 via-black/70 to-black/90" />
            <div className="relative flex h-full flex-col items-center justify-center text-center">
              <p className="text-sm uppercase tracking-[0.35em] text-purple-200/70">Coming Soon</p>
              <h3 className="mt-2 text-xl font-semibold text-white">
                {activeTab.label} Props in the Works
              </h3>
              <p className="mt-1 text-xs text-gray-400">
                We&apos;re building the next set of AI picks.
              </p>
            </div>
          </div>
        )}

        {activeTab.id === 'nba' ? (
          <>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-gray-900/60 border border-gray-800 rounded-lg p-5">
                <h4 className="text-lg font-semibold text-purple-300">AI Personal Props</h4>
                <p className="text-sm text-gray-400 mt-2">
                  Coming soon: player-specific props tailored to your risk profile and lineup preferences.
                </p>
                <ul className="mt-4 space-y-2 text-sm text-gray-300">
                  <li>• Usage spikes and matchup boosts</li>
                  <li>• Injury-adjusted volume projections</li>
                  <li>• Pace-driven totals and splits</li>
                </ul>
              </div>
              <div className="bg-gray-900/60 border border-gray-800 rounded-lg p-5">
                <h4 className="text-lg font-semibold text-purple-300">Parlay Builder</h4>
                <p className="text-sm text-gray-400 mt-2">
                  PickVision will auto-build full parlays once daily scans are live.
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
                        {activeParlaySize}-Leg Premade Parlay
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
            <DailyProps onPropsLoaded={setTopProps} />
          </>
        ) : (
          <div className="rounded-2xl border border-purple-500/30 bg-black/70 p-8 text-center shadow-[0_0_30px_rgba(168,85,247,0.35)]">
            <p className="text-xs uppercase tracking-[0.35em] text-purple-200/70">Coming Soon</p>
            <h4 className="mt-3 text-xl font-semibold text-white">
              {activeTab.label} Picks Are On The Way
            </h4>
            <p className="mt-2 text-sm text-gray-400">
              We&apos;re building league-specific models for these props next.
            </p>
          </div>
        )}
      </div>
    </Card>
  );
};
