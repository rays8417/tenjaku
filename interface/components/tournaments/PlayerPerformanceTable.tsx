import PlayerPerformanceRow from "./PlayerPerformanceRow";
import EmptyState from "../ui/EmptyState";

interface PlayerRow {
  id: string;
  name: string;
  points: number;
  holdings: number;
  moduleName: string;
}

interface PlayerPerformanceTableProps {
  players: PlayerRow[];
  className?: string;
}

export default function PlayerPerformanceTable({
  players,
  className = "",
}: PlayerPerformanceTableProps) {
  return (
    <div className={`space-y-0 ${className}`}>
      {players.length > 0 ? (
        <>
          {/* Table Header */}
          <div className="flex items-center justify-between py-4 px-5 border-b-2 border-border bg-gradient-to-r from-surface-elevated to-surface rounded-t-xl shadow-sm">
            <div className="flex items-center gap-4 flex-1">
              <div className="text-xs font-black text-foreground uppercase tracking-wider w-16">
                Pos
              </div>
              <div className="text-xs font-black text-foreground uppercase tracking-wider flex-1">
                Player
              </div>
            </div>
            <div className="flex items-center gap-8">
              <div className="text-xs font-black text-foreground uppercase tracking-wider text-center min-w-[80px]">
                Fantasy Points
              </div>
              <div className="text-xs font-black text-foreground uppercase tracking-wider text-right min-w-[100px]">
                Holdings
              </div>
            </div>
          </div>
          {/* Table Rows */}
          <div className="bg-card rounded-b-xl overflow-hidden border-2 border-t-0 border-border shadow-lg">
            {players.map((player, idx) => (
              <PlayerPerformanceRow key={player.id} player={player} index={idx} />
            ))}
          </div>
        </>
      ) : (
        <EmptyState
          icon={
            <svg
              className="h-12 w-12 text-foreground-subtle"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          }
          title="No players found"
          description="Try adjusting your search or filters"
        />
      )}
    </div>
  );
}

