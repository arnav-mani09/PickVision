import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { getDailyPropSuggestions } from '../services/geminiService';

export type DailyProp = {
  id: string;
  player: string;
  stat: string;
  statLabel: string;
  line: string;
  side?: string;
  odds?: string;
  confidence?: number;
  impliedProbability?: number;
  matchup?: string;
  reason: string;
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

const getValue = (value: unknown): string | undefined => {
  if (value === null || value === undefined) return undefined;
  return String(value);
};

const parseProbability = (value: unknown): number | undefined => {
  const num = typeof value === 'number' ? value : Number(value);
  if (Number.isFinite(num)) return num;
  return undefined;
};

const parseLineValue = (value: unknown): number | undefined => {
  if (value === null || value === undefined) return undefined;
  const match = String(value).match(/-?\d+(\.\d+)?/);
  if (!match) return undefined;
  const num = Number(match[0]);
  if (!Number.isFinite(num)) return undefined;
  return num;
};

const formatLineValue = (value?: number): string | undefined => {
  if (value === undefined) return undefined;
  const rounded = Math.round(value * 2) / 2;
  const base = Number.isInteger(rounded) ? rounded + 0.5 : rounded;
  return base.toFixed(1);
};

const normalizeLineString = (value?: string): string | undefined => {
  if (!value) return undefined;
  const parsed = parseLineValue(value);
  if (parsed === undefined) return undefined;
  return formatLineValue(parsed);
};

const normalizeSide = (value?: string): string | undefined => {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'over' || normalized.includes(' over')) return 'Over';
  if (normalized === 'under' || normalized.includes(' under')) return 'Under';
  if (normalized === 'yes' || normalized.includes(' yes')) return 'Yes';
  if (normalized === 'no' || normalized.includes(' no')) return 'No';
  return value;
};

const isInvalidPlayerName = (value?: string): boolean => {
  if (!value) return true;
  const normalized = value.trim().toLowerCase();
  if (['unknown player', 'over', 'under', 'yes', 'no'].includes(normalized)) return true;
  return normalized === 'scrambled' || normalized.includes('scrambled');
};

const getStatLabel = (value?: string): string => {
  if (!value) return 'Prop';
  const normalized = value.toLowerCase();
  if (normalized.includes('points + rebounds + assists') || normalized.includes('points+rebounds+assists')) {
    return 'PRA';
  }
  if (normalized.includes('points + rebounds') || normalized.includes('points+rebounds')) {
    return 'PR';
  }
  if (normalized.includes('points + assists') || normalized.includes('points+assists')) {
    return 'PA';
  }
  if (normalized.includes('rebounds + assists') || normalized.includes('rebounds+assists')) {
    return 'RA';
  }
  if (normalized.includes('3-point') || normalized.includes('three point')) {
    return '3PT Made';
  }
  if (normalized.includes('points')) return 'Points';
  if (normalized.includes('rebounds')) return 'Rebounds';
  if (normalized.includes('assists')) return 'Assists';
  if (normalized.includes('blocks')) return 'Blocks';
  if (normalized.includes('steals')) return 'Steals';
  if (normalized.includes('turnovers')) return 'Turnovers';
  return value;
};

const buildReasonFallback = (): string => 'Ranks near the top of today’s available prop market data.';

const allowedStatLabels = new Set([
  'Points',
  'Rebounds',
  'Assists',
  'PRA',
  'PR',
  'PA',
  'RA',
  '3PT Made',
  'Turnovers',
  'Blocks',
  'Steals',
]);

type DailyPropsProps = {
  leagueId: string;
  leagueLabel: string;
  onPropsLoaded?: (props: DailyProp[]) => void;
};

export const DailyProps: React.FC<DailyPropsProps> = ({ leagueId, leagueLabel, onPropsLoaded }) => {
  const [props, setProps] = useState<DailyProp[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasTechnicalIssue, setHasTechnicalIssue] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [showGallery, setShowGallery] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const galleryRef = useRef<HTMLDivElement | null>(null);
  const scrollRaf = useRef<number | null>(null);

  const renderedProps = useMemo(() => props, [props]);

  useEffect(() => {
    const loadProps = async () => {
      setIsLoading(true);
      setError(null);
      setHasTechnicalIssue(false);

      let cachedProps: DailyProp[] | null = null;
      try {
        const dateLabel = formatPstDate();
        const cacheKey = `pickvision:daily-props:${leagueId}:${dateLabel}`;
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          try {
            const parsed = JSON.parse(cached) as { props: DailyProp[]; timestamp: string };
            if (Array.isArray(parsed.props) && parsed.props.length > 0) {
              cachedProps = parsed.props;
              setProps(parsed.props);
              onPropsLoaded?.(parsed.props);
              setActiveIndex(0);
              setLastUpdated(`${dateLabel} (cached)`);
              setIsLoading(false);
              return;
            }
          } catch (_) {
            // Ignore invalid cache.
          }
        }

        const aiProps = await getDailyPropSuggestions(dateLabel, 14, leagueLabel);

        const deduped = new Map<string, DailyProp>();
        aiProps.forEach((prop, index) => {
          if (!prop.player || isInvalidPlayerName(prop.player)) return;
          if (!prop.side || !['Over', 'Under'].includes(prop.side)) return;
          const line = normalizeLineString(prop.line) ?? prop.line;
          const statLabel = getStatLabel(prop.statLabel || 'Prop');
          if (!allowedStatLabels.has(statLabel)) return;
          if (line === 'N/A' || line === '0.0') return;
          const key = [prop.player, statLabel, line].join('|');
          const nextEntry: DailyProp = {
            id: `${prop.player}-${statLabel}-${line}-${index}`,
            player: prop.player,
            stat: statLabel,
            statLabel,
            line,
            side: prop.side,
            confidence: prop.confidence,
            matchup: prop.matchup,
            reason: prop.reason || buildReasonFallback(),
          };
          const existing = deduped.get(key);
          const existingScore = existing?.confidence ?? 0;
          const nextScore = nextEntry.confidence ?? 0;
          if (!existing || nextScore > existingScore) {
            deduped.set(key, {
              ...nextEntry,
            });
          }
        });

        const rankedProps = Array.from(deduped.values())
          .sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0));
        const strongProps = rankedProps.filter((prop) => (prop.confidence ?? 0) >= 0.6);
        const finalProps = (strongProps.length >= 6 ? strongProps : rankedProps).slice(0, 10);

        setProps(finalProps);
        onPropsLoaded?.(finalProps);
        setActiveIndex(0);
        setLastUpdated(`${dateLabel} (6:00 AM PST update)`);
        localStorage.setItem(
          cacheKey,
          JSON.stringify({ props: finalProps, timestamp: new Date().toISOString() })
        );
      } catch (fetchError) {
        const message = fetchError instanceof Error ? fetchError.message : 'Failed to load props.';
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
        if (!props.length && cachedProps) {
          setProps(cachedProps);
          onPropsLoaded?.(cachedProps);
          setLastUpdated(`${formatPstDate()} (cached)`);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadProps();
  }, []);

  useEffect(() => {
    if (!showGallery) return;
    const container = galleryRef.current;
    if (!container) return;
    container.scrollTo({ left: 0 });
    setActiveIndex(0);
  }, [showGallery, renderedProps.length]);

  return (
    <Card>
      <div className="p-6 border-b border-gray-800">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
        <h3 className="text-2xl font-semibold text-purple-300">
          Top 10 {leagueLabel} Props (Daily)
        </h3>
            <p className="text-sm text-gray-400 mt-1">
              Ranked by the strongest consensus or implied probability available today.
            </p>
            {lastUpdated && (
              <p className="text-xs text-gray-500 mt-2">Updated daily: {lastUpdated}</p>
            )}
          </div>
          <Button
            variant="primary"
            size="sm"
            className="w-full md:w-auto"
            onClick={() => setShowGallery((prev) => !prev)}
          >
            {showGallery ? 'Hide Gallery' : 'Show Gallery'}
          </Button>
        </div>
      </div>
      <div className="p-6">
        {isLoading && <p className="text-gray-400 text-sm">Loading today&apos;s props...</p>}
        {hasTechnicalIssue && (
          <div className="rounded-xl border border-purple-500/30 bg-black/70 p-6 text-center shadow-[0_0_24px_rgba(168,85,247,0.35)]">
            <p className="text-xs uppercase tracking-[0.35em] text-purple-200/70">Technical Difficulties</p>
            <h4 className="mt-3 text-lg font-semibold text-white">
              We&apos;re tuning today&apos;s prop feed.
            </h4>
            <p className="mt-2 text-sm text-gray-400">
              Please check back soon. Your data is safe.
            </p>
          </div>
        )}
        {error && !hasTechnicalIssue && <p className="text-red-400 text-sm">{error}</p>}
        {!isLoading && !error && renderedProps.length === 0 && (
          <p className="text-gray-400 text-sm">No props available yet for today.</p>
        )}
        {showGallery && (
          <div className="rounded-2xl border border-purple-500/20 bg-gradient-to-br from-black/70 via-purple-950/20 to-black/80 p-4">
            <div className="flex items-center justify-between text-xs text-purple-200/70 uppercase tracking-[0.2em]">
              <span>Prop Gallery</span>
              <span>Swipe right for next</span>
            </div>
            <div
              ref={galleryRef}
              className="prop-gallery-scroll mt-4 flex w-full snap-x snap-mandatory overflow-x-auto overflow-y-hidden pb-2"
              onScroll={() => {
                const container = galleryRef.current;
                if (!container) return;
                if (scrollRaf.current !== null) return;
                scrollRaf.current = window.requestAnimationFrame(() => {
                  const index = Math.round(container.scrollLeft / container.clientWidth);
                  const clampedIndex = Math.max(0, Math.min(index, renderedProps.length - 1));
                  setActiveIndex(clampedIndex);
                  scrollRaf.current = null;
                });
              }}
            >
              {renderedProps.map((prop, index) => (
                <div
                  key={prop.id}
                  className="relative min-h-[360px] min-w-full shrink-0 snap-center overflow-hidden rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-900/30 via-gray-900/80 to-black/80 p-5 shadow-[0_0_24px_rgba(168,85,247,0.25)]"
                >
                  <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-purple-500/20 blur-2xl" />
                  <div className="relative">
                    <div className="flex items-center justify-between">
                      <span className="text-xs uppercase tracking-[0.2em] text-purple-200/80">
                        Pick #{index + 1}
                      </span>
                      {prop.matchup && (
                        <span className="text-xs text-gray-400">{prop.matchup}</span>
                      )}
                    </div>
                    <h4 className="text-xl font-semibold text-white mt-3">{prop.player}</h4>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-gray-200">
                      <span className="rounded-full bg-purple-500/20 px-3 py-1 text-purple-100">
                        {prop.statLabel}
                      </span>
                      {prop.side && (
                        <span className="rounded-full bg-white/10 px-3 py-1 text-white">
                          {prop.side}
                        </span>
                      )}
                      <span className="rounded-full bg-white/10 px-3 py-1 text-white">
                        {prop.line}
                      </span>
                    </div>
                    <p className="mt-4 text-sm text-gray-300">{prop.reason}</p>
                    <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-400">
                      {prop.odds && <span>Odds: {prop.odds}</span>}
                      <span>
                        Confidence:{' '}
                        {prop.confidence
                          ? `${Math.round(prop.confidence * 100)}%`
                          : prop.impliedProbability
                            ? `${Math.round(prop.impliedProbability * 100)}%`
                            : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-center gap-2">
              {renderedProps.map((_, index) => (
                <button
                  key={`dot-${index}`}
                  type="button"
                  aria-label={`Go to prop ${index + 1}`}
                  onClick={() => {
                    const container = galleryRef.current;
                    if (!container) return;
                    container.scrollTo({ left: index * container.clientWidth, behavior: 'smooth' });
                  }}
                  className={`h-2 w-2 rounded-full transition ${
                    activeIndex === index ? 'bg-white' : 'bg-white/20'
                  }`}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};
