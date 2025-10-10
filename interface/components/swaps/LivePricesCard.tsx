interface Token {
  name: string;
  displayName: string;
  avatar: string;
  imageUrl?: string;
}

interface LivePricesCardProps {
  isLoading: boolean;
  tokenPrices: any;
  selectedToken: Token | undefined;
  receiveAmount: string;
  getCurrentTokens: () => any;
  onRefresh: () => void;
  onLoadPrices: () => void;
}

export default function LivePricesCard({
  isLoading,
  tokenPrices,
  selectedToken,
  receiveAmount,
  getCurrentTokens,
  onRefresh,
  onLoadPrices,
}: LivePricesCardProps) {
  return (
    <div className="bg-card border border-border rounded-2xl shadow-xl overflow-hidden sticky top-6">
      {/* Card Header */}
      <div className="bg-gradient-to-r from-primary to-primary-hover px-6 py-4 border-b border-border">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-primary-foreground flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
              />
            </svg>
            Live Prices
          </h2>
          {tokenPrices.lastUpdated && (
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 bg-success rounded-full animate-pulse" />
              <span className="text-xs text-primary-foreground/90 font-medium">
                {tokenPrices.lastUpdated.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="p-6">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-surface rounded-xl p-5 animate-pulse">
                <div className="h-4 bg-surface-elevated rounded w-1/3 mb-3" />
                <div className="h-8 bg-surface-elevated rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : tokenPrices.current?.reserves ? (
          <div className="space-y-4">
            {/* Token Pair Status */}
            <div className="bg-surface-elevated rounded-xl p-4 border-2 border-primary/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-foreground">
                  {selectedToken?.displayName || "Player Token"}/BOSON
                </span>
                <span className="flex items-center gap-1.5 text-xs px-3 py-1 bg-primary/20 text-primary rounded-full font-bold border border-primary/30">
                  <div className="h-1.5 w-1.5 bg-primary rounded-full animate-pulse" />
                  Active
                </span>
              </div>
              <div className="text-xs text-foreground-muted font-medium">
                Liquidity Pool • Real-time pricing
              </div>
            </div>

            {/* Token Price Cards */}
            <div className="space-y-3">
              {/* BOSON Price */}
              <div className="bg-gradient-to-br from-surface-elevated to-surface rounded-xl p-5 shadow-lg border border-border">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="text-xs text-foreground-muted font-medium uppercase tracking-wide mb-1">
                      BOSON
                    </div>
                    <div className="text-3xl font-black mb-1 text-foreground">$1.00</div>
                  </div>
                  <div className="h-14 w-14 bg-primary rounded-2xl shadow-lg flex items-center justify-center transform rotate-12 hover:rotate-0 transition-transform">
                    <span className="text-primary-foreground font-black text-xl">B</span>
                  </div>
                </div>
              </div>

              {/* Player Token Price */}
              <div className="bg-gradient-to-br from-primary via-primary-hover to-primary rounded-xl p-5 shadow-lg border border-primary/30">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="text-xs text-primary-foreground/80 font-medium uppercase tracking-wide mb-1">
                      {selectedToken?.displayName || "Player Token"}
                    </div>
                    <div className="text-3xl font-black mb-1 text-primary-foreground">
                      ${tokenPrices.current.reserves.playerPriceUSD.toFixed(6)}
                    </div>
                  </div>
                  <div className="h-14 w-14 bg-primary-foreground rounded-2xl shadow-lg flex items-center justify-center transform -rotate-12 hover:rotate-0 transition-transform overflow-hidden">
                    {selectedToken?.imageUrl ? (
                      <img
                        src={selectedToken.imageUrl}
                        alt={selectedToken.displayName}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                          const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                          if (fallback) fallback.style.display = "flex";
                        }}
                      />
                    ) : null}
                    <span 
                      className="text-primary font-black text-lg w-full h-full flex items-center justify-center"
                      style={{ display: selectedToken?.imageUrl ? "none" : "flex" }}
                    >
                      {selectedToken?.avatar || "P"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Exchange Rates */}
            <div className="bg-surface rounded-xl p-5 border-2 border-border">
              <h3 className="text-sm font-bold text-foreground mb-3 uppercase tracking-wide flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                  />
                </svg>
                Exchange Rates
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-surface-elevated rounded-lg border border-border">
                  <span className="text-sm text-foreground-muted font-medium">
                    1 {selectedToken?.displayName || "Player Token"}
                  </span>
                  <span className="text-sm font-bold text-foreground">
                    {tokenPrices.current.reserves.playerPriceInBoson.toFixed(6)} BOSON
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-surface-elevated rounded-lg border border-border">
                  <span className="text-sm text-foreground-muted font-medium">1 BOSON</span>
                  <span className="text-sm font-bold text-foreground">
                    {tokenPrices.current.reserves.bosonPriceInPlayer.toFixed(2)} {selectedToken?.displayName || "Player Token"}
                  </span>
                </div>
              </div>
            </div>

            {/* Trade Value */}
            {receiveAmount && Number(receiveAmount) > 0 && (
              <div className="bg-success-bg/20 border-2 border-success/30 rounded-xl p-5">
                <h3 className="text-sm font-bold text-success mb-3 uppercase tracking-wide flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  Trade Value
                </h3>
                {getCurrentTokens().to.name === "BOSON" ? (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-foreground-muted font-medium">
                        Total Value:
                      </span>
                      <span className="text-2xl font-black text-success">
                        ${Number(receiveAmount).toFixed(4)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-foreground-muted font-medium">
                        Total Value:
                      </span>
                      <span className="text-2xl font-black text-success">
                        $
                        {(Number(receiveAmount) * tokenPrices.current.reserves.playerPriceUSD).toFixed(4)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Refresh Button */}
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="w-full py-4 bg-gradient-to-r from-surface-elevated to-surface border border-border text-foreground rounded-xl hover:bg-muted transition-all shadow-lg hover:shadow-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-95"
            >
              <svg
                className={`w-5 h-5 ${isLoading ? "animate-spin" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              {isLoading ? "Refreshing..." : "Refresh Prices"}
            </button>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="mx-auto h-16 w-16 bg-surface-elevated rounded-2xl flex items-center justify-center mb-4 border border-border">
              <svg
                className="h-8 w-8 text-foreground-subtle"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <div className="text-foreground-muted font-medium mb-2">
              No price data available
            </div>
            <p className="text-sm text-foreground-subtle mb-4">
              Load token prices to see live market data
            </p>
            <button
              onClick={onLoadPrices}
              className="px-6 py-3 bg-gradient-to-r from-primary to-primary-hover text-primary-foreground rounded-xl hover:opacity-90 transition-all shadow-lg hover:shadow-xl font-bold active:scale-95"
            >
              Load Token Prices
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

