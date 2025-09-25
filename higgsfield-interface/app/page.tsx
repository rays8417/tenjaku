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
  const [accountAddress, setAccountAddress] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [isPreloading, setIsPreloading] = useState<boolean>(true);
  const router = useRouter();

  useEffect(() => {
    const isInstalled = typeof window !== "undefined" && !!window.aptos;
    setIsPetraInstalled(isInstalled);

    const attemptReconnect = async () => {
      try {
        if (!isInstalled || !window.aptos) return;
        // If Petra remembers the site, account() should succeed without a prompt
        if (typeof window.aptos.isConnected === "function") {
          const connected = await window.aptos.isConnected();
          if (!connected) return;
        }
        const account = await window.aptos.account();
        if (account?.address) {
          setAccountAddress(account.address);
          router.replace("/my-teams");
        }
      } catch (_) {
        // silently ignore on first load
      }
    };

    attemptReconnect();
    const timer = setTimeout(() => {
      setIsPreloading(false);
      if (!accountAddress) {
        setShowModal(true);
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [router, accountAddress]);

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
      setAccountAddress(account?.address ?? null);
      if (account?.address) {
        router.push("/tournaments");
      }
    } catch (error: any) {
      const message = error?.message || "Failed to connect to Petra";
      setErrorMessage(message);
    } finally {
      setIsConnecting(false);
    }
  }, [petraInstallUrl, router]);

  const handleDisconnect = useCallback(async () => {
    setErrorMessage(null);
    if (window.aptos?.disconnect) {
      try {
        await window.aptos.disconnect();
      } catch (_) {
        // ignore disconnect errors
      }
    }
    setAccountAddress(null);
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      {!isPreloading && !showModal && (
      <main className="mx-auto max-w-5xl px-6 sm:px-12 py-16 sm:py-24">
        <section className="text-center sm:text-left">
          <div className="inline-flex items-center gap-2 rounded-full border border-black/10 dark:border-white/15 px-3 py-1 text-xs sm:text-sm text-black/70 dark:text-white/70 mb-6">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
            
          </div>
         
          
        </section>

        <section className="mt-10">
          <div className="relative mx-auto max-w-xl">
            <div className="absolute -inset-0.5 rounded-2xl bg-black/5 dark:bg-white/10 blur" />
            <div className="relative rounded-2xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-black/60 backdrop-blur p-6 sm:p-8 shadow-xl">
              {!isPetraInstalled && (
                <div className="text-center">
                  <h2 className="text-xl sm:text-2xl font-semibold">Petra not detected</h2>
                  <p className="mt-2 text-sm sm:text-base text-black/70 dark:text-white/70">
                    Install Petra to connect your wallet and continue.
                  </p>
                  <div className="mt-5">
                    <a
                      href={petraInstallUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center rounded-full bg-black dark:bg-white text-white dark:text-black hover:opacity-90 px-5 py-3 text-sm sm:text-base transition-opacity"
                    >
                      Install Petra
                    </a>
                  </div>
                </div>
              )}

              {isPetraInstalled && !accountAddress && (
                <div className="text-center">
                  <h2 className="text-xl sm:text-2xl font-semibold">Connect Petra</h2>
                  <p className="mt-2 text-sm sm:text-base text-black/70 dark:text-white/70">
                    Authorize this site to view your address and interact with Petra.
                  </p>
                  <div className="mt-5">
                    <button
                      onClick={handleConnect}
                      disabled={isConnecting}
                      className="inline-flex items-center justify-center rounded-full bg-black dark:bg-white text-white dark:text-black hover:opacity-90 px-5 py-3 text-sm sm:text-base transition-opacity disabled:opacity-60"
                    >
                      {isConnecting ? "Connecting…" : "Connect Petra"}
                    </button>
                  </div>
                  {errorMessage && (
                    <p className="mt-3 text-sm text-rose-600 dark:text-rose-400">{errorMessage}</p>
                  )}
                </div>
              )}

              {isPetraInstalled && accountAddress && (
                <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-black/60 dark:text-white/60">Connected address</p>
                    <p className="font-mono text-sm sm:text-base break-all">
                      {accountAddress}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <a
                      href={`https://explorer.aptoslabs.com/account/${accountAddress}`}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full border border-black/10 dark:border-white/15 px-4 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/5"
                    >
                      View on Explorer
                    </a>
                    <button
                      onClick={handleDisconnect}
                      className="rounded-full bg-transparent border border-black/10 dark:border-white/15 px-4 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/5"
                    >
                      Disconnect
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
      )}

      {isPreloading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div className="relative z-10 flex flex-col items-center">
            <div className="h-12 w-12 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            <p className="mt-4 text-white/80">Loading…</p>
          </div>
        </div>
      )}

      {showModal && !accountAddress && !isPreloading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div className="relative z-10 w-[92%] max-w-md rounded-2xl border border-white/20 bg-white/10 dark:bg-white/5 backdrop-blur-xl shadow-[0_8px_40px_rgba(0,0,0,0.4)] p-6">
            <h3 className="text-xl font-semibold">Connect your wallet</h3>
            <p className="mt-2 text-sm text-black/70 dark:text-white/70">
              Connect wallet to continue
            </p>
            <div className="mt-5 flex items-center gap-3">
              {isPetraInstalled ? (
                <button
                  onClick={handleConnect}
                  disabled={isConnecting}
                  className="inline-flex items-center justify-center rounded-full bg-black dark:bg-white text-white dark:text-black hover:opacity-90 px-5 py-2.5 text-sm transition-opacity disabled:opacity-60"
                >
                  {isConnecting ? "Connecting…" : "Connect Petra"}
                </button>
              ) : (
                <a
                  href={petraInstallUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center rounded-full bg-black dark:bg-white text-white dark:text-black hover:opacity-90 px-5 py-2.5 text-sm transition-opacity"
                >
                  Install Petra
                </a>
              )}
              
            </div>
            {errorMessage && (
              <p className="mt-3 text-sm text-rose-600 dark:text-rose-400">{errorMessage}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
