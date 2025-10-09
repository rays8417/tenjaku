import TokenInput from "./TokenInput";
import SwapButton from "./SwapButton";

interface Token {
  name: string;
  type: string;
  displayName: string;
  team?: string;
  position?: string;
  avatar: string;
}

interface SwapCardProps {
  payAmount: string;
  receiveAmount: string;
  isSwapped: boolean;
  fromToken: Token;
  toToken: Token;
  fromBalance: number;
  toBalance: number;
  isLoading: {
    balance: boolean;
    quote: boolean;
    swap: boolean;
  };
  account: any;
  availableTokens: Token[];
  selectedPlayerToken: string;
  onPayAmountChange: (value: string) => void;
  onSwapDirection: () => void;
  onSwap: () => void;
  onSetPercent: (percent: number) => void;
  onTokenChange: (tokenName: string) => void;
}

export default function SwapCard({
  payAmount,
  receiveAmount,
  isSwapped,
  fromToken,
  toToken,
  fromBalance,
  toBalance,
  isLoading,
  account,
  availableTokens,
  selectedPlayerToken,
  onPayAmountChange,
  onSwapDirection,
  onSwap,
  onSetPercent,
  onTokenChange,
}: SwapCardProps) {
  return (
    <div className="bg-card border border-border rounded-2xl shadow-xl overflow-hidden">
      {/* Card Header */}
      <div className="bg-gradient-to-r from-surface-elevated to-surface px-6 py-4 border-b border-border">
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
            />
          </svg>
          Swap Tokens
        </h2>
      </div>

      <div className="p-6 space-y-3">
        {/* You Pay */}
        <TokenInput
          label="You Pay"
          amount={payAmount}
          token={fromToken}
          balance={fromBalance}
          isLoading={isLoading.balance}
          onAmountChange={onPayAmountChange}
          showPercentButtons={true}
          onSetPercent={onSetPercent}
          isSwapped={isSwapped}
          availableTokens={availableTokens}
          selectedPlayerToken={selectedPlayerToken}
          onTokenChange={onTokenChange}
        />

        {/* Swap Direction Button */}
        <div className="flex justify-center -my-1 relative z-10">
          <button
            onClick={onSwapDirection}
            className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary to-primary-hover shadow-lg shadow-primary/20 flex items-center justify-center text-primary-foreground hover:shadow-xl hover:scale-110 transition-all duration-300 group border-4 border-background"
          >
            <svg
              className="h-6 w-6 group-hover:rotate-180 transition-transform duration-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
              />
            </svg>
          </button>
        </div>

        {/* You Receive */}
        <TokenInput
          label="You Receive"
          amount={receiveAmount}
          token={toToken}
          balance={toBalance}
          isLoading={isLoading.balance}
          isReceiving={true}
          isQuoteLoading={isLoading.quote}
          isSwapped={isSwapped}
          availableTokens={availableTokens}
          selectedPlayerToken={selectedPlayerToken}
          onTokenChange={onTokenChange}
        />

        {/* Exchange Rate Info */}
        {payAmount && receiveAmount && Number(receiveAmount) > 0 && (
          <div className="bg-info-bg/20 border border-info/30 rounded-xl p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-info font-medium flex items-center gap-1">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                  />
                </svg>
                Exchange Rate:
              </span>
              <span className="text-foreground font-bold">
                1 {fromToken.displayName} ≈{" "}
                {(Number(receiveAmount) / Number(payAmount)).toFixed(4)}{" "}
                {toToken.displayName}
              </span>
            </div>
          </div>
        )}

        {/* Swap Button */}
        <SwapButton
          account={account}
          payAmount={payAmount}
          isLoading={isLoading.swap}
          onSwap={onSwap}
        />
      </div>
    </div>
  );
}

