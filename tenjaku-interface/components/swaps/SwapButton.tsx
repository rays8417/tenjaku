interface SwapButtonProps {
  account: any;
  payAmount: string;
  isLoading: boolean;
  onSwap: () => void;
}

export default function SwapButton({
  account,
  payAmount,
  isLoading,
  onSwap,
}: SwapButtonProps) {
  const isDisabled = !account || !payAmount || Number(payAmount) <= 0 || isLoading;

  return (
    <button
      onClick={onSwap}
      disabled={isDisabled}
      className={`w-full py-5 text-lg font-bold rounded-2xl transition-all duration-300 shadow-lg ${
        !isDisabled
          ? "bg-gradient-to-r from-primary via-primary-hover to-primary text-primary-foreground hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] shadow-primary/30"
          : "bg-muted text-foreground-subtle cursor-not-allowed"
      }`}
    >
      {!account
        ? "Connect Wallet First"
        : isLoading
        ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Swapping...
          </span>
        )
        : payAmount && Number(payAmount) > 0
        ? "Swap Tokens"
        : "Enter Amount"}
    </button>
  );
}

