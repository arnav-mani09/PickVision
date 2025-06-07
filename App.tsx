
import React, { useState, useCallback, useEffect } from 'react';
import { Header } from './components/Header';
import { MockupDisplay } from './components/MockupDisplay';
import { ImageUploader } from './components/ImageUploader';
import { EditableParlayCard } from './components/EditableParlayCard'; // New component
import { ExtractedInfoDisplay } from './components/ExtractedInfoDisplay'; // To display raw AI output as fallback
import { PredictionDisplay } from './components/PredictionDisplay';
import { extractParlayInfoFromImage, getEnhancedParlayPrediction } from './services/geminiService';
import type { PredictionResult, ExtractedImageResult, EditableParlayLeg } from './types';
import { LoadingSpinner } from './components/ui/LoadingSpinner';
import { Button } from './components/ui/Button';

// Helper to format parlay legs into a string for display or sending to prediction
const formatParlayLegsToString = (legs: EditableParlayLeg[]): string => {
  if (!legs || legs.length === 0) return "No parlay details extracted or defined.";
  return legs.map(leg => 
    `${leg.playerTeam} - ${leg.stat} - ${leg.condition} ${leg.value || ''}`.trim()
  ).join('\n- ');
};

const App: React.FC = () => {
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  
  const [isLoadingImageProcessing, setIsLoadingImageProcessing] = useState<boolean>(false);
  // Store the full result from image extraction, including raw output and structured legs
  const [imageAnalysisResult, setImageAnalysisResult] = useState<ExtractedImageResult | null>(null);
  // Store the parlay legs that can be edited and are used for prediction
  const [currentParlayLegs, setCurrentParlayLegs] = useState<EditableParlayLeg[] | null>(null);
  
  const [isLoadingPrediction, setIsLoadingPrediction] = useState<boolean>(false);
  const [predictionResult, setPredictionResult] = useState<PredictionResult | null>(null);
  
  const [error, setError] = useState<string | null>(null);

  // Effect to update currentParlayLegs when imageAnalysisResult changes
  useEffect(() => {
    if (imageAnalysisResult?.structuredLegs) {
      setCurrentParlayLegs(imageAnalysisResult.structuredLegs);
    } else {
      setCurrentParlayLegs(null);
    }
  }, [imageAnalysisResult]);


  const handleImageUpload = useCallback(async (file: File) => {
    setUploadedImage(file);
    setImagePreviewUrl(URL.createObjectURL(file));
    setImageAnalysisResult(null);
    setCurrentParlayLegs(null);
    setPredictionResult(null);
    setError(null);
    
    setIsLoadingImageProcessing(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = async () => {
        const base64Image = reader.result?.toString().split(',')[1];
        if (base64Image) {
          const analysisResult = await extractParlayInfoFromImage(base64Image, file.type || 'image/jpeg');
          setImageAnalysisResult(analysisResult);
          if (analysisResult.error && !analysisResult.structuredLegs) {
             setError(`Image Analysis Note: ${analysisResult.error}`);
          }
        } else {
          throw new Error("Could not read image data.");
        }
        setIsLoadingImageProcessing(false);
      };
      reader.onerror = () => {
        setIsLoadingImageProcessing(false);
        const fileError = "Error reading file.";
        setError(`Image Processing Error: ${fileError}`);
        setImageAnalysisResult({ rawOutput: fileError, structuredLegs: null, error: fileError });
      }
    } catch (e) {
      console.error("Error processing image:", e);
      const errorMessage = e instanceof Error ? e.message : "An unknown error occurred during image processing.";
      setError(`Image Processing Error: ${errorMessage}`);
      setImageAnalysisResult({ rawOutput: errorMessage, structuredLegs: null, error: errorMessage });
      setIsLoadingImageProcessing(false);
    }
  }, []);

  const handleUpdateParlayLegCondition = useCallback((legId: string, newCondition: string) => {
    setCurrentParlayLegs(prevLegs => {
      if (!prevLegs) return null;
      return prevLegs.map(leg => 
        leg.id === legId ? { ...leg, condition: newCondition } : leg
      );
    });
  }, []);

  const handleGetPrediction = useCallback(async () => {
    let parlayDetailsForPrediction: string;

    if (currentParlayLegs && currentParlayLegs.length > 0) {
      parlayDetailsForPrediction = formatParlayLegsToString(currentParlayLegs);
    } else if (imageAnalysisResult?.rawOutput && !imageAnalysisResult.error) {
      // Fallback to raw output if no structured legs or if they are empty
      // but only if rawOutput doesn't seem to be an error message itself
      const lowerRaw = imageAnalysisResult.rawOutput.toLowerCase();
      if (!lowerRaw.includes("error:") && !lowerRaw.includes("failed to extract") && !lowerRaw.includes("ai features disabled")) {
         parlayDetailsForPrediction = imageAnalysisResult.rawOutput;
      } else {
         setError("Cannot proceed with prediction. Parlay information is unclear or contains errors from initial extraction.");
         return;
      }
    } else {
      setError("Please upload an image and ensure parlay information was successfully extracted first.");
      return;
    }
    
    setIsLoadingPrediction(true);
    setError(null); // Clear previous general errors
    setPredictionResult(null);

    try {
      const result = await getEnhancedParlayPrediction(parlayDetailsForPrediction);
      setPredictionResult({
        ...result,
        parlaySentForPrediction: parlayDetailsForPrediction, 
      });
    } catch (e) {
      console.error("Failed to get parlay prediction:", e);
      const errorMessage = e instanceof Error ? e.message : "An unknown error occurred while getting the prediction.";
      setError(`Prediction Error: ${errorMessage}`);
      setPredictionResult({
        overallOutcome: 'ERROR',
        reasoning: `Could not generate prediction. ${errorMessage}`,
        parlaySentForPrediction: parlayDetailsForPrediction,
        contextualDataUsed: "Failed to fetch contextual data.",
      });
    } finally {
      setIsLoadingPrediction(false);
    }
  }, [currentParlayLegs, imageAnalysisResult]);

  const clearAll = useCallback(() => {
    setUploadedImage(null);
    setImagePreviewUrl(null);
    setImageAnalysisResult(null);
    setCurrentParlayLegs(null);
    setPredictionResult(null);
    setError(null);
    setIsLoadingImageProcessing(false);
    setIsLoadingPrediction(false);
  }, []);

  const canAttemptPrediction = (currentParlayLegs && currentParlayLegs.length > 0) || 
                               (imageAnalysisResult?.rawOutput && !imageAnalysisResult.error && 
                                !imageAnalysisResult.rawOutput.toLowerCase().includes("error:") &&
                                !imageAnalysisResult.rawOutput.toLowerCase().includes("failed to extract") &&
                                !imageAnalysisResult.rawOutput.toLowerCase().includes("disabled"));


  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col items-center p-4 selection:bg-indigo-500 selection:text-white">
      <Header title="Parlay Vision AI" subtitle="Upload, verify, and analyze your parlay with AI!" />
      <main className="w-full max-w-4xl mt-8 space-y-8">
        <MockupDisplay />
        
        {error && ( // General error display
          <div className="bg-red-700 border border-red-900 text-white px-4 py-3 rounded relative shadow-lg" role="alert">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{error}</span>
            <button onClick={() => setError(null)} className="absolute top-0 bottom-0 right-0 px-4 py-3 text-red-100 hover:text-white">
              <span aria-hidden="true">&times;</span>
              <span className="sr-only">Close</span>
            </button>
          </div>
        )}

        <ImageUploader 
          onImageUpload={handleImageUpload} 
          imagePreviewUrl={imagePreviewUrl}
          isLoading={isLoadingImageProcessing}
          onClear={clearAll}
          hasUploadedImage={!!uploadedImage}
        />

        {isLoadingImageProcessing && (
          <div className="flex justify-center items-center p-6 bg-gray-800 rounded-lg shadow-xl">
            <LoadingSpinner />
            <p className="ml-3 text-lg font-semibold">Analyzing your parlay image...</p>
          </div>
        )}
        
        {!isLoadingImageProcessing && imageAnalysisResult && (
          <>
            {currentParlayLegs && currentParlayLegs.length > 0 ? (
              <EditableParlayCard 
                legs={currentParlayLegs}
                onUpdateLegCondition={handleUpdateParlayLegCondition}
                title="Verify & Edit Extracted Parlay"
              />
            ) : (
              // Display raw output if structured legs are not available or empty, or if there was an error during parsing
              <ExtractedInfoDisplay 
                title="AI Image Analysis Output" 
                info={imageAnalysisResult.error ? `Error: ${imageAnalysisResult.error}\n\nRaw Output:\n${imageAnalysisResult.rawOutput}` : imageAnalysisResult.rawOutput } 
              />
            )}

            {!predictionResult && !isLoadingPrediction && (
                 <Button 
                    onClick={handleGetPrediction} 
                    disabled={isLoadingPrediction || isLoadingImageProcessing || !canAttemptPrediction}
                    className="w-full bg-green-600 hover:bg-green-700 text-lg py-3"
                  >
                   {isLoadingPrediction ? 'Getting Prediction...' : 'Get AI Prediction & Analysis'}
                  </Button>
            )}
          </>
        )}
        
        {isLoadingPrediction && !predictionResult && (
           <div className="flex justify-center items-center p-6 bg-gray-800 rounded-lg shadow-xl">
            <LoadingSpinner />
            <p className="ml-3 text-lg font-semibold">Searching web & generating analysis...</p>
          </div>
        )}

        {predictionResult && !isLoadingPrediction && (
          <PredictionDisplay result={predictionResult} />
        )}
      </main>
      <footer className="w-full max-w-4xl mt-12 mb-6 text-center text-sm text-gray-500">
        <p>&copy; {new Date().getFullYear()} Parlay Vision AI. For entertainment purposes only.</p>
        <p>This tool uses AI to interpret images and provide speculative analysis. Not financial advice.</p>
        <p>API Key for Gemini is expected to be in `process.env.API_KEY`.</p>
      </footer>
    </div>
  );
};

export default App;