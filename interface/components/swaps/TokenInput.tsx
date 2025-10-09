import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

interface Token {
  name: string;
  type: string;
  displayName: string;
  team?: string;
  position?: string;
  avatar: string;
  imageUrl?: string;
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
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  
  const displayValue = isReceiving && isQuoteLoading ? "..." : amount;
  const showTokenSelector = !isSwapped && isReceiving;

  // Calculate dropdown position
  useEffect(() => {
    if (isDropdownOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      // Position dropdown above the button
      // Using a fixed max height of 320px + header ~40px + padding = ~370px
      const dropdownHeight = 370;
      setDropdownPosition({
        top: rect.top + window.scrollY - dropdownHeight - 8,
        left: rect.left + window.scrollX,
        width: Math.max(rect.width, 280),
      });
    }
  }, [isDropdownOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isDropdownOpen]);

  const handleTokenSelect = (tokenName: string) => {
    if (onTokenChange) {
      onTokenChange(tokenName);
    }
    setIsDropdownOpen(false);
  };

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
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary via-primary-hover to-primary shadow-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {availableTokens.find((t) => t.name === selectedPlayerToken)?.imageUrl ? (
                    <img
                      src={availableTokens.find((t) => t.name === selectedPlayerToken)?.imageUrl}
                      alt={availableTokens.find((t) => t.name === selectedPlayerToken)?.displayName || "Player"}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                        const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                        if (fallback) fallback.style.display = "flex";
                      }}
                    />
                  ) : null}
                  <span 
                    className="text-primary-foreground font-bold text-sm w-full h-full flex items-center justify-center"
                    style={{ display: availableTokens.find((t) => t.name === selectedPlayerToken)?.imageUrl ? "none" : "flex" }}
                  >
                    {availableTokens.find((t) => t.name === selectedPlayerToken)?.avatar || "AS"}
                  </span>
                </div>
                <div className="relative">
                  <button
                    ref={buttonRef}
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="bg-surface-elevated border-2 border-border rounded-xl px-4 py-2.5 text-foreground font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary cursor-pointer hover:border-primary/50 transition-all min-w-[160px] flex items-center justify-between gap-2 shadow-sm hover:shadow-md"
                  >
                    <span className="truncate">
                      {availableTokens.find((t) => t.name === selectedPlayerToken)?.displayName || "Select Player"}
                    </span>
                    <svg
                      className={`w-4 h-4 transition-transform duration-200 flex-shrink-0 ${isDropdownOpen ? "" : "rotate-180"}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 15l-7-7-7 7" />
                    </svg>
                  </button>
                  
                  {isDropdownOpen && typeof window !== "undefined" && createPortal(
                    <div 
                      ref={dropdownRef}
                      className="fixed bg-surface border-2 border-primary/50 rounded-xl shadow-2xl overflow-hidden z-[9999] animate-in fade-in slide-in-from-bottom-2 duration-200"
                      style={{
                        top: `${dropdownPosition.top}px`,
                        left: `${dropdownPosition.left}px`,
                        width: `${dropdownPosition.width}px`,
                      }}
                    >
                      <div className="bg-surface-elevated px-4 py-2 border-b border-border">
                        <p className="text-xs font-semibold text-foreground-muted uppercase tracking-wider">
                          Select Player Token
                        </p>
                      </div>
                      <div className="max-h-[320px] overflow-y-auto scrollbar-thin">
                        {availableTokens.map((t) => {
                          const isSelected = t.name === selectedPlayerToken;
                          return (
                            <button
                              key={t.name}
                              onClick={() => handleTokenSelect(t.name)}
                              className={`w-full px-4 py-3.5 text-left hover:bg-primary/10 transition-all flex items-center gap-3 group border-b border-border/50 last:border-b-0 ${
                                isSelected ? "bg-primary/15 border-l-4 border-primary" : "border-l-4 border-transparent"
                              }`}
                            >
                              <div className={`h-10 w-10 rounded-full bg-gradient-to-br from-primary via-primary-hover to-primary shadow-md flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110 overflow-hidden ${
                                isSelected ? "ring-2 ring-primary ring-offset-2 ring-offset-surface" : ""
                              }`}>
                                {t.imageUrl ? (
                                  <img
                                    src={t.imageUrl}
                                    alt={t.displayName}
                                    className="h-full w-full object-cover"
                                    onError={(e) => {
                                      e.currentTarget.style.display = "none";
                                      const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                                      if (fallback) fallback.style.display = "flex";
                                    }}
                                  />
                                ) : null}
                                <span 
                                  className="text-primary-foreground font-bold text-sm w-full h-full flex items-center justify-center"
                                  style={{ display: t.imageUrl ? "none" : "flex" }}
                                >
                                  {t.avatar}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className={`font-bold text-sm mb-0.5 truncate ${isSelected ? "text-primary" : "text-foreground"} group-hover:text-primary transition-colors`}>
                                  {t.displayName}
                                </div>
                                <div className="text-xs text-foreground-muted font-medium">
                                  {t.team} • {t.position}
                                </div>
                              </div>
                              {isSelected && (
                                <svg
                                  className="w-5 h-5 text-primary flex-shrink-0"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>,
                    document.body
                  )}
                </div>
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
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary via-primary-hover to-primary shadow-lg flex items-center justify-center overflow-hidden">
                {token.imageUrl ? (
                  <img
                    src={token.imageUrl}
                    alt={token.displayName}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                      const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                      if (fallback) fallback.style.display = "flex";
                    }}
                  />
                ) : null}
                <span 
                  className="text-primary-foreground font-bold text-sm w-full h-full flex items-center justify-center"
                  style={{ display: token.imageUrl ? "none" : "flex" }}
                >
                  {token.avatar}
                </span>
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

