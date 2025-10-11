"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface HowToPlayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HowToPlayModal({ isOpen, onClose }: HowToPlayModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const modalContent = isOpen && mounted ? createPortal(
    <div 
      className="fixed top-0 left-0 right-0 bottom-0 bg-black/60 backdrop-blur-sm overflow-y-auto transition-all duration-200"
      style={{ zIndex: 9999 }}
      onClick={onClose}
    >
      <div className="min-h-screen flex items-center justify-center p-4">
        <div 
          className="bg-surface border border-border rounded-lg shadow-2xl max-w-2xl w-full p-6 md:p-8 relative my-8 transition-all duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-foreground-muted hover:text-foreground transition-colors"
            aria-label="Close"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              className="h-6 w-6"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Modal content */}
          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">How to Play</h2>
              <p className="text-foreground-muted text-sm">Get started with Tenjaku Fantasy Cricket</p>
            </div>

            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-semibold">
                  1
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Claim 500 Boson from Testnet (1 Boson = 1 USDC) </h3>
                  <p className="text-sm text-foreground-muted">Start by claiming your testnet tokens to begin trading.</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-semibold">
                  2
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Collect Players from Marketplace</h3>
                  <p className="text-sm text-foreground-muted">Purchase player tokens from the marketplace using USDC.</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-semibold">
                  3
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Build Your Lineups</h3>
                  <p className="text-sm text-foreground-muted">Select your favorite players to create winning combinations.</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-semibold">
                  4
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Weekly Tournaments</h3>
                  <p className="text-sm text-foreground-muted">Tournaments are held weekly for regular seasons. Compete and climb the leaderboard!</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-semibold">
                  5
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Earn Rewards</h3>
                  <p className="text-sm text-foreground-muted">When a tournament ends, each player is assigned a score. You&apos;re rewarded based on your holdings!</p>
                </div>
              </div>
            </div>

            {/* Fantasy Points Link */}
            <div className="text-center">
              <a
                href="/fantasy-points"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:text-blue-400 text-sm font-medium transition-colors animate-pulse cursor-pointer inline-block"
              >
                Click to see how fantasy points are calculated
              </a>
            </div>

            <div className="pt-2 border-t border-border">
              <button
                onClick={onClose}
                className="w-full inline-flex items-center justify-center rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  ) : null;

  return <>{modalContent}</>;
}

