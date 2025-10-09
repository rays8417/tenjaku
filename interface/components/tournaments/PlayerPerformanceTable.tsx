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
          <div className="flex items-center justify-between py-3 border-b border-border bg-surface-elevated/30">
            <div className="flex items-center gap-4 flex-1">
              <div className="text-xs font-semibold text-foreground-muted uppercase w-16">
                Position
              </div>
              <div className="text-xs font-semibold text-foreground-muted uppercase flex-1">
                Player
              </div>
            </div>
            <div className="flex items-center gap-8">
              <div className="text-xs font-semibold text-foreground-muted uppercase text-center min-w-[80px]">
                Score
              </div>
              <div className="text-xs font-semibold text-foreground-muted uppercase text-right min-w-[100px]">
                Holdings
              </div>
            </div>
          </div>
          {/* Table Rows */}
          {players.map((player, idx) => (
            <PlayerPerformanceRow key={player.id} player={player} index={idx} />
          ))}
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

