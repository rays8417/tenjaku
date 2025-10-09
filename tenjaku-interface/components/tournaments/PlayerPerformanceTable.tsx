import PlayerPerformanceRow from "./PlayerPerformanceRow";
import EmptyState from "../ui/EmptyState";

interface PlayerRow {
  id: string;
  name: string;
  role: "Batsmen" | "Bowlers" | "All-rounders" | "Wicketkeepers";
  points: number;
  avg?: number;
  strikeRate?: number;
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
        players.map((player, idx) => (
          <PlayerPerformanceRow key={player.id} player={player} index={idx} />
        ))
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

