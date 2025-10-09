interface LeaderboardHeaderProps {
  currentTournament: {
    team1: string;
    team2: string;
    matchDate: string;
  } | null;
}

export default function LeaderboardHeader({ currentTournament }: LeaderboardHeaderProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Leaderboard</h1>
          <p className="text-foreground-muted text-sm mt-1">
            {currentTournament
              ? `${currentTournament.team1} vs ${currentTournament.team2}`
              : "Tournament rewards and rankings"}
          </p>
          {currentTournament && (
            <p className="text-foreground-subtle text-xs mt-1">
              Match Date: {new Date(currentTournament.matchDate).toLocaleDateString()}
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

