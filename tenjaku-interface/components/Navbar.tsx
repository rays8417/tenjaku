"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useWallet } from "../contexts/WalletContext";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { account, isConnecting, connectWallet, disconnectWallet } = useWallet();

  const navItems = [
    { href: "/tournaments", label: "Tournaments" },
    { href: "/my-teams", label: "My Teams" },
    { href: "/swaps", label: "Swaps" },
    { href: "/leaderboard", label: "Leaderboard" },
  ];

  const isLanding = pathname === "/";

  // Redirect to my-teams after connecting from landing page
  if (isLanding && account) {
    // Avoid flashing nav links on landing by pushing immediately
    router.push("/my-teams");
  }

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="h-7 w-7 rounded-md bg-gradient-to-br from-black to-gray-700 grid place-items-center">
            <span className="text-white text-xs font-semibold">T</span>
          </div>
          <span className="text-lg font-semibold tracking-tight text-black group-hover:opacity-90 transition-opacity">
            Tenjaku
          </span>
        </Link>

        <div className="flex items-center gap-6">
          {/* Navigation Links (hidden on landing) */}
          {!isLanding && (
            <nav className="hidden md:flex items-center gap-2">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`relative px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      isActive ? "text-black" : "text-gray-600 hover:text-black"
                    }`}
                  >
                    {item.label}
                    {isActive && (
                      <span className="absolute left-3 right-3 -bottom-[6px] h-[2px] bg-black/80 rounded" />
                    )}
                  </Link>
                );
              })}
            </nav>
          )}

          {/* Wallet Section */}
          <div className="flex items-center gap-3">
            {account ? (
              <div className="flex items-center gap-3">
                <div className="px-2.5 py-1.5 bg-gray-100 text-gray-800 text-sm font-mono rounded-md">
                  {account.address?.slice(0, 6)}...{account.address?.slice(-4)}
                </div>
                {!isLanding && (
                  <button
                    onClick={disconnectWallet}
                    className="px-3 py-2 text-sm text-gray-700 hover:text-black rounded-md border border-gray-300 hover:border-gray-400 transition-colors"
                  >
                    Disconnect
                  </button>
                )}
              </div>
            ) : (
              <button
                onClick={async () => {
                  await connectWallet();
                  if (isLanding) {
                    router.push("/my-teams");
                  }
                }}
                disabled={isConnecting}
                className="px-4 py-2 bg-black text-white text-sm font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-900"
              >
                {isConnecting ? "Connecting..." : "Connect Wallet"}
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
