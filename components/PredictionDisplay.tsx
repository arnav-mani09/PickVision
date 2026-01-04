
import React from 'react';
import type { PredictionResult, GroundingChunk } from '../types';
import { Card } from './ui/Card';
import { LightBulbIcon } from './ui/Icons'; // Import icon for suggestions

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
  const hasSuggestions = Boolean(result.suggestions && result.suggestions.trim().length > 0);

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
        <h4 className="text-md font-semibold mb-1 text-purple-300">Retrieved Information Sources (AI Web Search):</h4>
        <ul className="list-disc list-inside text-sm space-y-1">
          {validWebSources.map((source, index) => (
            <li key={index} className="text-gray-400">
              <a 
                href={source.web!.uri} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-purple-400 hover:text-purple-300 underline"
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
          AI Parlay Verdict: {result.overallOutcome}
        </h2>
      </div>
      {hasSuggestions && (
        <a
          href="#suggestions"
          className="block w-full bg-purple-600 text-white text-center font-semibold py-3 hover:bg-purple-500"
        >
          Go to Suggestions
        </a>
      )}
      <div className="p-6 space-y-6">

        {result.imagePreviewUrl && (
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2 text-purple-400">Analyzed Image</h3>
            <img 
              src={result.imagePreviewUrl}
              alt="Analyzed parlay slip"
              className="max-w-full max-h-60 rounded-md shadow-lg border border-gray-600 inline-block"
            />
          </div>
        )}
        
        {result.suggestions && (
          <div id="suggestions">
            <h3 className="flex items-center text-xl font-semibold mb-3 text-yellow-300">
              <LightBulbIcon className="w-7 h-7 mr-2" />
              Suggestions Box
            </h3>
            <div className="p-6 bg-yellow-900/20 border border-yellow-600/60 rounded-lg shadow-lg">
              <p className="text-yellow-100 whitespace-pre-wrap leading-relaxed text-lg">
                {result.suggestions}
              </p>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Suggestions are AI-generated for entertainment purposes only.
            </p>
          </div>
        )}

        <details className="rounded-lg border border-gray-800 bg-gray-900/40 p-4">
          <summary className="cursor-pointer text-purple-300 font-semibold">
            View AI Details & Sources
          </summary>
          <div className="mt-4 space-y-4">
            <div>
              <h3 className="text-sm font-semibold mb-2 text-purple-400">Parlay Details Sent for Analysis</h3>
              <div className="p-3 bg-gray-800 rounded-md shadow">
                <p className="text-gray-300 whitespace-pre-wrap text-sm">
                  {result.parlaySentForPrediction || "Not available."}
                </p>
              </div>
            </div>

            {result.contextualDataUsed && (
              <div>
                <h3 className="text-sm font-semibold mb-2 text-purple-400">Contextual Data Summary</h3>
                <div className="p-3 bg-gray-800 rounded-md shadow">
                  <p className="text-gray-300 whitespace-pre-wrap text-sm">{result.contextualDataUsed}</p>
                  <p className="text-xs text-gray-500 mt-2">
                    Based on the AI's web search results and availability of info.
                  </p>
                </div>
              </div>
            )}

            {result.overall_summary && (
              <div>
                <h3 className="text-sm font-semibold mb-2 text-purple-400">Prediction Summary</h3>
                <div className="p-3 bg-gray-800 rounded-md shadow border border-gray-700">
                  <p className="text-gray-200 whitespace-pre-wrap leading-relaxed text-sm">
                    {result.overall_summary}
                  </p>
                  {renderGroundingSources(result.groundingSources)}
                </div>
              </div>
            )}
          </div>
        </details>
        
      </div>
    </Card>
  );
};
