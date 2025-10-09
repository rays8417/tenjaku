interface UserRewards {
  totalEarnings: number;
  totalRewards: number;
}

interface RewardsSummaryProps {
  userRewards: UserRewards | null;
  isLoading: boolean;
  address?: string;
}

export default function RewardsSummary({ userRewards, isLoading, address }: RewardsSummaryProps) {
  if (!address) return null;

  return (
    <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Total Earnings Card */}
      <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-foreground-muted uppercase tracking-wide">
              Total Earnings
            </h3>
            <div className="mt-2">
              {isLoading ? (
                <div className="animate-pulse">
                  <div className="h-8 w-24 bg-surface-elevated rounded"></div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-foreground">
                    {userRewards?.totalEarnings?.toFixed(2) || "0.00"}
                  </span>
                  <span className="text-sm text-foreground-muted">BOSON</span>
                </div>
              )}
            </div>
          </div>
          <div className="h-12 w-12 rounded-lg bg-success-bg flex items-center justify-center">
            <svg
              className="h-6 w-6 text-success"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Total Rewards Card */}
      <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-foreground-muted uppercase tracking-wide">
              Tournaments Participated
            </h3>
            <div className="mt-2">
              {isLoading ? (
                <div className="animate-pulse">
                  <div className="h-8 w-24 bg-surface-elevated rounded"></div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-foreground">
                    {userRewards?.totalRewards || "0"}
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="h-12 w-12 rounded-lg bg-info-bg flex items-center justify-center">
            <svg
              className="h-6 w-6 text-info"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

