import React from 'react';
import { CheckCircleIcon } from './icons';

type GetStartedSectionProps = {
  onGetStarted: () => void;
};

const benefits = [
  'Free to start — no card required',
  'AI-ranked player props refreshed daily',
  'Parlay screenshots checked leg-by-leg before you bet',
];

export const GetStartedSection: React.FC<GetStartedSectionProps> = ({ onGetStarted }) => {
  return (
    <section className="px-6 py-16 md:py-20">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-3xl font-bold text-white">Ready to Analyze Your Parlays?</h2>
        <p className="mt-3 text-gray-400">
          Keep your edge sharp with fast, AI-driven analysis and a clean betting workflow.
        </p>
        <ul className="mt-8 space-y-3 text-left inline-block">
          {benefits.map((benefit) => (
            <li key={benefit} className="flex items-center gap-3 text-gray-300">
              <span className="text-purple-400 shrink-0">
                <CheckCircleIcon />
              </span>
              {benefit}
            </li>
          ))}
        </ul>
        <div>
          <button
            onClick={onGetStarted}
            className="mt-8 bg-purple-600 text-white font-semibold px-6 py-3 rounded-lg shadow hover:bg-purple-500"
          >
            Sign In / Sign Up
          </button>
        </div>
      </div>
    </section>
  );
};
