import React from 'react';
import { SearchIcon, ListChecksIcon, ChatIcon } from './icons';

const steps = [
  {
    icon: SearchIcon,
    title: 'Research',
    body: "Every morning, PickVision's AI pulls that day's games — current matchups, injury news, recent form, and prop markets — across the NFL, NBA, and other leagues.",
  },
  {
    icon: ListChecksIcon,
    title: 'Rank & Predict',
    body: 'Player props are ranked by edge strength. For NFL games, PickVision also generates a projected winner and confidence score from each team’s recent scoring and defensive trends.',
  },
  {
    icon: ChatIcon,
    title: 'Explain',
    body: 'Every pick ships with a plain-English reason, so you see the actual basis for it — not just a number with no context behind it.',
  },
];

export const HowItWorksSection: React.FC = () => {
  return (
    <section className="px-6 py-16 md:py-20">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold text-white">How PickVision Works</h2>
        <p className="mt-3 text-gray-400">
          Three steps, run automatically every day before you ever open the app.
        </p>

        <div className="mt-10 space-y-6">
          {steps.map((step, index) => (
            <div key={step.title} className="flex gap-5 rounded-xl border border-white/10 bg-black/60 p-6">
              <div className="flex flex-col items-center gap-2 shrink-0">
                <div className="h-11 w-11 rounded-full bg-purple-500/15 flex items-center justify-center text-purple-300">
                  <step.icon className="w-5 h-5" />
                </div>
                <span className="text-xs text-gray-600 font-mono">{index + 1}</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">{step.title}</h3>
                <p className="mt-1.5 text-sm text-gray-400 leading-relaxed">{step.body}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-xl border border-purple-500/20 bg-purple-950/10 p-6">
          <h3 className="text-lg font-semibold text-purple-300">The Parlay Lab</h3>
          <p className="mt-2 text-sm text-gray-300 leading-relaxed">
            The Parlay Lab works the other direction: upload a screenshot of a parlay you're
            considering, and PickVision extracts each leg, checks it against current data, and gives
            you a leg-by-leg read on how it holds up — so you can catch a shaky leg before you place
            the bet, not after.
          </p>
        </div>

        <p className="mt-8 text-sm text-gray-500">
          PickVision is built for entertainment and informational purposes. It does not guarantee
          outcomes — always bet responsibly and within your means.
        </p>
      </div>
    </section>
  );
};
