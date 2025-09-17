
import React from 'react';
import { MockupDisplay } from './MockupDisplay';
import { Button } from './ui/Button';
import { Header } from './Header';
import type { User } from '../types';

interface HomePageProps {
  onProceed: () => void;
  user: User | null;
  onLogout: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onProceed, user, onLogout }) => {
  return (
    <div className="min-h-screen bg-black text-gray-300 flex flex-col items-center p-4 selection:bg-purple-500 selection:text-white">
      <Header 
        title="Pick Vision AI" 
        subtitle="Your Personal AI Sports Betting Analyst"
        user={user}
        onLogout={onLogout}
       />
      <main className="w-full max-w-4xl mt-8 space-y-8">
        <MockupDisplay />
        <div className="text-center p-6 bg-gray-900 rounded-lg border border-gray-800">
             <p className="mt-3 text-gray-400 text-sm">
              <strong>How to use:</strong> Click "Start AI Analysis," then upload an image of your parlay. Once the AI extracts the details, click "Get AI Prediction & Analysis" to see the results.
            </p>
             <p className="mt-2 text-xs text-gray-500">
              Note: Image interpretation and AI analysis are complex tasks. Accuracy may vary. This tool is for entertainment purposes only.
            </p>
        </div>
        <div className="text-center">
          <Button 
            onClick={onProceed} 
            size="lg"
            className="w-full md:w-auto bg-green-600 hover:bg-green-700 text-lg py-4 px-8"
          >
            Start AI Analysis
          </Button>
        </div>
      </main>
       <footer className="w-full max-w-4xl mt-12 mb-6 text-center text-sm text-gray-500">
        <p>&copy; {new Date().getFullYear()} Pick Vision AI. For entertainment purposes only.</p>
        <p>This tool uses AI to interpret images and provide speculative analysis. Not financial advice.</p>
      </footer>
    </div>
  );
};
