interface Tournament {
  id: string;
  name: string;
  description: string | null;
  matchDate: string;
  team1: string;
  team2: string;
  venue: string | null;
  status: "UPCOMING" | "LIVE" | "COMPLETED";
  entryFee: string;
  maxParticipants: number | null;
  currentParticipants: number;
}

interface TournamentCardProps {
  tournament: Tournament;
}

export default function TournamentCard({ tournament }: TournamentCardProps) {
  const matchDate = new Date(tournament.matchDate);
  const dateStr = matchDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const timeStr = matchDate.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return (
    <div className="flex flex-col gap-4 p-5 border border-border rounded-xl hover:bg-surface-elevated transition-all bg-card">
      {/* Teams */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 flex-shrink-0 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg text-white text-sm font-bold flex items-center justify-center shadow-sm">
            {tournament.team1.substring(0, 3).toUpperCase()}
          </div>
          <span className="text-base font-semibold text-foreground truncate">
            {tournament.team1}
          </span>
        </div>

        <span className="text-sm text-foreground-subtle font-semibold flex-shrink-0">
          VS
        </span>

        <div className="flex items-center gap-3 min-w-0">
          <span className="text-base font-semibold text-foreground truncate">
            {tournament.team2}
          </span>
          <div className="h-10 w-10 flex-shrink-0 bg-gradient-to-br from-green-500 to-blue-600 rounded-lg text-white text-sm font-bold flex items-center justify-center shadow-sm">
            {tournament.team2.substring(0, 3).toUpperCase()}
          </div>
        </div>
      </div>

      {/* Match Details */}
      <div className="flex flex-col gap-2 pt-3 border-t border-border">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-semibold text-foreground-muted">
            {dateStr} • {timeStr}
          </div>
          <div
            className={`px-3 py-1 rounded-full text-xs font-semibold flex-shrink-0 ${
              tournament.status === "UPCOMING"
                ? "bg-info-bg text-info"
                : tournament.status === "LIVE"
                ? "bg-error-bg text-error"
                : "bg-success-bg text-success"
            }`}
          >
            {tournament.status}
          </div>
        </div>

        <div className="text-sm text-foreground-muted">
          {tournament.venue || "Venue TBD"}
        </div>

        {tournament.description && (
          <div className="text-sm text-foreground-muted line-clamp-1">
            {tournament.description}
          </div>
        )}

        <div className="text-sm text-foreground-muted mt-1 pt-2 border-t border-border">
          Entry Fee:{" "}
          {tournament.entryFee === "0" ? "Free" : `₹${tournament.entryFee}`}
        </div>
      </div>
    </div>
  );
}

