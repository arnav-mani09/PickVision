import React from 'react';
import { BrainIcon, BoltIcon, ShieldCheckIcon } from './icons';

type HomeSectionProps = {
  onStartExploring: () => void;
};

const features = [
  {
    icon: BrainIcon,
    title: 'AI-Powered Research',
    body: "Every pick is backed by live web research into that day's matchups, injuries, and recent form — not a static model trained once and left to go stale.",
  },
  {
    icon: BoltIcon,
    title: 'Multi-Sport Coverage',
    body: 'Player props and game-by-game win predictions for the NFL and NBA today, with more leagues rolling out as the season progresses.',
  },
  {
    icon: ShieldCheckIcon,
    title: 'Parlay Verification',
    body: 'Upload a screenshot of a parlay you’re considering and get a leg-by-leg read on how it holds up against current data before you place it.',
  },
];

export const HomeSection: React.FC<HomeSectionProps> = ({ onStartExploring }) => {
  return (
    <>
      <section className="relative px-6 py-16 md:py-24">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.25),transparent_55%)]" />
        </div>
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-10 items-center">
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-white leading-tight">
              PickVision AI: Smarter Sports Betting Analysis
            </h1>
            <p className="mt-4 text-gray-300 text-lg">
              Upload your parlay, verify each leg, and get sharper insights with contextual data,
              trends, and AI-powered suggestions. Built for bettors who want clarity without the noise.
            </p>
            <div className="mt-6 flex flex-wrap gap-4">
              <button
                onClick={onStartExploring}
                className="bg-purple-600 text-white font-semibold px-5 py-3 rounded-lg shadow hover:bg-purple-500"
              >
                Start Exploring
              </button>
            </div>
          </div>
          <div className="relative">
            <div className="absolute -inset-6 bg-purple-600/10 blur-2xl rounded-full" />
            <div className="relative grid grid-cols-3 gap-4">
              <img
                src="/parlay2.png"
                alt="Parlay Left"
                className="rounded-xl border border-purple-500/40 shadow-[0_0_25px_rgba(168,85,247,0.4)]"
              />
              <img
                src="/parlay1.png"
                alt="Parlay Center"
                className="rounded-xl border border-purple-500/60 shadow-[0_0_30px_rgba(168,85,247,0.7)] animate-gentleFloat"
              />
              <img
                src="/parlay3.png"
                alt="Parlay Right"
                className="rounded-xl border border-purple-500/40 shadow-[0_0_25px_rgba(168,85,247,0.4)]"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-16 md:py-20 bg-gradient-to-b from-gray-950 to-black">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-white">Why PickVision</h2>
          <p className="mt-3 text-gray-400 max-w-2xl">
            Built to save you the time spent digging through box scores, injury reports, and prop
            markets by hand.
          </p>
          <div className="mt-8 grid md:grid-cols-3 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-xl border border-white/10 bg-black/60 p-6 hover:border-purple-500/40 transition-colors"
              >
                <div className="h-12 w-12 rounded-lg bg-purple-500/15 flex items-center justify-center text-purple-300">
                  <feature.icon />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-white">{feature.title}</h3>
                <p className="mt-2 text-sm text-gray-400 leading-relaxed">{feature.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
};
