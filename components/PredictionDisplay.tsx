import React from 'react';
import type { PredictionResult, GroundingChunk } from '../types';
import { Card } from './ui/Card';

interface PredictionDisplayProps {
  result: PredictionResult;
}

export const PredictionDisplay: React.FC<PredictionDisplayProps> = ({ result }) => {
  const outcomeStyles = {
    HIT: "bg-green-600 text-green-50",
    MISS: "bg-red-600 text-red-50",
    INDETERMINATE: "bg-yellow-600 text-yellow-50",
    ERROR: "bg-gray-700 text-gray-200",
  };

  const currentOutcomeStyle = outcomeStyles[result.overallOutcome] || outcomeStyles['ERROR'];

  const renderGroundingSources = (sources?: GroundingChunk[]) => {
    if (!sources || sources.length === 0) {
      return null;
    }
    const validWebSources = sources.filter(
        (s) => s.web && s.web.uri && s.web.title
    );

    if (validWebSources.length === 0) return null;

    return (
      <div className="mt-4">
        <h4 className="text-md font-semibold mb-1 text-indigo-300">Retrieved Information Sources (from AI Web Search):</h4>
        <ul className="list-disc list-inside text-sm space-y-1">
          {validWebSources.map((source, index) => (
            <li key={index} className="text-gray-400">
              <a 
                href={source.web!.uri} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-indigo-400 hover:text-indigo-300 underline"
                aria-label={`Source: ${source.web!.title || 'Untitled Source'}`}
              >
                {source.web!.title || source.web!.uri}
              </a>
            </li>
          ))}
        </ul>
        <p className="text-xs text-gray-500 mt-1">Note: These sources were algorithmically selected by the AI based on its search queries.</p>
      </div>
    );
  };

  return (
    <Card>
      <div className={`p-6 rounded-t-lg text-center ${currentOutcomeStyle}`}>
        <h2 className="text-3xl font-bold">
          AI Parlay Analysis: {result.overallOutcome}
        </h2>
      </div>
      <div className="p-6 space-y-6">
        
        <div>
          <h3 className="text-lg font-semibold mb-2 text-indigo-400">Parlay Details Sent for Analysis:</h3>
          <div className="p-3 bg-gray-700 rounded-md shadow">
            <p className="text-gray-300 whitespace-pre-wrap">{result.parlaySentForPrediction || "Not available."}</p>
          </div>
        </div>

        {result.contextualDataUsed && (
          <div>
            <h3 className="text-lg font-semibold mb-2 text-indigo-400">AI Summary of Contextual Data Found/Used:</h3>
            <div className="p-3 bg-gray-700 rounded-md shadow">
              <p className="text-gray-300 whitespace-pre-wrap text-sm">{result.contextualDataUsed}</p>
               <p className="text-xs text-gray-500 mt-2">This summary is based on information the AI attempted to find via web search. It may include notes on information it could not locate.</p>
            </div>
          </div>
        )}
        
        <div>
          <h3 className="text-lg font-semibold mb-2 text-indigo-400">AI Reasoning & Prediction Details:</h3>
           <div className="p-4 bg-gray-750 rounded-md shadow border border-gray-600">
            <p className="text-gray-200 whitespace-pre-wrap leading-relaxed">{result.reasoning}</p>
            {renderGroundingSources(result.groundingSources)}
          </div>
        </div>
        
      </div>
    </Card>
  );
};