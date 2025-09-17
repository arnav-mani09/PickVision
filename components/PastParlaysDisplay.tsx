
import React from 'react';
import { Card } from './ui/Card';
import type { PastParlay } from '../types';
import { Button } from './ui/Button';
import { EyeIcon, TrashIcon } from './ui/Icons';

interface PastParlaysDisplayProps {
  parlays: PastParlay[];
  onViewParlay: (parlay: PastParlay) => void;
  onClearHistory: () => void;
}

export const PastParlaysDisplay: React.FC<PastParlaysDisplayProps> = ({ parlays, onViewParlay, onClearHistory }) => {
  return (
    <Card>
      <div className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-purple-400">Past Analyses</h2>
          {parlays.length > 0 && (
            <Button onClick={onClearHistory} variant="danger" size="sm" aria-label="Clear all history">
              <TrashIcon className="w-4 h-4 mr-2" />
              Clear History
            </Button>
          )}
        </div>
        {parlays.length === 0 ? (
          <p className="text-gray-400">No past analyses found. Upload an image to get started!</p>
        ) : (
          <ul className="space-y-3 max-h-96 overflow-y-auto pr-2">
            {parlays.map(parlay => (
              <li key={parlay.id} className="p-3 bg-gray-800 rounded-md shadow flex justify-between items-center transition-colors hover:bg-gray-700/50">
                <div className="flex items-center overflow-hidden">
                   {parlay.predictionResult.imagePreviewUrl && (
                     <img src={parlay.predictionResult.imagePreviewUrl} alt="Parlay slip thumbnail" className="w-12 h-12 object-cover rounded-md mr-4 border border-gray-700 flex-shrink-0"/>
                   )}
                  <div className="flex-grow overflow-hidden">
                    <p className="font-medium text-gray-200 truncate">
                      Analysis from {new Date(parlay.timestamp).toLocaleString()}
                    </p>
                    <p className={`text-sm font-bold ${
                      parlay.predictionResult.overallOutcome === 'HIT' ? 'text-green-400' :
                      parlay.predictionResult.overallOutcome === 'MISS' ? 'text-red-400' :
                      parlay.predictionResult.overallOutcome === 'ERROR' ? 'text-gray-400' :
                      'text-yellow-400'
                    }`}>
                      Outcome: {parlay.predictionResult.overallOutcome}
                    </p>
                  </div>
                </div>
                <Button onClick={() => onViewParlay(parlay)} size="sm" variant="secondary" aria-label="View details" className="flex-shrink-0 ml-2">
                  <EyeIcon className="w-5 h-5 md:mr-2" />
                  <span className="hidden md:inline">View</span>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
};
