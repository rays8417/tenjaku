interface LeaderboardHeaderProps {
  totalAddresses?: number;
}

export default function LeaderboardHeader({ totalAddresses }: LeaderboardHeaderProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Universal Leaderboard</h1>
          <p className="text-foreground-muted text-sm mt-1">
            Top earners across all tournaments
          </p>
          {totalAddresses !== undefined && (
            <p className="text-foreground-subtle text-xs mt-1">
              Total Participants: {totalAddresses.toLocaleString()}
            </p>
          )}
        </div>
        <svg className="h-8 w-8 text-warning" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2L9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2z" />
        </svg>
      </div>
    </div>
  );
}

