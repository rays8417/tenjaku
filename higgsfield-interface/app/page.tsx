"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

declare global {
  interface Window {
    aptos?: any;
  }
}

export default function Home() {
  const [isPetraInstalled, setIsPetraInstalled] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const isInstalled = typeof window !== "undefined" && !!window.aptos;
    setIsPetraInstalled(isInstalled);

    const attemptReconnect = async () => {
      try {
        if (!isInstalled || !window.aptos) return;
        if (typeof window.aptos.isConnected === "function") {
          const connected = await window.aptos.isConnected();
          if (!connected) return;
        }
        const account = await window.aptos.account();
        if (account?.address) {
          // Redirect connected users to tournaments page immediately
          router.replace("/tournaments");
        }
      } catch (_) {
        // silently ignore on first load
      }
    };

    attemptReconnect();
  }, [router]);

  const petraInstallUrl = useMemo(
    () => "https://petra.app/",
    []
  );

  const handleConnect = useCallback(async () => {
    setErrorMessage(null);
    if (!window.aptos) {
      window.open(petraInstallUrl, "_blank");
      return;
    }
    try {
      setIsConnecting(true);
      await window.aptos.connect();
      const account = await window.aptos.account();
      if (account?.address) {
        // Redirect to tournaments page after successful connection
        router.push("/tournaments");
      }
    } catch (error: any) {
      const message = error?.message || "Failed to connect to Petra";
      setErrorMessage(message);
    } finally {
      setIsConnecting(false);
    }
  }, [petraInstallUrl, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-white relative overflow-hidden flex items-center justify-center">
      {/* Dynamic Sporty Background Pattern */}
      <div className="absolute inset-0 opacity-[0.08]">
        {/* Animated Circles */}
        <div className="absolute top-20 -right-20 w-96 h-96 border-[40px] border-black rounded-full animate-pulse" />
        <div className="absolute bottom-20 -left-20 w-80 h-80 border-[30px] border-black rounded-full animate-bounce" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border-[50px] border-black rounded-full animate-spin" style={{animationDuration: '20s'}} />
        
        {/* Sporty Geometric Patterns */}
        <div className="absolute top-1/4 left-1/4 w-32 h-32 border-4 border-black transform rotate-45 animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-24 h-24 bg-black transform rotate-12 animate-bounce" />
        <div className="absolute top-3/4 left-1/3 w-16 h-16 border-4 border-black rounded-full animate-ping" />
        
        {/* Cricket-themed Lines */}
        <div className="absolute top-1/3 right-1/3 w-64 h-1 bg-black transform rotate-12 animate-pulse" />
        <div className="absolute bottom-1/3 left-1/3 w-48 h-1 bg-black transform -rotate-12 animate-bounce" />
      </div>

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:50px_50px]" />

      {/* Main Content */}
      <main className="relative text-center px-6 max-w-4xl z-10">
        {/* Logo/Brand with Enhanced Effects */}
        <div className="mb-16 relative">
          <div className="relative inline-block">
            <h1 className="text-8xl md:text-9xl font-black text-black mb-2 tracking-tighter uppercase relative z-10 transform hover:scale-105 transition-transform duration-300">
            Tenjaku
            </h1>
            
            {/* Text Shadow Effects */}
           
          </div>
          
          {/* Enhanced Underline */}
          <div className="flex items-center justify-center mt-8 space-x-4">
            <div className="h-1 w-16 bg-black" />
            <div className="h-2 w-24 bg-black" />
            <div className="h-1 w-16 bg-black" />
          </div>
        </div>

        {/* Enhanced Taglines */}
        <div className="mb-16 space-y-6">
          <p className="text-3xl md:text-4xl text-black font-black mb-4 uppercase tracking-wider transform hover:scale-105 transition-transform duration-300">
            Fantasy Cricket Meets Blockchain
          </p>
          
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 text-lg md:text-xl text-gray-700 font-bold uppercase tracking-wide">
            <span className="px-4 py-2 border-2 border-black transform hover:bg-black hover:text-white transition-all duration-300 cursor-default">
              ⚡ Trade Player Tokens
            </span>
            <span className="px-4 py-2 border-2 border-black transform hover:bg-black hover:text-white transition-all duration-300 cursor-default">
              🏏 Build Dream Teams
            </span>
            <span className="px-4 py-2 border-2 border-black transform hover:bg-black hover:text-white transition-all duration-300 cursor-default">
              🏆 Compete for Glory
            </span>
          </div>
        </div>

        {/* Enhanced Connect Wallet Section */}
        <div className="flex flex-col items-center justify-center gap-8">
          {isPetraInstalled ? (
            <div className="relative group">
              <button
                onClick={handleConnect}
                disabled={isConnecting}
                className="relative px-16 py-8 bg-black text-white font-black text-3xl uppercase tracking-wider shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[6px] hover:translate-y-[6px] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform group-hover:scale-105"
              >
                {isConnecting ? "CONNECTING..." : "CONNECT WALLET ⚡"}
                {/* Button Border Effect */}
                <div className="absolute inset-0 border-4 border-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </button>
            </div>
          ) : (
            <div className="relative group">
              <a
                href={petraInstallUrl}
                target="_blank"
                rel="noreferrer"
                className="relative px-16 py-8 bg-black text-white font-black text-3xl uppercase tracking-wider shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[6px] hover:translate-y-[6px] transition-all duration-300 transform group-hover:scale-105 inline-block"
              >
                INSTALL PETRA WALLET 🏏
                {/* Button Border Effect */}
                <div className="absolute inset-0 border-4 border-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </a>
            </div>
          )}

          {errorMessage && (
            <div className="mt-4 px-8 py-4 bg-white border-4 border-black text-black font-black text-lg uppercase shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
              ⚠️ {errorMessage}
            </div>
          )}

          {/* Sporty Stats/Features */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl">
            <div className="px-6 py-4 border-4 border-black bg-white transform hover:bg-black hover:text-white transition-all duration-300">
              <div className="text-4xl font-black mb-2">10+</div>
              <div className="text-sm font-bold uppercase tracking-wider">Player Tokens</div>
            </div>
            <div className="px-6 py-4 border-4 border-black bg-white transform hover:bg-black hover:text-white transition-all duration-300">
              <div className="text-4xl font-black mb-2">24/7</div>
              <div className="text-sm font-bold uppercase tracking-wider">Trading</div>
            </div>
            <div className="px-6 py-4 border-4 border-black bg-white transform hover:bg-black hover:text-white transition-all duration-300">
              <div className="text-4xl font-black mb-2">🏆</div>
              <div className="text-sm font-bold uppercase tracking-wider">Rewards</div>
            </div>
          </div>
        </div>

        {/* Enhanced Info Text */}
        <p className="mt-16 text-lg text-gray-700 font-bold uppercase tracking-wide">
          Connect your Petra wallet to start playing
        </p>
      </main>

      {/* Enhanced Footer */}
      <div className="absolute bottom-8 left-0 right-0 text-center z-10">
        <div className="flex flex-col items-center space-y-4">
          {/* Sporty Footer Text */}
          <p className="text-sm font-black uppercase tracking-wider text-gray-600 border-2 border-gray-600 px-6 py-2 transform hover:bg-gray-600 hover:text-white transition-all duration-300">
            © 2025 HIGGS FIELD • BUILT ON APTOS
          </p>
          
          {/* Tech Stack Icons */}
          <div className="flex items-center space-x-6 text-2xl">
            <span className="transform hover:scale-125 transition-transform duration-300">⚡</span>
            <span className="transform hover:scale-125 transition-transform duration-300">🏏</span>
            <span className="transform hover:scale-125 transition-transform duration-300">🔗</span>
            <span className="transform hover:scale-125 transition-transform duration-300">💎</span>
          </div>
        </div>
      </div>
    </div>
  );
}
