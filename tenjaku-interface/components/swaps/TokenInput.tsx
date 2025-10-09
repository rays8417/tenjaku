interface Token {
  name: string;
  type: string;
  displayName: string;
  team?: string;
  position?: string;
  avatar: string;
}

interface TokenInputProps {
  label: string;
  amount: string;
  token: Token;
  balance: number;
  isLoading: boolean;
  onAmountChange?: (value: string) => void;
  showPercentButtons?: boolean;
  onSetPercent?: (percent: number) => void;
  isReceiving?: boolean;
  isQuoteLoading?: boolean;
  isSwapped: boolean;
  availableTokens?: Token[];
  selectedPlayerToken?: string;
  onTokenChange?: (tokenName: string) => void;
}

export default function TokenInput({
  label,
  amount,
  token,
  balance,
  isLoading,
  onAmountChange,
  showPercentButtons = false,
  onSetPercent,
  isReceiving = false,
  isQuoteLoading = false,
  isSwapped,
  availableTokens = [],
  selectedPlayerToken,
  onTokenChange,
}: TokenInputProps) {
  const displayValue = isReceiving && isQuoteLoading ? "..." : amount;
  const showTokenSelector = !isSwapped && isReceiving;

  return (
    <div
      className={`${
        isReceiving
          ? "bg-surface-elevated border-2 border-primary/30"
          : "bg-surface border-2 border-border"
      } rounded-2xl p-5 hover:border-primary/50 transition-all duration-200`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-foreground-muted uppercase tracking-wide">
          {label}
        </span>
        {showPercentButtons && onSetPercent && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => onSetPercent(25)}
              className="px-3 py-1.5 bg-surface-elevated text-foreground rounded-lg text-xs font-medium hover:bg-muted transition-all shadow-sm active:scale-95 border border-border"
            >
              25%
            </button>
            <button
              onClick={() => onSetPercent(50)}
              className="px-3 py-1.5 bg-surface-elevated text-foreground rounded-lg text-xs font-medium hover:bg-muted transition-all shadow-sm active:scale-95 border border-border"
            >
              50%
            </button>
            <button
              onClick={() => onSetPercent(100)}
              className="px-3 py-1.5 bg-gradient-to-r from-primary to-primary-hover text-primary-foreground rounded-lg text-xs font-medium hover:opacity-90 transition-all shadow-sm active:scale-95"
            >
              MAX
            </button>
          </div>
        )}
        {isReceiving && isQuoteLoading && (
          <span className="text-xs font-semibold text-primary animate-pulse flex items-center gap-1">
            <div className="h-1.5 w-1.5 bg-primary rounded-full animate-bounce" />
            Calculating...
          </span>
        )}
      </div>

      <div className="flex items-center justify-between gap-4 mb-3">
        <input
          inputMode="decimal"
          value={displayValue}
          onChange={onAmountChange ? (e) => onAmountChange(e.target.value) : undefined}
          placeholder="0.00"
          className="bg-transparent text-4xl font-bold outline-none placeholder:text-foreground-subtle flex-1 text-foreground min-w-0"
          readOnly={isReceiving}
        />
        <div className="flex items-center gap-3 flex-shrink-0">
          {showTokenSelector ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary via-primary-hover to-primary shadow-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-primary-foreground font-bold text-sm">
                    {availableTokens.find((t) => t.name === selectedPlayerToken)?.avatar || "AS"}
                  </span>
                </div>
                <select
                  value={selectedPlayerToken}
                  onChange={(e) => onTokenChange && onTokenChange(e.target.value)}
                  className="bg-input-bg border-2 border-input rounded-lg px-3 py-2 text-foreground font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary cursor-pointer hover:border-primary/50 transition-colors min-w-[160px]"
                >
                  {availableTokens.map((t) => (
                    <option key={t.name} value={t.name}>
                      {t.displayName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="text-xs text-foreground-muted font-medium text-right">
                {availableTokens.find((t) => t.name === selectedPlayerToken)?.team} •{" "}
                {availableTokens.find((t) => t.name === selectedPlayerToken)?.position}
              </div>
            </div>
          ) : token.name === "BOSON" ? (
            <>
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-surface-elevated to-muted shadow-lg flex items-center justify-center ring-2 ring-border">
                <span className="text-foreground font-bold text-lg">B</span>
              </div>
              <div className="text-left">
                <div className="font-bold text-foreground text-lg leading-tight">BOSON</div>
                <div className="text-xs text-foreground-subtle font-medium">Base Token</div>
              </div>
            </>
          ) : (
            <>
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary via-primary-hover to-primary shadow-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">{token.avatar}</span>
              </div>
              <div className="text-left">
                <div className="font-bold text-foreground text-lg leading-tight">
                  {token.displayName}
                </div>
                <div className="text-xs text-foreground-subtle font-medium">
                  {token.team} • {token.position}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-foreground-muted font-medium">Balance:</span>
        <span className="text-foreground font-semibold">
          {isLoading ? "Loading..." : `${balance.toFixed(4)} ${token.displayName || token.name}`}
        </span>
      </div>
    </div>
  );
}

