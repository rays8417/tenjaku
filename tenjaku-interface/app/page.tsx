"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

declare global {
  interface Window {
    aptos?: any;
  }
}

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const attemptReconnect = async () => {
      try {
        if (typeof window !== "undefined" && window.aptos) {
          if (typeof window.aptos.isConnected === "function") {
            const connected = await window.aptos.isConnected();
            if (!connected) return;
          }
          const account = await window.aptos.account();
          if (account?.address) {
            // Redirect connected users to tournaments page immediately
            router.replace("/tournaments");
          }
        }
      } catch (_) {
        // silently ignore on first load
      }
    };

    attemptReconnect();
  }, [router]);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-20">
        {/* Logo */}
        <div className="text-center mb-16">
          <h1 className="text-6xl md:text-8xl font-bold text-black mb-4">
            Tenjaku
          </h1>
          <div className="w-24 h-1 bg-black mx-auto"></div>
        </div>

        {/* Main Message */}
        <div className="text-center max-w-3xl mb-20">
          <h2 className="text-3xl md:text-5xl font-bold text-black mb-6">
            Fantasy Cricket Meets Blockchain
          </h2>
          <p className="text-xl text-gray-600 leading-relaxed">
            Trade cricket player tokens, build winning teams, and compete for rewards 
            in the ultimate fantasy cricket experience.
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 max-w-4xl">
          <div className="text-center">
            <div className="text-5xl mb-4">⚡</div>
            <h3 className="text-xl font-semibold mb-2 text-black">Trade Tokens</h3>
            <p className="text-gray-600">Buy and sell player tokens in real-time</p>
          </div>
          <div className="text-center">
            <div className="text-5xl mb-4">🏏</div>
            <h3 className="text-xl font-semibold mb-2 text-black">Build Teams</h3>
            <p className="text-gray-600">Create your dream cricket lineup</p>
          </div>
          <div className="text-center">
            <div className="text-5xl mb-4">🏆</div>
            <h3 className="text-xl font-semibold mb-2 text-black">Win Rewards</h3>
            <p className="text-gray-600">Compete in tournaments and earn prizes</p>
          </div>
        </div>

        {/* Simple CTA */}
        <div className="text-center mt-20">
          <p className="text-lg text-gray-700 mb-4">
            Ready to get started?
          </p>
          <p className="text-gray-500">
            Connect your wallet using the button in the navigation bar
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 text-center border-t border-gray-100">
        <p className="text-sm text-gray-500">
          © 2025 Tenjaku
        </p>
      </footer>
    </div>
  );
}
