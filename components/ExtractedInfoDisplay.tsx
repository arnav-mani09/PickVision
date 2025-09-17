import React from 'react';
import { Card } from './ui/Card';

interface ExtractedInfoDisplayProps {
  title: string;
  info: string | null;
  isRawHTML?: boolean; // If info contains HTML to be rendered (use with caution)
}

export const ExtractedInfoDisplay: React.FC<ExtractedInfoDisplayProps> = ({ title, info, isRawHTML = false }) => {
  if (!info) {
    return null;
  }

  return (
    <Card>
      <div className="p-6">
        <h3 className="text-lg font-semibold mb-3 text-purple-400">{title}</h3>
        <div className="p-3 bg-gray-800 rounded-md shadow">
          {isRawHTML ? (
            <div className="text-gray-300 whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: info }} />
          ) : (
            <p className="text-gray-300 whitespace-pre-wrap">{info}</p>
          )}
        </div>
      </div>
    </Card>
  );
};