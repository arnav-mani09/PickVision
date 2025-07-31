import React from 'react';
import { Card } from './ui/Card';

export const MockupDisplay: React.FC = () => {
  return (
    <Card>
      <div className="p-6">
        <h2 className="text-2xl font-semibold mb-4 text-indigo-400">Welcome to Pick Vision AI!</h2>
        <img 
          src="https://images.unsplash.com/photo-1518022524196-782a79e10531?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8YmV0dGluZyUyMHNsaXB8ZW58MHx8MHx8fDA%3D&auto=format&fit=crop&w=800&q=60" 
          alt="Conceptual Mockup of Pick Vision AI with a betting slip" 
          className="w-full h-auto max-h-[300px] object-cover rounded-lg mb-4 shadow-lg"
        />
        <p className="text-gray-300 leading-relaxed">
          Upload an image of your basketball parlay slip, and our AI will attempt to "read" it. 
          Then, it will provide a speculative prediction and analysis based on simulated contextual data like player status, team performance, and historical trends.
        </p>
        <p className="mt-3 text-gray-400 text-sm">
          <strong>How to use:</strong> Click "Choose Image" or drag and drop an image of your parlay. Once the AI extracts the parlay details, click "Get AI Prediction & Analysis" to see the results.
        </p>
         <p className="mt-2 text-xs text-gray-500">
          Note: Image interpretation and AI analysis are complex tasks. Accuracy may vary. This tool is for entertainment purposes only.
        </p>
      </div>
    </Card>
  );
};