"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

// Extend Window interface for Aptos wallet
declare global {
  interface Window {
    aptos?: any;
  }
}

interface WalletContextType {
  account: any;
  isConnecting: boolean;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<any>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // Track user connection to backend
  const trackUser = async (address: string) => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';
      await fetch(`${backendUrl}/api/users/track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ address }),
      });
    } catch (error) {
      // Silently fail - don't block user experience if tracking fails
      console.error("Failed to track user:", error);
    }
  };

  // Wallet connection functions
  const connectWallet = async () => {
    try {
      if (!window.aptos) {
        alert("Please install Petra wallet or another Aptos wallet extension");
        return;
      }
      
      setIsConnecting(true);
      
      // Check if already connected first
      const isConnected = await window.aptos.isConnected();
      if (isConnected) {
        const account = await window.aptos.account();
        setAccount(account);
        // Track user connection
        await trackUser(account.address);
        return;
      }
      
      const response = await window.aptos.connect();
      setAccount(response);
      // Track user connection
      await trackUser(response.address);
      console.log("✅ Connected to wallet:", response);
    } catch (error) {
      console.error("❌ Wallet connection failed:", error);
      alert("Failed to connect wallet. Please try again.");
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = async () => {
    try {
      if (window.aptos && window.aptos.disconnect) {
        await window.aptos.disconnect();
      }
      setAccount(null);
      console.log("🔌 Wallet disconnected");
    } catch (error) {
      console.error("❌ Wallet disconnection failed:", error);
    }
  };

  // Check wallet connection on mount
  useEffect(() => {
    const checkWalletConnection = async () => {
      try {
        if (window.aptos) {
          const isConnected = await window.aptos.isConnected();
          if (isConnected) {
            const account = await window.aptos.account();
            setAccount(account);
            // Track user if already connected
            await trackUser(account.address);
          }
        }
      } catch (error) {
        console.error("Error checking wallet connection:", error);
      }
    };

    checkWalletConnection();
  }, []);

  return (
    <WalletContext.Provider value={{ account, isConnecting, connectWallet, disconnectWallet }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
}
