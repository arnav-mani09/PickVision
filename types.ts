export interface Player {
  id: string;
  name: string;
  team: string;
  avgStats: {
    points: number;
    rebounds: number;
    assists: number;
    threepointersmade: number;
  };
}

export enum StatCategoryEnum {
  POINTS = 'Points',
  REBOUNDS = 'Rebounds',
  ASSISTS = 'Assists',
  THREE_POINTERS_MADE = '3-Pointers Made',
}

export interface StatCategory {
  id: string;
  name: StatCategoryEnum;
  key: keyof Player['avgStats'];
}

// Represents a single leg of a parlay, designed to be editable.
export interface EditableParlayLeg {
  id: string; // Unique ID for the leg (e.g., "leg1", "leg2")
  playerTeam: string; // Player or Team name
  stat: string; // Statistic (e.g., "Points", "Rebounds", "Moneyline")
  condition: string; // Condition (e.g., "Over", "Under", "To Win")
  value: string; // Value for the stat (e.g., "25.5", "+150")
  isEditableOverUnder: boolean; // True if the condition is Over/Under type
  originalText?: string; // Optional: the raw text for this leg if needed
}

// Result from image extraction, including structured legs and raw AI output.
export interface ExtractedImageResult {
  structuredLegs: EditableParlayLeg[] | null;
  rawOutput: string;
  error?: string; // If an error occurred during extraction or parsing
}


export interface GroundingChunkWeb {
  uri: string;
  title: string;
}

export interface GroundingChunk {
  web?: GroundingChunkWeb;
  // Can include other types like "retrievedContext"
}

export interface GroundingMetadata {
  groundingAttributions?: GroundingChunk[]; 
}

export interface PredictionResult {
  overallOutcome: 'HIT' | 'MISS' | 'ERROR' | 'INDETERMINATE';
  reasoning: string; 
  // This will store the string representation of the parlay sent for prediction (potentially after edits)
  parlaySentForPrediction: string; 
  contextualDataUsed?: string; // Summary from AI of context data it found/used or couldn't find via web search
  groundingSources?: GroundingChunk[];
  // confidenceLevel?: 'High' | 'Medium' | 'Low'; // Optional, can be added if consistently returned
}