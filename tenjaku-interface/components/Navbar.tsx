"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useWallet } from "../contexts/WalletContext";
import { useState } from "react";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { account, isConnecting, connectWallet, disconnectWallet } = useWallet();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isLanding = pathname === "/";

  const NavLink = ({ href, label }: { href: string; label: string }) => {
    const isActive = pathname === href;
    return (
      <Link
        href={href}
        className={`relative px-3 py-2 text-sm font-medium rounded-md transition-colors ${
          isActive ? "text-white" : "text-muted-foreground hover:text-white"
        }`}
        onClick={() => setMobileOpen(false)}
      >
        {label}
        {isActive && (
          <span className="pointer-events-none absolute -bottom-[6px] left-2 right-2 h-[2px] rounded bg-gradient-to-r from-brand-400 via-brand-500 to-brand-400" />
        )}
      </Link>
    );
  };

  return (
    <header className={`sticky top-0 z-40 ${isLanding ? "" : "border-b border-border/60"} bg-black/40 backdrop-blur supports-[backdrop-filter]:bg-black/30`}>
      <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2 group">
          <span className="text-lg font-semibold tracking-tight text-white group-hover:text-white">
            Tenjaku
          </span>
        </Link>

        <div className="flex items-center gap-3">
          {/* Desktop Navigation (hidden on landing) */}
          {!isLanding && (
            <nav className="hidden md:flex items-center gap-1.5">
              <NavLink href="/tournaments" label="Tournaments" />
              <NavLink href="/my-teams" label="My Teams" />
              <NavLink href="/swaps" label="Swaps" />
              <NavLink href="/leaderboard" label="Leaderboard" />
            </nav>
          )}

          {/* Right Section */}
          <div className="hidden sm:flex items-center gap-3">
            {isLanding ? (
              account ? (
                <button
                  onClick={() => router.push("/my-teams")}
                  className="inline-flex items-center justify-center rounded-md border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white hover:bg-white/10 transition-colors"
                >
                  Enter App
                </button>
              ) : (
                <button
                  onClick={async () => {
                    await connectWallet();
                  }}
                  disabled={isConnecting}
                  className="inline-flex items-center justify-center rounded-md border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isConnecting ? "Connecting..." : "Connect Wallet"}
                </button>
              )
            ) : account ? (
              <div className="flex items-center gap-3">
                <div className="px-2.5 py-1.5 bg-muted text-white/90 text-sm font-mono rounded-md border border-border/70">
                  {account.address?.slice(0, 6)}...{account.address?.slice(-4)}
                </div>
                <button
                  onClick={disconnectWallet}
                  className="px-3 py-2 text-sm rounded-md border border-white/10 text-white/90 hover:text-white transition-colors"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                onClick={async () => {
                  await connectWallet();
                }}
                disabled={isConnecting}
                className="inline-flex items-center justify-center rounded-md border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isConnecting ? "Connecting..." : "Connect Wallet"}
              </button>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/10 bg-white/5 text-white hover:bg-white/10"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              className="h-5 w-5"
            >
              {mobileOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border/60 bg-black/70 backdrop-blur supports-[backdrop-filter]:bg-black/60">
          {!isLanding && (
            <nav className="mx-auto max-w-7xl px-4 py-3 flex flex-col gap-1">
              <NavLink href="/tournaments" label="Tournaments" />
              <NavLink href="/my-teams" label="My Teams" />
              <NavLink href="/swaps" label="Swaps" />
              <NavLink href="/leaderboard" label="Leaderboard" />
            </nav>
          )}
          <div className="mx-auto max-w-7xl px-4 pb-4">
            {isLanding ? (
              account ? (
                <button
                  onClick={() => {
                    setMobileOpen(false);
                    router.push("/my-teams");
                  }}
                  className="mt-2 w-full inline-flex items-center justify-center rounded-md border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white hover:bg-white/10"
                >
                  Enter App
                </button>
              ) : (
                <button
                  onClick={async () => {
                    await connectWallet();
                    setMobileOpen(false);
                  }}
                  disabled={isConnecting}
                  className="mt-2 w-full inline-flex items-center justify-center rounded-md border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isConnecting ? "Connecting..." : "Connect Wallet"}
                </button>
              )
            ) : account ? (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <div className="col-span-2 px-2.5 py-1.5 bg-muted text-white/90 text-sm font-mono rounded-md border border-border/70 text-center">
                  {account.address?.slice(0, 10)}...{account.address?.slice(-6)}
                </div>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="px-3 py-2 text-sm rounded-md border border-white/10 text-white/90 hover:bg-white/10"
                >
                  Close
                </button>
                <button
                  onClick={async () => {
                    await disconnectWallet();
                    setMobileOpen(false);
                  }}
                  className="px-3 py-2 text-sm rounded-md border border-white/10 text-white/90 hover:text-white"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                onClick={async () => {
                  await connectWallet();
                  setMobileOpen(false);
                }}
                disabled={isConnecting}
                className="mt-2 w-full inline-flex items-center justify-center rounded-md border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isConnecting ? "Connecting..." : "Connect Wallet"}
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
