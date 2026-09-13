import React, { useState } from "react";
import { Card } from "./components/ui/Card";
import { Input } from "./components/ui/Input";
import { Button } from "./components/ui/Button";
import { LoadingSpinner } from "./components/ui/LoadingSpinner";
import { AdBanner } from "./components/ui/AdBanner";
import { PicksPreview } from "./components/PicksPreview";
import { HomeSection } from "./components/landing/HomeSection";
import { NewsSection } from "./components/landing/NewsSection";
import { HowItWorksSection } from "./components/landing/HowItWorksSection";
import { GetStartedSection } from "./components/landing/GetStartedSection";
import type { User } from "./types";
interface LandingPageProps {
  onLoginSuccess: (user: User) => void;
}

type LandingSection = "home" | "news" | "picks" | "how-it-works" | "get-started";

const NAV_TABS: { id: LandingSection; label: string }[] = [
  { id: "home", label: "Home" },
  { id: "news", label: "Sports News" },
  { id: "picks", label: "Today's Picks" },
  { id: "how-it-works", label: "How It Works" },
  { id: "get-started", label: "Get Started" },
];

export const LandingPage: React.FC<LandingPageProps> = ({ onLoginSuccess }) => {
  const [activeSection, setActiveSection] = useState<LandingSection>("home");
  const [isLoginView, setIsLoginView] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  const toggleView = () => {
    setIsLoginView(!isLoginView);
    setError(null);
    setEmail("");
    setPassword("");
    setConfirmPassword("");
  };

  const handleAuthAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password.trim()) {
      setError("Email and password cannot be empty.");
      return;
    }

    if (!email.includes("@") || !email.includes(".")) {
      setError("Please enter a valid email format.");
      return;
    }

    if (!isLoginView && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);

    try {
      const storedUserId = localStorage.getItem("pickVisionUserId") || `${Date.now()}-${Math.random()}`;
      localStorage.setItem("pickVisionUserId", storedUserId);
      localStorage.setItem("pickVisionUserEmail", email);
      onLoginSuccess({ id: storedUserId, email });
    } catch (e) {
      setError(e instanceof Error ? e.message : "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-black text-gray-200 overflow-hidden selection:bg-purple-500 selection:text-white">
      <header className="relative z-10 flex items-center justify-between px-6 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <img
            src="/pickvision-logo.png"
            alt="Pick Vision Logo"
            className="h-10 w-auto drop-shadow-[0_0_15px_rgba(168,85,247,0.7)]"
          />
          <span className="font-semibold text-lg tracking-wide text-gray-100">PickVision</span>
        </div>
        <button
          onClick={() => setShowLogin(!showLogin)}
          className="bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white font-semibold py-2 px-4 rounded-xl shadow-lg hover:scale-[1.02] transition-transform duration-300"
        >
          {showLogin ? "Close" : "Sign In / Sign Up"}
        </button>
      </header>

      <nav className="sticky top-0 z-20 bg-black/90 backdrop-blur border-b border-white/10 px-6 py-3 overflow-x-auto">
        <div className="flex gap-2 max-w-6xl mx-auto w-max md:w-full">
          {NAV_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSection(tab.id)}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                activeSection === tab.id
                  ? "bg-purple-600 text-white"
                  : "bg-gray-800/80 text-gray-300 hover:bg-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      <main className="relative z-10">
        {activeSection === "home" && (
          <HomeSection onStartExploring={() => setActiveSection("get-started")} />
        )}
        {activeSection === "news" && <NewsSection />}
        {activeSection === "picks" && <PicksPreview />}
        {activeSection === "how-it-works" && <HowItWorksSection />}
        {activeSection === "get-started" && (
          <GetStartedSection onGetStarted={() => setShowLogin(true)} />
        )}
      </main>

      {showLogin && (
        <div className="fixed top-24 right-6 w-[280px] animate-fadeIn z-[50]">
          <Card className="backdrop-blur-md bg-white/10 border border-white/20 shadow-lg p-6 rounded-xl">
            <h2 className="text-l font-semibold text-center text-white mb-4">
              {isLoginView ? "Sign In" : "Create Account"}
            </h2>
            {error && (
              <div className="bg-red-700 border border-red-900 text-white px-4 py-2 rounded mb-3">
                {error}
              </div>
            )}
            <form onSubmit={handleAuthAction} className="space-y-4">
              <Input
                label="Email"
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Input
                label="Password"
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              {!isLoginView && (
                <Input
                  label="Confirm Password"
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              )}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <LoadingSpinner className="w-5 h-5" />
                ) : isLoginView ? (
                  "Sign In"
                ) : (
                  "Sign Up"
                )}
              </Button>
            </form>
            <div className="mt-3 text-center">
              <button
                onClick={toggleView}
                className="text-sm text-purple-400 hover:text-purple-300 hover:underline"
              >
                {isLoginView
                  ? "Need an account? Sign up"
                  : "Already have an account? Sign in"}
              </button>
            </div>
          </Card>
        </div>
      )}

      <footer className="border-t border-white/10 px-6 py-6 pb-16 text-center text-xs text-gray-500">
        © {new Date().getFullYear()} Pick Vision AI. For entertainment purposes only.
      </footer>

      <div className="fixed bottom-0 left-0 right-0 z-40">
        <AdBanner />
      </div>
    </div>
  );
};

// --- Floating Animation Keyframes ---
const style = document.createElement("style");
style.innerHTML = `
@keyframes gentleFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-gentleFloat { animation: gentleFloat 6s ease-in-out infinite; }
.animate-fadeIn { animation: fadeIn 0.4s ease-in-out; }
`;
document.head.appendChild(style);
