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
      <div className="absolute inset-0 flex justify-center items-center -z-10 overflow-hidden">
        <div className="relative w-[900px] h-[700px]">
          <img
            src="/parlay1.png"
            alt="Winning Parlay"
            className="absolute top-0 left-1/2 w-[380px] -translate-x-1/2 rotate-[-8deg] opacity-70 animate-float-slow drop-shadow-2xl rounded-xl"
          />
          <img
            src="/parlay2.png"
            alt="Winning Parlay 2"
            className="absolute top-10 left-[35%] w-[380px] rotate-[7deg] opacity-60 animate-float-slower drop-shadow-2xl rounded-xl"
          />
          <img
            src="/parlay3.png"
            alt="Winning Parlay 3"
            className="absolute top-20 left-[55%] w-[380px] rotate-[-4deg] opacity-50 animate-float-slowest drop-shadow-2xl rounded-xl"
          />
        </div>
      </div>

      {/* --- Title Overlay --- */}
      <div className="text-center mb-10">
        <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-purple-500 to-fuchsia-500 bg-clip-text text-transparent drop-shadow-lg">
          Pick Vision AI
        </h1>
        <p className="mt-3 text-gray-400 text-lg md:text-xl">
          Your Personal AI Sports Betting Analyst
        </p>
      </div>

      {/* --- Auth Card --- */}
      <div className="absolute top-6 right-6 w-[320px]">
        <Card className="backdrop-blur-md bg-white/10 border border-white/20 shadow-lg p-6 rounded-xl">
          <h2 className="text-xl font-semibold text-center text-white mb-4">
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
              {isLoading ? <LoadingSpinner className="w-5 h-5" /> : isLoginView ? "Sign In" : "Sign Up"}
            </Button>
          </form>
          <div className="mt-3 text-center">
            <button
              onClick={toggleView}
              className="text-sm text-purple-400 hover:text-purple-300 hover:underline"
            >
              {isLoginView ? "Need an account? Sign up" : "Already have an account? Sign in"}
            </button>
          </div>
        </Card>
      </div>

      <footer className="absolute bottom-4 text-xs text-gray-500">
        © {new Date().getFullYear()} Pick Vision AI. For entertainment purposes only.
      </footer>
    </div>
  );
};

// --- Floating Animation Keyframes ---
const style = document.createElement("style");
style.innerHTML = `
@keyframes float-slow {
  0%, 100% { transform: translateY(0) rotate(-8deg); }
  50% { transform: translateY(-10px) rotate(-8deg); }
}
@keyframes float-slower {
  0%, 100% { transform: translateY(0) rotate(7deg); }
  50% { transform: translateY(10px) rotate(7deg); }
}
@keyframes float-slowest {
  0%, 100% { transform: translateY(0) rotate(-4deg); }
  50% { transform: translateY(-6px) rotate(-4deg); }
}
.animate-float-slow { animation: float-slow 6s ease-in-out infinite; }
.animate-float-slower { animation: float-slower 7s ease-in-out infinite; }
.animate-float-slowest { animation: float-slowest 8s ease-in-out infinite; }
`;
document.head.appendChild(style);
