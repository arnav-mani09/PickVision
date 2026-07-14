import { supabase } from './supabaseClient';
import type { PredictionResult, ExtractedImageResult } from '../types';

const getFunctionAuthHeaders = async (): Promise<Record<string, string> | undefined> => {
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (!anonKey) return undefined;
  return {
    Authorization: `Bearer ${anonKey}`,
    apikey: anonKey,
  };
};

// supabase-js collapses a non-2xx edge function response into a generic
// "Edge Function returned a non-2xx status code" message, discarding the actual
// { error: "..." } body our functions return. Unwrap it so real causes reach the caller.
const unwrapFunctionError = async (error: unknown): Promise<Error> => {
  const context = (error as { context?: unknown })?.context;
  if (context instanceof Response) {
    try {
      const body = await context.clone().json();
      if (body?.error) return new Error(String(body.error));
    } catch (_) {
      // Body wasn't JSON (or already consumed) — fall back to the generic message below.
    }
  }
  return error instanceof Error ? error : new Error(String(error));
};

export const extractParlayInfoFromImage = async (
  base64Image: string,
  mimeType: string = 'image/jpeg'
): Promise<ExtractedImageResult> => {
  if (!base64Image) {
    return {
      rawOutput: 'Error: No image data provided for extraction.',
      structuredLegs: null,
      error: 'No image data provided for extraction.',
    };
  }

  const headers = await getFunctionAuthHeaders();
  const { data, error } = await supabase.functions.invoke('extract-parlay-image', {
    method: 'POST',
    body: { base64Image, mimeType },
    headers,
  });

  if (error) {
    const unwrapped = await unwrapFunctionError(error);
    return {
      rawOutput: `AI Service Error: ${unwrapped.message}`,
      structuredLegs: null,
      error: `AI Service Error: ${unwrapped.message}`,
    };
  }

  return data as ExtractedImageResult;
};

export const getEnhancedParlayPrediction = async (
  parlayDetailsString: string
): Promise<Omit<PredictionResult, 'parlaySentForPrediction'>> => {
  if (!parlayDetailsString.trim()) {
    return {
      overallOutcome: 'ERROR',
      overall_summary: 'No parlay details provided for prediction.',
      suggestions: 'No parlay details.',
      contextualDataUsed: 'No parlay details.',
    };
  }

  const headers = await getFunctionAuthHeaders();
  const { data, error } = await supabase.functions.invoke('predict-parlay', {
    method: 'POST',
    body: { parlayDetailsString },
    headers,
  });

  if (error) {
    const unwrapped = await unwrapFunctionError(error);
    return {
      overallOutcome: 'ERROR',
      overall_summary: `AI Service Error: ${unwrapped.message}`,
      suggestions: 'Could not generate suggestions due to an error.',
      contextualDataUsed: `AI service error: ${unwrapped.message}`,
    };
  }

  return data as Omit<PredictionResult, 'parlaySentForPrediction'>;
};
