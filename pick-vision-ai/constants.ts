import type { Player, StatCategory } from './types';
import { StatCategoryEnum } from './types';

// MOCK_PLAYERS and STAT_CATEGORIES are kept for potential future enhancements
// where AI extracted text could be mapped to structured data.
// For the current AI-driven text analysis, they are not directly used in the main prediction flow.
export const MOCK_PLAYERS: Player[] = [
  { id: '1', name: 'LeBron James', team: 'Lakers', avgStats: { points: 27.1, rebounds: 7.5, assists: 7.4, threepointersmade: 2.2 } },
  { id: '2', name: 'Stephen Curry', team: 'Warriors', avgStats: { points: 28.5, rebounds: 5.2, assists: 6.3, threepointersmade: 4.8 } },
  { id: '3', name: 'Kevin Durant', team: 'Suns', avgStats: { points: 26.8, rebounds: 6.7, assists: 5.5, threepointersmade: 2.5 } },
  { id: '4', name: 'Nikola Jokic', team: 'Nuggets', avgStats: { points: 25.0, rebounds: 12.0, assists: 9.0, threepointersmade: 1.1 } },
  { id: '5', name: 'Giannis Antetokounmpo', team: 'Bucks', avgStats: { points: 29.0, rebounds: 11.5, assists: 6.0, threepointersmade: 1.0 } },
  { id: '6', name: 'Luka Doncic', team: 'Mavericks', avgStats: { points: 30.5, rebounds: 8.8, assists: 8.7, threepointersmade: 3.1 } },
];

export const STAT_CATEGORIES: StatCategory[] = [
  { id: 'pts', name: StatCategoryEnum.POINTS, key: 'points' },
  { id: 'reb', name: StatCategoryEnum.REBOUNDS, key: 'rebounds' },
  { id: 'ast', name: StatCategoryEnum.ASSISTS, key: 'assists' },
  { id: '3pm', name: StatCategoryEnum.THREE_POINTERS_MADE, key: 'threepointersmade' },
];

export const GEMINI_API_KEY_ERROR_MESSAGE = "API_KEY environment variable not set. AI features are disabled.";
export const GEMINI_MODEL_TEXT = 'gemini-2.5-flash'; // For text generation
export const GEMINI_MODEL_VISION = 'gemini-2.5-flash'; // For image analysis (multimodal)