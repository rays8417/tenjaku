interface PlayerRow {
  id: string;
  name: string;
  role: "Batsmen" | "Bowlers" | "All-rounders" | "Wicketkeepers";
  points: number;
  avg?: number;
  strikeRate?: number;
}

interface PlayerPerformanceRowProps {
  player: PlayerRow;
  index: number;
}

export default function PlayerPerformanceRow({
  player,
  index,
}: PlayerPerformanceRowProps) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-border hover:bg-surface-elevated/50 transition-colors group">
      <div className="flex items-center gap-4">
        <div className="text-sm w-8 text-foreground-subtle font-mono">
          {String(index + 1).padStart(2, "0")}
        </div>
        <div className="relative h-9 w-9 shrink-0 rounded bg-primary flex items-center justify-center font-bold text-primary-foreground text-xs">
          {player.name
            .split(" ")
            .map((n) => n[0])
            .join("")}
        </div>
        <div className="min-w-0">
          <div className="font-semibold text-foreground text-sm">
            {player.name}
          </div>
          <div className="text-xs text-foreground-muted flex items-center gap-3">
            <span>{player.role}</span>
            {player.avg && (
              <>
                <span className="text-foreground-subtle">•</span>
                <span>Avg {player.avg}</span>
              </>
            )}
            {player.strikeRate && (
              <>
                <span className="text-foreground-subtle">•</span>
                <span>SR {player.strikeRate}</span>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="bg-primary text-primary-foreground text-sm font-bold px-3 py-1 rounded min-w-[50px] text-center">
          {player.points}
        </div>
      </div>
    </div>
  );
}

