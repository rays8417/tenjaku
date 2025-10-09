interface UpcomingMatchCardProps {
  match: any;
}

export default function UpcomingMatchCard({ match }: UpcomingMatchCardProps) {
  const matchDate = new Date(parseInt(match.startDate));
  const dateStr = matchDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const timeStr = matchDate.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const team1 = match.team1?.teamName || "TBD";
  const team2 = match.team2?.teamName || "TBD";

  return (
    <div className="flex flex-col gap-4 p-5 border border-border rounded-xl hover:bg-surface-elevated transition-all bg-card">
      {/* Teams */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 flex-shrink-0 bg-blue-600/90 rounded-lg text-white text-sm font-bold flex items-center justify-center shadow-sm">
            {team1.substring(0, 3).toUpperCase()}
          </div>
          <span className="text-base font-semibold text-foreground truncate">
            {team1}
          </span>
        </div>

        <span className="text-sm text-foreground-subtle font-semibold flex-shrink-0">
          VS
        </span>

        <div className="flex items-center gap-3 min-w-0">
          <span className="text-base font-semibold text-foreground truncate">
            {team2}
          </span>
          <div className="h-10 w-10 flex-shrink-0 bg-slate-600/90 rounded-lg text-white text-sm font-bold flex items-center justify-center shadow-sm">
            {team2.substring(0, 3).toUpperCase()}
          </div>
        </div>
      </div>

      {/* Match Details */}
      <div className="flex flex-col gap-2 pt-3 border-t border-border">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-semibold text-foreground-muted">
            {dateStr} • {timeStr}
          </div>
          <div className="px-3 py-1 rounded-full text-xs font-semibold bg-warning-bg text-warning flex-shrink-0">
            {match.matchFormat || "Cricket"}
          </div>
        </div>

        <div className="text-sm text-foreground-muted">
          {match.venueInfo?.ground || "Venue TBD"}
          {match.venueInfo?.city && `, ${match.venueInfo.city}`}
        </div>

        {match.seriesName && (
          <div className="text-sm text-foreground-muted line-clamp-1">
            {match.seriesName}
          </div>
        )}
      </div>
    </div>
  );
}

