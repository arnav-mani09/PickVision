import React, { useState } from "react";
import { Card } from "./components/ui/Card";
import { Input } from "./components/ui/Input";
import { Button } from "./components/ui/Button";
import { LoadingSpinner } from "./components/ui/LoadingSpinner";
import type { User } from "./types";
import { supabase } from "./services/supabaseClient";

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

    try {
      if (isLoginView) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          setError(error.message);
          return;
        }
        if (data.session?.user) {
          onLoginSuccess({ id: data.session.user.id, email: data.session.user.email || email });
        }
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) {
          setError(error.message);
          return;
        }
        if (data.session?.user) {
          onLoginSuccess({ id: data.session.user.id, email: data.session.user.email || email });
        } else {
          setError("Check your email to confirm your account before signing in.");
        }
      }
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
        <nav className="hidden md:flex gap-6 text-sm text-gray-300">
          <a href="#news" className="hover:text-white">Sports News</a>
          <a href="#articles" className="hover:text-white">Articles</a>
          <a href="#get-started" className="hover:text-white">Get Started</a>
        </nav>
        <button
          onClick={() => setShowLogin(!showLogin)}
          className="bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white font-semibold py-2 px-4 rounded-xl shadow-lg hover:scale-[1.02] transition-transform duration-300"
        >
          {showLogin ? "Close" : "Sign In / Sign Up"}
        </button>
      </header>

      <main className="relative z-10">
        <section className="relative px-6 py-16 md:py-24">
          <div className="absolute inset-0 opacity-30">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.25),transparent_55%)]" />
          </div>
          <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-10 items-center">
            <div>
              <h1 className="text-4xl md:text-5xl font-extrabold text-white leading-tight">
                PickVision AI: Smarter Sports Betting Analysis
              </h1>
              <p className="mt-4 text-gray-300 text-lg">
                Upload your parlay, verify each leg, and get sharper insights with contextual data,
                trends, and AI-powered suggestions. Built for bettors who want clarity without the noise.
              </p>
              <div className="mt-6 flex flex-wrap gap-4">
                <a
                  href="#get-started"
                  className="bg-purple-600 text-white font-semibold px-5 py-3 rounded-lg shadow hover:bg-purple-500"
                >
                  Start Exploring
                </a>
              </div>
            </div>
            <div className="relative">
              <div className="absolute -inset-6 bg-purple-600/10 blur-2xl rounded-full" />
              <div className="relative grid grid-cols-3 gap-4">
                <img
                  src="/parlay2.png"
                  alt="Parlay Left"
                  className="rounded-xl border border-purple-500/40 shadow-[0_0_25px_rgba(168,85,247,0.4)]"
                />
                <img
                  src="/parlay1.png"
                  alt="Parlay Center"
                  className="rounded-xl border border-purple-500/60 shadow-[0_0_30px_rgba(168,85,247,0.7)] animate-gentleFloat"
                />
                <img
                  src="/parlay3.png"
                  alt="Parlay Right"
                  className="rounded-xl border border-purple-500/40 shadow-[0_0_25px_rgba(168,85,247,0.4)]"
                />
              </div>
            </div>
          </div>
        </section>

        <section id="news" className="px-6 py-16 md:py-20">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-white">Sports News by League</h2>
            <p className="mt-3 text-gray-400">
              Browse recent updates across major sports. Each card links to fresh coverage.
            </p>
            <div className="mt-8 grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  title: "NBA",
                  link: "https://www.espn.com/nba/",
                  image:
                    "https://upload.wikimedia.org/wikipedia/en/0/03/National_Basketball_Association_logo.svg",
                },
                {
                  title: "NFL",
                  link: "https://www.espn.com/nfl/",
                  image:
                    "https://upload.wikimedia.org/wikipedia/en/a/a2/National_Football_League_logo.svg",
                },
                {
                  title: "MLB",
                  link: "https://www.espn.com/mlb/",
                  image:
                    "/mlb.png",
                },
                {
                  title: "NHL",
                  link: "https://www.espn.com/nhl/",
                  image:
                    "/nhl.png",
                },
              ].map((item) => (
                <a
                  key={item.title}
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative h-48 rounded-xl overflow-hidden border border-white/10 bg-black"
                >
                  <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/70 to-black/90" />
                  <div className="relative h-full flex flex-col items-center justify-center gap-3">
                    <img
                      src={item.image}
                      alt={`${item.title} logo`}
                      className="h-16 w-auto drop-shadow-[0_0_12px_rgba(255,255,255,0.35)]"
                    />
                    <div className="text-center">
                      <span className="text-lg font-semibold text-white">{item.title}</span>
                      <p className="text-xs text-gray-300">Latest headlines</p>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </section>

        <section id="articles" className="px-6 py-16 md:py-20 bg-gradient-to-b from-gray-950 to-black">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-white">Featured Betting Reads</h2>
            <p className="mt-3 text-gray-400">
              Curated reads to sharpen your edge. Replace these with your own original articles as you publish.
            </p>
            <div className="mt-8 grid md:grid-cols-2 gap-6">
              {[
                {
                  title: "How Injury Reports Move Lines Overnight",
                  link: "https://www.espn.com/chalk/",
                  tag: "Market Movement",
                  image:
                    "/injury.jpg",
                },
                {
                  title: "Props vs. Parlays: When to Go Single-Play",
                  link: "https://www.espn.com/chalk/",
                  tag: "Strategy",
                  image:
                    "/prop.jpg",
                },
                {
                  title: "Tracking Streaks Without Chasing",
                  link: "https://www.espn.com/chalk/",
                  tag: "Discipline",
                  image:
                    "/streak.jpeg",
                },
                {
                  title: "The Matchup Matrix: Finding Hidden Value",
                  link: "https://www.espn.com/chalk/",
                  tag: "Analytics",
                  image:
                    "/value.jpg",
                },
              ].map((article) => (
                <a
                  key={article.title}
                  href={article.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative rounded-xl border border-white/10 overflow-hidden"
                >
                  <div
                    className="h-56 bg-cover bg-center"
                    style={{ backgroundImage: `url(${article.image})` }}
                  />
                  <div className="p-5 bg-black/80">
                    <span className="text-xs text-purple-300 uppercase tracking-wide">{article.tag}</span>
                    <h3 className="mt-2 text-lg font-semibold text-white group-hover:text-purple-200">
                      {article.title}
                    </h3>
                    <p className="mt-2 text-sm text-gray-400">Read more →</p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </section>

        <section id="get-started" className="px-6 py-16 md:py-20">
          <div className="max-w-5xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-white">Ready to Analyze Your Parlays?</h2>
            <p className="mt-3 text-gray-400">
              Keep your edge sharp with fast, AI-driven analysis and a clean betting workflow.
            </p>
            <button
              onClick={() => setShowLogin(true)}
              className="mt-6 bg-purple-600 text-white font-semibold px-6 py-3 rounded-lg shadow hover:bg-purple-500"
            >
              Sign In / Sign Up
            </button>
          </div>
        </section>
      </main>

      {showLogin && (
        <div className="fixed bottom-6 right-6 w-[280px] animate-fadeIn z-[50]">
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

      <footer className="border-t border-white/10 px-6 py-6 text-center text-xs text-gray-500">
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
