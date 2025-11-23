
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
import { HomePage } from './components/HomePage';
import { PastParlaysDisplay } from './components/PastParlaysDisplay';
import { Input } from './components/ui/Input';
import { Card } from './components/ui/Card';
import { LandingPage } from "./LandingPage";
import SupportSidebar from './components/SupportSidebar';



// --- Authentication Page Component ---

interface AuthPageProps {
    onLoginSuccess: (user: User) => void;
}

const AuthPage: React.FC<AuthPageProps> = ({ onLoginSuccess }) => {
  const [isLoginView, setIsLoginView] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const toggleView = () => {
    setIsLoginView(!isLoginView);
    setError(null);
    setEmail('');
    setPassword('');
    setConfirmPassword('');
  };

  const handleAuthAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password.trim()) {
        setError("Email and password cannot be empty.");
        return;
    }

    if (!isLoginView && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    
    setIsLoading(true);

    // Simulate async operation
    await new Promise(res => setTimeout(res, 500));

    try {
      if (isLoginView) {
        // Login Logic
        const users = JSON.parse(localStorage.getItem('pickVisionAIUsers') || '[]');
        const user = users.find((u: any) => u.email === email && u.password === password);
        if (user) {
          sessionStorage.setItem('pickVisionAICurrentUser', JSON.stringify({ email }));
          onLoginSuccess({ email });
        } else {
          setError("Invalid email or password.");
        }
      } else {
        // Sign Up Logic
        const users = JSON.parse(localStorage.getItem('pickVisionAIUsers') || '[]');
        if (users.some((u: any) => u.email === email)) {
          setError("An account with this email already exists.");
        } else {
          const newUser = { email, password };
          users.push(newUser);
          localStorage.setItem('pickVisionAIUsers', JSON.stringify(users));
          sessionStorage.setItem('pickVisionAICurrentUser', JSON.stringify({ email }));
          onLoginSuccess({ email });
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-gray-300 flex flex-col items-center justify-center p-4 selection:bg-purple-500 selection:text-white">
      <Header title="Pick Vision AI" subtitle="Your Personal AI Sports Betting Analyst" />
      <main className="w-full max-w-md mt-8">
        <Card>
          <div className="p-8">
            <h2 className="text-2xl font-bold text-center text-white mb-6">
              {isLoginView ? 'Sign In' : 'Create Account'}
            </h2>
            {error && (
              <div className="bg-red-700 border border-red-900 text-white px-4 py-3 rounded relative shadow-lg mb-4" role="alert">
                <span className="block sm:inline">{error}</span>
              </div>
            )}
            <form onSubmit={handleAuthAction} className="space-y-6">
              <Input
                label="Email Address"
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
              <Input
                label="Password"
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete={isLoginView ? 'current-password' : 'new-password'}
              />
              {!isLoginView && (
                <Input
                  label="Confirm Password"
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
              )}
              <Button type="submit" className="w-full" disabled={isLoading} size="lg">
                {isLoading ? <LoadingSpinner className="w-5 h-5" /> : (isLoginView ? 'Sign In' : 'Sign Up')}
              </Button>
            </form>
            <div className="mt-6 text-center">
              <button onClick={toggleView} className="text-sm text-purple-400 hover:text-purple-300 hover:underline">
                {isLoginView ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
              </button>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
};


// Helper to format parlay legs into a string for display or sending to prediction
const formatParlayLegsToString = (legs: EditableParlayLeg[]): string => {
  if (!legs || legs.length === 0) return "No parlay details extracted or defined.";
  return legs.map(leg => 
    `${leg.playerTeam} - ${leg.stat} - ${leg.condition} ${leg.value || ''}`.trim()
  ).join('\n- ');
};

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(true);

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
    try {
      const storedUser = sessionStorage.getItem('pickVisionAICurrentUser');
      if (storedUser) {
        setCurrentUser(JSON.parse(storedUser));
      }
    } catch (e) {
      console.error("Failed to parse user from session storage:", e);
      sessionStorage.removeItem('pickVisionAICurrentUser');
    }
    setIsAuthenticating(false);
  }, []);
  
  useEffect(() => {
    try {
      const storedParlays = localStorage.getItem('pickVisionAIPastParlays');
      if (storedParlays) {
        setPastParlays(JSON.parse(storedParlays));
      }
    } catch (e) {
      console.error("Failed to load past parlays from storage:", e);
      localStorage.removeItem('pickVisionAIPastParlays');
    }
  }, []);

  useEffect(() => {
    try {
      if (pastParlays.length > 0) {
        localStorage.setItem('pickVisionAIPastParlays', JSON.stringify(pastParlays));
      } else {
        localStorage.removeItem('pickVisionAIPastParlays');
      }
    } catch (e) {
      console.error("Failed to save past parlays to storage:", e);
    }
  }, [pastParlays]);

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
      const fullResult: PredictionResult = {
        ...result,
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
  }, [currentParlayLegs, imageAnalysisResult, imagePreviewUrl]);

  const handleViewParlay = (parlay: PastParlay) => {
    clearAll();
    setViewingParlay(parlay.predictionResult);
  };
  
  const handleClearHistory = () => {
    if (window.confirm("Are you sure you want to clear your entire analysis history? This cannot be undone.")) {
      setPastParlays([]);
    }
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
    sessionStorage.removeItem('pickVisionAICurrentUser');
    setCurrentUser(null);
  };


  const canAttemptPrediction = (currentParlayLegs && currentParlayLegs.length > 0) || 
                               (imageAnalysisResult?.rawOutput && !imageAnalysisResult.error && 
                                !imageAnalysisResult.rawOutput.toLowerCase().includes("error:") &&
                                !imageAnalysisResult.rawOutput.toLowerCase().includes("failed to extract") &&
                                !imageAnalysisResult.rawOutput.toLowerCase().includes("disabled"));
  
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

export default App;
