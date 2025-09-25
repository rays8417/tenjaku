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
        return;
      }
      
      const response = await window.aptos.connect();
      setAccount(response);
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
