"use client";

import { useRouter } from "next/navigation";
import { useWallet } from "../contexts/WalletContext";
import LiquidEther from "../components/LiquidEther";

export default function Home() {
  const router = useRouter();
  const { account, isConnecting, connectWallet } = useWallet();

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Hero */}
      <section className="relative flex items-center justify-center flex-1 bg-gradient-to-b from-background via-background-elevated to-background overflow-hidden">
        {/* Liquid Ether Background */}
        <div className="absolute inset-0 overflow-hidden">
          <LiquidEther
            colors={['##1c9cf0', '#5B9FFF', '#7AAFFF', '#3A80EF']}
            mouseForce={30}
            cursorSize={180}
            resolution={0.6}
            autoDemo={true}
            autoSpeed={0.5}
            autoIntensity={2.5}
            autoResumeDelay={2000}
            viscous={30}
            className="w-full h-full opacity-60"
          />
        </div>

        {/* Radial gradient overlay for depth */}
        <div className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-background pointer-events-none"></div>
        
        <div className="relative mx-auto max-w-7xl px-6 py-20 text-center z-10 pointer-events-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 mb-8 rounded-full bg-surface/50 backdrop-blur-md border border-border animate-fade-in">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
            <span className="text-sm font-medium text-foreground-muted">Beta is now live</span>
          </div>

          <h1 className="text-6xl md:text-8xl lg:text-9xl font-bold tracking-tight text-foreground animate-fade-in-up">
            <span className="block mb-2">Predict.</span>
            <span className="block mb-2 bg-clip-text text-transparent bg-gradient-to-r from-brand-400 via-brand-500 to-brand-300 animate-gradient-x">
              Compete.
            </span>
            <span className="block">Win.</span>
          </h1>
          
          <p className="mt-10 mx-auto max-w-3xl text-xl md:text-2xl lg:text-3xl text-foreground-muted leading-relaxed font-light animate-fade-in-delayed">
            Trade cricket player tokens. Compete in real-time tournaments.{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-brand-300 font-medium">
              Win real rewards.
            </span>
          </p>

          <div className="mt-14 flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-delayed-2">
            {account ? (
              <button
                onClick={() => router.push("/swaps")}
                className="group relative inline-flex items-center justify-center rounded-xl px-10 py-5 text-lg font-semibold text-primary-foreground bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 transition-all duration-300 shadow-lg shadow-primary/15 hover:shadow-primary/25 hover:scale-105 transform"
              >
                <span className="relative z-10">Start Playing</span>
                <svg 
                  className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-brand-400 to-brand-600 blur-lg opacity-20 group-hover:opacity-30 transition-opacity"></div>
              </button>
            ) : (
              <button
                onClick={async () => {
                  await connectWallet();
                }}
                disabled={isConnecting}
                className="group relative inline-flex items-center justify-center rounded-xl px-10 py-5 text-lg font-semibold text-primary-foreground bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 transition-all duration-300 shadow-lg shadow-primary/15 hover:shadow-primary/25 hover:scale-105 transform disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                <span className="relative z-10">{isConnecting ? "Connecting..." : "Get Started"}</span>
                {!isConnecting && (
                  <svg 
                    className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                )}
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-brand-400 to-brand-600 blur-lg opacity-20 group-hover:opacity-30 transition-opacity"></div>
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

type StatCardProps = {
  icon: React.ReactNode;
  value: string;
  label: string;
};

function StatCard({ icon, value, label }: StatCardProps) {
  return (
    <div className="group relative bg-gradient-to-br from-surface to-surface/0 border border-border rounded-2xl px-6 py-8 text-center backdrop-blur-sm hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-1">
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      <div className="relative">
        <div className="inline-flex items-center justify-center w-12 h-12 mb-4 rounded-xl bg-gradient-to-br from-primary/20 to-primary-hover/20 text-primary group-hover:scale-110 transition-transform duration-300">
          {icon}
        </div>
        <div className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-brand-400 via-brand-500 to-brand-300">{value}</div>
        <div className="mt-3 text-sm text-foreground-muted font-medium group-hover:text-foreground transition-colors">{label}</div>
      </div>
    </div>
  );
}

type FeatureCardProps = {
  title: string;
  desc: string;
};

function FeatureCard({ title, desc }: FeatureCardProps) {
  return (
    <div className="group relative rounded-2xl border border-border bg-card p-8 transition-all hover:border-border-strong">
      <h3 className="text-2xl font-bold text-foreground mb-3">{title}</h3>
      <p className="text-foreground-muted leading-relaxed">{desc}</p>
    </div>
  );
}
