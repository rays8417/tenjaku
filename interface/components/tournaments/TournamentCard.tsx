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
      className={`flex flex-col gap-4 p-5 border-2 border-border rounded-xl transition-all bg-gradient-to-br from-surface to-card shadow-lg ${
        isClickable 
          ? 'cursor-pointer hover:bg-surface-elevated hover:border-primary/30 hover:shadow-xl hover:scale-[1.02] group' 
          : ''
      }`}
      onClick={onClick}
    >
      {/* Teams */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 flex-shrink-0 bg-gradient-to-br from-primary/20 to-primary/10 rounded-lg text-primary text-xs font-black flex items-center justify-center shadow-md border-2 border-primary/20 transition-transform group-hover:scale-110">
            {tournament.team1.substring(0, 3).toUpperCase()}
          </div>
          <span className="text-base font-bold text-foreground truncate">
            {tournament.team1}
          </span>
        </div>

        <span className="text-xs text-foreground-subtle font-black flex-shrink-0 bg-surface-elevated px-2 py-1 rounded-lg border border-border">
          VS
        </span>

        <div className="flex items-center gap-3 min-w-0">
          <span className="text-base font-bold text-foreground truncate">
            {tournament.team2}
          </span>
          <div className="h-10 w-10 flex-shrink-0 bg-gradient-to-br from-primary/20 to-primary/10 rounded-lg text-primary text-xs font-black flex items-center justify-center shadow-md border-2 border-primary/20 transition-transform group-hover:scale-110">
            {tournament.team2.substring(0, 3).toUpperCase()}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 pt-3 border-t border-border/50">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground-muted">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {dateStr} • {timeStr}
          </div>
          <div
            className={`px-3 py-1.5 rounded-full text-xs font-black flex-shrink-0 border-2 shadow-sm ${
              tournament.status === "UPCOMING"
                ? "bg-info/10 text-info border-info/30"
                : tournament.status === "ONGOING"
                ? "bg-error/10 text-error border-error/30 animate-pulse"
                : "bg-success/10 text-success border-success/30"
            }`}
          >
            {tournament.status}
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm text-foreground-muted bg-surface-elevated/50 px-3 py-2 rounded-lg">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {tournament.venue || "Venue TBD"}
        </div>

        {tournament.description && (
          <div className="text-sm text-foreground-muted line-clamp-2 bg-surface-elevated/30 px-3 py-2 rounded-lg italic">
            {tournament.description}
          </div>
        )}

        {tournament.totalRewardPool && tournament.totalRewardPool > 0 && (
          <div className="mt-1 pt-3 border-t border-border/50">
            <div className="text-base font-bold text-foreground">
              {tournament.totalRewardPool.toLocaleString()} BOSON
            </div>
          </div>
        )}
      </div>

      {/* Click indicator for completed tournaments */}
      {isClickable && (
        <div className="flex items-center justify-center gap-2 text-xs text-foreground-muted group-hover:text-primary transition-colors pt-2 border-t border-border/50 mt-2">
          <span className="font-semibold">Click to view details</span>
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-4 w-4 group-hover:translate-x-1 transition-transform" 
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

