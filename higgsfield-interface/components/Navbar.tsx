"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWallet } from "../contexts/WalletContext";

export default function Navbar() {
  const pathname = usePathname();
  const { account, isConnecting, connectWallet, disconnectWallet } = useWallet();

  const navItems = [
    { href: "/tournaments", label: "Tournaments" },
    { href: "/my-teams", label: "My Teams" },
    { href: "/swaps", label: "Swaps" },
    { href: "/leaderboard", label: "Leaderboard" },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white border-b-4 border-black">
      <div className="mx-auto max-w-7xl px-6 h-20 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="h-12 w-12 bg-black flex items-center justify-center transform group-hover:scale-105 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)]">
            <span className="text-white font-black text-2xl">H</span>
          </div>
          <span className="font-black text-2xl tracking-tighter uppercase">Tenjaku</span>
        </Link>
        
        <div className="flex items-center gap-6">
          {/* Navigation Links */}
          <nav className="flex items-center gap-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-5 py-2.5 text-sm font-black uppercase tracking-wider transition-all ${
                    isActive
                      ? "bg-black text-white shadow-[4px_4px_0px_0px_rgba(1,1,1,1)]"
                      : "border-2 border-black text-black hover:bg-black hover:text-white hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          
          {/* Wallet Connection Button */}
          <div className="flex items-center gap-3">
            {account ? (
              <div className="flex items-center gap-3">
                <div className="px-4 py-2.5 bg-white border-2 border-black text-black text-sm font-black uppercase tracking-wider shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  {account.address?.slice(0, 6)}...{account.address?.slice(-4)}
                </div>
                <button
                  onClick={disconnectWallet}
                  className="px-4 py-2.5 text-sm font-black uppercase tracking-wider border-2 border-black text-black hover:bg-black hover:text-white transition-all"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                onClick={connectWallet}
                disabled={isConnecting}
                className="px-6 py-3 bg-black text-white text-sm font-black uppercase tracking-wider shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isConnecting ? "CONNECTING..." : "CONNECT WALLET"}
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
