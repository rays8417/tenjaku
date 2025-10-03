"use client";

import { useRouter } from "next/navigation";
import { useWallet } from "../contexts/WalletContext";

export default function Home() {
  const router = useRouter();
  const { account, isConnecting, connectWallet } = useWallet();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero */}
      <section className="relative flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/4 right-0 h-[600px] w-[600px] rounded-full bg-brand-gradient blur-3xl opacity-20" />
          <div className="absolute bottom-0 left-0 h-[500px] w-[500px] rounded-full bg-brand-gradient blur-3xl opacity-15" />
        </div>
        
        <div className="relative mx-auto max-w-6xl px-6 py-20 text-center">
          <h1 className="text-6xl md:text-8xl font-bold tracking-tight text-white">
            <span className="block">Predict.</span>
            <span className="block bg-clip-text text-transparent bg-gradient-to-r from-brand-400 via-brand-500 to-brand-300">
              Compete.
            </span>
            <span className="block">Win.</span>
          </h1>
          
          <p className="mt-8 mx-auto max-w-2xl text-xl md:text-2xl text-white/60 leading-relaxed font-light">
            Cricket Fan Score Predictions
          </p>

          <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
            {account ? (
              <button
                onClick={() => router.push("/tournaments")}
                className="inline-flex items-center justify-center rounded-lg px-8 py-4 text-base font-medium text-white bg-brand-gradient hover:opacity-90 transition-opacity shadow-xl shadow-brand-500/20"
              >
                Enter App
              </button>
            ) : (
              <button
                onClick={async () => {
                  await connectWallet();
                }}
                disabled={isConnecting}
                className="inline-flex items-center justify-center rounded-lg px-8 py-4 text-base font-medium text-white bg-brand-gradient hover:opacity-90 transition-opacity shadow-xl shadow-brand-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isConnecting ? "Connecting..." : "Get Started"}
              </button>
            )}
          </div>

          {/* Stats Bar */}
          <div className="mt-20 grid grid-cols-1 sm:grid-cols-3 gap-6">
            <StatCard value="Live" label="Real-time Tournaments" />
            <StatCard value="On-chain" label="Transparent & Fair" />
            <StatCard value="Instant" label="Automated Payouts" />
          </div>
        </div>
      </section>

      
    </div>
  );
}

type StatCardProps = {
  value: string;
  label: string;
};

function StatCard({ value, label }: StatCardProps) {
  return (
    <div className="bg-card border border-white/10 rounded-xl px-6 py-8 text-center backdrop-blur-sm hover:border-brand-500/50 transition-colors">
      <div className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-brand-300">{value}</div>
      <div className="mt-2 text-sm text-white/70 font-medium">{label}</div>
    </div>
  );
}

type FeatureCardProps = {
  title: string;
  desc: string;
};

function FeatureCard({ title, desc }: FeatureCardProps) {
  return (
    <div className="group relative rounded-2xl border border-white/10 bg-card p-8 transition-all hover:border-white/20">
      <h3 className="text-2xl font-bold text-white mb-3">{title}</h3>
      <p className="text-white/60 leading-relaxed">{desc}</p>
    </div>
  );
}
