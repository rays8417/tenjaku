interface Tournament {
  id: string;
  name: string;
  description: string | null;
  matchDate: string;
  team1: string;
  team2: string;
  venue: string | null;
  status: "UPCOMING" | "ONGOING" | "COMPLETED";
  entryFee: string;
  maxParticipants: number | null;
  currentParticipants: number;
  totalRewardPool?: number;
}

interface TournamentCardProps {
  tournament: Tournament;
  onClick?: () => void;
}

export default function TournamentCard({ tournament, onClick }: TournamentCardProps) {
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

  const isClickable = onClick && tournament.status === "COMPLETED";

  return (
    <div 
      className={`flex flex-col gap-4 p-5 border border-border rounded-xl transition-all bg-card ${
        isClickable 
          ? 'cursor-pointer hover:bg-surface-elevated/70 hover:border-border-hover hover:shadow-md hover:scale-[1.02]' 
          : ''
      }`}
      onClick={onClick}
    >
      {/* Teams */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 flex-shrink-0 bg-slate-700/60 rounded-lg text-foreground text-sm font-bold flex items-center justify-center shadow-</div>der border-border"></div>       {tournament.team1.substring(0, 3).toUpperCase()}
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
          <div className="h-10 w-10 flex-shrink-0 bg-slate-700/60 rounded-lg text-foreground text-sm font-bold flex items-center justify-center shadow-sm border border-border">
            {tournament.team2.substring(0, 3).toUpperCase()}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2.5 pt-3 border-t border-border">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-semibold text-foreground-muted">
            {dateStr} • {timeStr}
          </div>
          <div
            className={`px-3 py-1 rounded-full text-xs font-bold flex-shrink-0 ${
              tournament.status === "UPCOMING"
                ? "bg-info-bg text-info"
                : tournament.status === "ONGOING"
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

        {tournament.totalRewardPool && tournament.totalRewardPool > 0 && (
          <div className="flex items-center justify-between mt-1 pt-2 border-t border-border">
            <div className="text-sm font-bold text-foreground">
              {tournament.totalRewardPool.toLocaleString()} BOSON
            </div>
          </div>
        )}
      </div>

      {/* Click indicator for completed tournaments */}
      {isClickable && (
        <div className="flex items-center justify-center gap-2 text-xs text-foreground-muted group-hover:text-foreground transition-colors">
          <span>Click to view details</span>
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-4 w-4" 
            viewBox="0 0 20 20" 
            fill="currentColor"
          >
            <path 
              fillRule="evenodd" 
              d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" 
              clipRule="evenodd" 
            />
          </svg>
        </div>
      )}
    </div>
  );
}

