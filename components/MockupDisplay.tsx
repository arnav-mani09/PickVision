
import React from 'react';
import { Card } from './ui/Card';

export const MockupDisplay: React.FC = () => {
  return (
    <Card>
      <div className="p-6">
        <h2 className="text-2xl font-semibold mb-4 text-purple-400">Welcome to Pick Vision AI!</h2>
        <img 
          src="https://em-content.zobj.net/source/apple/391/money-mouth-face_1f911.png" 
          alt="A money-mouth face emoji, representing winning a bet" 
          className="w-full h-auto max-h-[300px] object-contain rounded-lg mb-4"
        />
        <p className="text-gray-300 leading-relaxed">
          Upload an image of your basketball parlay slip, and our AI will read it. 
          Then, it will provide a speculative prediction and analysis based on simulated contextual data like player status, team performance, and historical trends.
        </p>
      </div>
    </Card>
  );
};
