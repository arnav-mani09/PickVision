import React, { useState } from "react";
import { Card } from "./components/ui/Card";
import { Input } from "./components/ui/Input";
import { Button } from "./components/ui/Button";
import { LoadingSpinner } from "./components/ui/LoadingSpinner";
import type { User } from "./types";

interface LandingPageProps {
  onLoginSuccess: (user: User) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onLoginSuccess }) => {
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

    if (!isLoginView && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);
    await new Promise((res) => setTimeout(res, 500));

    try {
      if (isLoginView) {
        const users = JSON.parse(localStorage.getItem("pickVisionAIUsers") || "[]");
        const user = users.find((u: any) => u.email === email && u.password === password);
        if (user) {
          sessionStorage.setItem("pickVisionAICurrentUser", JSON.stringify({ email }));
          onLoginSuccess({ email });
        } else {
          setError("Invalid email or password.");
        }
      } else {
        const users = JSON.parse(localStorage.getItem("pickVisionAIUsers") || "[]");
        if (users.some((u: any) => u.email === email)) {
          setError("An account with this email already exists.");
        } else {
          const newUser = { email, password };
          users.push(newUser);
          localStorage.setItem("pickVisionAIUsers", JSON.stringify(users));
          sessionStorage.setItem("pickVisionAICurrentUser", JSON.stringify({ email }));
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
    <div className="relative min-h-screen bg-black text-gray-200 flex flex-col items-center justify-center overflow-hidden selection:bg-purple-500 selection:text-white">
      
      {/* --- Floating Background Cards --- */}
      <div className="absolute inset-0 flex justify-center items-center z-0 overflow-hidden">
        <div className="relative w-[900px] h-[700px] flex justify-center items-center">
          {/* Left Tilt */}
          <img
            src="/parlay2.png"
            alt="Parlay Left"
            className="absolute w-[200px] rotate-[-10deg] drop-shadow-[0_0_25px_rgba(168,85,247,0.6)] transition-transform duration-700"
            style={{ left: "calc(50% - 260px)", zIndex: 2 }}
          />

          {/* Center (Top Layer) */}
          <img
            src="/parlay1.png"
            alt="Parlay Center"
            className="absolute w-[200px] drop-shadow-[0_0_40px_rgba(168,85,247,0.9)] animate-gentleFloat"
            style={{ zIndex: 3 }}
          />

          {/* Right Tilt */}
          <img
            src="/parlay3.png"
            alt="Parlay Right"
            className="absolute w-[200px] rotate-[10deg] drop-shadow-[0_0_25px_rgba(168,85,247,0.6)] transition-transform duration-700"
            style={{ right: "calc(50% - 260px)", zIndex: 2 }}
          />
        </div>
      </div>

      {/* --- Title Overlay --- */}
      <div className="text-center mb-10 flex flex-col items-center justify-center">
        <img
          src="/pickvision-logo.png"
          alt="Pick Vision Logo"
          className="w-[300px] md:w-[400px] drop-shadow-[0_0_45px_rgba(168,85,247,0.9)] mb-6 animate-gentleFloat"
        />
        <p className="text-gray-300 text-lg md:text-xl tracking-wide p-5 mt-6"
          style={{ zIndex: 1 }}>
          Your Personal AI Sports Betting Analyst
        </p>
      </div>

      {/* --- Purple Button to Toggle Login --- */}
      <button
        onClick={() => setShowLogin(!showLogin)}
        className="absolute top-6 right-6 bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white font-semibold py-2 px-6 rounded-xl shadow-lg hover:scale-105 transition-transform duration-300 z-10"
      >
        {showLogin ? "Close" : "Sign In / Sign Up"}
      </button>

      {/* --- Auth Card --- */}
      {showLogin && (
        <div className="absolute top-20 right-6 w-[260px] animate-fadeIn">
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

      {/* --- Footer --- */}
      <footer className="absolute bottom-4 text-xs text-gray-500">
        © {new Date().getFullYear()} Pick Vision AI. For entertainment purposes only.
      </footer>
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
