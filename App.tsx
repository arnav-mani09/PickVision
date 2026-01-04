
import React, { useState, useCallback, useEffect } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { Header } from './components/Header';
import { ImageUploader } from './components/ImageUploader';
import { EditableParlayCard } from './components/EditableParlayCard';
import { ExtractedInfoDisplay } from './components/ExtractedInfoDisplay';
import { PredictionDisplay } from './components/PredictionDisplay';
import { extractParlayInfoFromImage, getEnhancedParlayPrediction } from './services/geminiService';
import type { User, PredictionResult, ExtractedImageResult, EditableParlayLeg, PastParlay } from './types';
import { LoadingSpinner } from './components/ui/LoadingSpinner';
import { Button } from './components/ui/Button';
import { PastParlaysDisplay } from './components/PastParlaysDisplay';
import { LandingPage } from "./LandingPage";
import { TermsModal } from './components/TermsModal';
import { supabase } from './services/supabaseClient';
import { PicksOfDay } from './components/PicksOfDay';




// Helper to format parlay legs into a string for display or sending to prediction
const formatParlayLegsToString = (legs: EditableParlayLeg[]): string => {
  if (!legs || legs.length === 0) return "No parlay details extracted or defined.";
  return legs.map(leg => 
    `${leg.playerTeam} - ${leg.stat} - ${leg.condition} ${leg.value || ''}`.trim()
  ).join('\n- ');
};

const hasActionableSuggestions = (suggestions?: string | null): boolean => {
  if (!suggestions) return false;
  const normalized = suggestions.trim().toLowerCase();
  if (!normalized) return false;
  const noSuggestionPhrases = [
    "no suggestions",
    "no suggestions provided",
    "no suggestions could be generated",
  ];
  return !noSuggestionPhrases.some((phrase) => normalized.includes(phrase));
};

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(true);
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);
  const [hasDeclinedTerms, setHasDeclinedTerms] = useState(false);

  const [currentPage, setCurrentPage] = useState<'home' | 'app'>('home');
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  
  const [isLoadingImageProcessing, setIsLoadingImageProcessing] = useState<boolean>(false);
  const [imageAnalysisResult, setImageAnalysisResult] = useState<ExtractedImageResult | null>(null);
  const [currentParlayLegs, setCurrentParlayLegs] = useState<EditableParlayLeg[] | null>(null);
  
  const [isLoadingPrediction, setIsLoadingPrediction] = useState<boolean>(false);
  const [predictionResult, setPredictionResult] = useState<PredictionResult | null>(null);
  
  const [error, setError] = useState<string | null>(null);
  
  const [pastParlays, setPastParlays] = useState<PastParlay[]>([]);
  const [viewingParlay, setViewingParlay] = useState<PredictionResult | null>(null);
  
  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      const { data } = await supabase.auth.getSession();
      if (!isMounted) return;
      if (data.session?.user) {
        setCurrentUser({
          id: data.session.user.id,
          email: data.session.user.email || '',
        });
      } else {
        setCurrentUser(null);
      }
      setIsAuthenticating(false);
    };

    initializeAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setCurrentUser({
          id: session.user.id,
          email: session.user.email || '',
        });
      } else {
        setCurrentUser(null);
      }
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const storedAcceptance = localStorage.getItem('pickVisionAcceptedTerms');
    if (storedAcceptance === 'true') {
      setHasAcceptedTerms(true);
    }
  }, []);
  
  useEffect(() => {
    const loadParlays = async () => {
      if (!currentUser) {
        setPastParlays([]);
        return;
      }
      const { data, error } = await supabase
        .from('parlays')
        .select('id, created_at, prediction_result')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Failed to load past parlays:", error);
        return;
      }

      const mappedParlays: PastParlay[] = (data || []).map((row) => ({
        id: row.id,
        timestamp: row.created_at,
        predictionResult: row.prediction_result,
      }));
      setPastParlays(mappedParlays);
    };

    loadParlays();
  }, [currentUser]);

  useEffect(() => {
    if (imageAnalysisResult?.structuredLegs) {
      setCurrentParlayLegs(imageAnalysisResult.structuredLegs);
    } else {
      setCurrentParlayLegs(null);
    }
  }, [imageAnalysisResult]);

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

  const handleImageUpload = useCallback(async (file: File) => {
    setViewingParlay(null); // Exit history view if a new image is uploaded
    clearAll(); // Clear previous state
    
    setUploadedImage(file);
    setImagePreviewUrl(URL.createObjectURL(file));
    
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

    

  }, [clearAll]);

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
    setError(null);
    setPredictionResult(null);

    try {
      const result = await getEnhancedParlayPrediction(parlayDetailsForPrediction);
      const outcomeOverride = hasActionableSuggestions(result.suggestions) ? 'MISS' : result.overallOutcome;
      const fullResult: PredictionResult = {
        ...result,
        overallOutcome: outcomeOverride,
        parlaySentForPrediction: parlayDetailsForPrediction, 
        imagePreviewUrl: imagePreviewUrl,
      };
      setPredictionResult(fullResult);
      
      const newParlay: PastParlay = {
        id: new Date().toISOString() + Math.random(),
        timestamp: new Date().toISOString(),
        predictionResult: fullResult,
      };
      setPastParlays(prev => [newParlay, ...prev]);

      if (currentUser) {
        const storedResult = { ...fullResult, imagePreviewUrl: null };
        const { error: insertError } = await supabase
          .from('parlays')
          .insert({ user_id: currentUser.id, prediction_result: storedResult });
        if (insertError) {
          console.error("Failed to save parlay:", insertError);
          setError("Saved analysis locally, but failed to sync to the server.");
        }
      }

    } catch (e) {
      console.error("Failed to get parlay prediction:", e);
      const errorMessage = e instanceof Error ? e.message : "An unknown error occurred while getting the prediction.";
      setError(`Prediction Error: ${errorMessage}`);
      setPredictionResult({
        overallOutcome: 'ERROR',
        overall_summary: `Could not generate prediction. ${errorMessage}`,
        suggestions: 'No suggestions could be generated due to an error.',
        parlaySentForPrediction: parlayDetailsForPrediction,
        contextualDataUsed: "Failed to fetch contextual data.",
      });
    } finally {
      setIsLoadingPrediction(false);
    }
  }, [currentParlayLegs, imageAnalysisResult, imagePreviewUrl, currentUser]);

  const handleViewParlay = (parlay: PastParlay) => {
    clearAll();
    setViewingParlay(parlay.predictionResult);
  };
  
  const handleClearHistory = async () => {
    if (!window.confirm("Are you sure you want to clear your entire analysis history? This cannot be undone.")) {
      return;
    }
    if (!currentUser) {
      setPastParlays([]);
      return;
    }
    const { error: deleteError } = await supabase
      .from('parlays')
      .delete()
      .eq('user_id', currentUser.id);

    if (deleteError) {
      console.error("Failed to clear history:", deleteError);
      setError("Failed to clear history on the server.");
      return;
    }
    setPastParlays([]);
  };

  const handleReturnToApp = () => {
    setViewingParlay(null);
    clearAll();
  };
  
  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setCurrentPage('home');
    clearAll();
  };

  const handleLogout = () => {
    supabase.auth.signOut();
    setCurrentUser(null);
  };

  const handleAcceptTerms = () => {
    localStorage.setItem('pickVisionAcceptedTerms', 'true');
    setHasAcceptedTerms(true);
    setHasDeclinedTerms(false);
  };
  
  const handleDeclineTerms = () => {
    setHasAcceptedTerms(false);
    setHasDeclinedTerms(true);
  };


  const canAttemptPrediction = (currentParlayLegs && currentParlayLegs.length > 0) || 
                               (imageAnalysisResult?.rawOutput && !imageAnalysisResult.error && 
                                !imageAnalysisResult.rawOutput.toLowerCase().includes("error:") &&
                                !imageAnalysisResult.rawOutput.toLowerCase().includes("failed to extract") &&
                                !imageAnalysisResult.rawOutput.toLowerCase().includes("disabled"));
  
  const renderContent = () => {
    if (isAuthenticating) {
      return (
        <div className="min-h-screen bg-black flex justify-center items-center">
          <LoadingSpinner className="w-12 h-12" />
        </div>
      );
    }

    if (!currentUser) {
      return <LandingPage onLoginSuccess={handleLoginSuccess} />;
    }

    return (
      <div className="min-h-screen bg-black text-gray-300 flex flex-col items-center p-4 selection:bg-purple-500 selection:text-white">
        <Header 
          title="Pick Vision AI" 
          subtitle="Upload, verify, and analyze your parlay with AI!" 
          user={currentUser}
          onLogout={handleLogout}
         />
        <Button onClick={() => setCurrentPage('home')} variant="secondary" className="mb-6">
            Back to Home
        </Button>
        <main className="w-full max-w-4xl mt-2 space-y-8">
          {error && (
            <div className="bg-red-700 border border-red-900 text-white px-4 py-3 rounded relative shadow-lg" role="alert">
              <strong className="font-bold">Error: </strong>
              <span className="block sm:inline">{error}</span>
              <button onClick={() => setError(null)} className="absolute top-0 bottom-0 right-0 px-4 py-3 text-red-100 hover:text-white">
                <span aria-hidden="true">&times;</span><span className="sr-only">Close</span>
              </button>
            </div>
          )}

          {viewingParlay ? (
            <>
              <h2 className="text-2xl font-semibold text-center text-purple-400">Viewing Past Analysis</h2>
              <PredictionDisplay result={viewingParlay} />
              <Button onClick={handleReturnToApp} className="w-full">
                Analyze a New Parlay
              </Button>
            </>
          ) : (
            <>
            <PicksOfDay />

            <ImageUploader 
              onImageUpload={handleImageUpload} 
              imagePreviewUrl={imagePreviewUrl}
              isLoading={isLoadingImageProcessing}
              onClear={clearAll}
                hasUploadedImage={!!uploadedImage}
              />

              {isLoadingImageProcessing && (
                <div className="flex justify-center items-center p-6 bg-gray-900 rounded-lg shadow-xl">
                  <LoadingSpinner /><p className="ml-3 text-lg font-semibold">Analyzing your parlay image...</p>
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
                 <div className="flex justify-center items-center p-6 bg-gray-900 rounded-lg shadow-xl">
                  <LoadingSpinner /><p className="ml-3 text-lg font-semibold">Searching web & generating analysis...</p>
                </div>
              )}

              {predictionResult && !isLoadingPrediction && (
                <PredictionDisplay result={predictionResult} />
              )}
              
              <PastParlaysDisplay 
                parlays={pastParlays} 
                onViewParlay={handleViewParlay} 
                onClearHistory={handleClearHistory}
              />
            </>
          )}
        </main>
        <footer className="w-full max-w-4xl mt-12 mb-6 text-center text-sm text-gray-500">
          <p>&copy; {new Date().getFullYear()} Pick Vision AI. For entertainment purposes only.</p>
          <p>Pick Vision is not liable for any losses</p>
        </footer>
        <div className="fixed bottom-4 right-4 bg-gray-900 border border-purple-500 rounded-lg shadow-[0_0_20px_rgba(168,85,247,0.6)] p-4 text-white w-64 z-[9999]">
          <h2 className="text-lg font-semibold text-purple-400 mb-1">Need help?</h2>
          <p className="text-sm text-gray-300">
            Email:{" "}
            <a
              href="mailto:pickvisionai@gmail.com"
              className="text-purple-400 hover:text-purple-300 underline"
            >
              pickvisionai@gmail.com
            </a>
          </p>
        </div>
        <Analytics />
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-black text-gray-300">
      <div className={hasAcceptedTerms ? '' : 'blur-sm pointer-events-none select-none'}>
        {renderContent()}
      </div>
      <TermsModal
        open={!hasAcceptedTerms}
        onAccept={handleAcceptTerms}
        onDecline={handleDeclineTerms}
        showDeclineMessage={hasDeclinedTerms}
      />
    </div>
  );
};

export default App;
