import { PLAYER_MAPPING } from "@/lib/constants";

interface PlayerRow {
  id: string;
  name: string;
  points: number;
  holdings: number;
  moduleName: string;
}

interface PlayerPerformanceRowProps {
  player: PlayerRow;
  index: number;
}

export default function PlayerPerformanceRow({
  player,
  index,
}: PlayerPerformanceRowProps) {
  const playerInfo = PLAYER_MAPPING[player.moduleName];
  const position = playerInfo?.position || "N/A";
  const imageUrl = playerInfo?.imageUrl || "";

  return (
    <div className="flex items-center justify-between py-4 border-b border-border hover:bg-surface-elevated/50 transition-colors group">
      <div className="flex items-center gap-4 flex-1">
        <div className="text-sm w-16 text-foreground font-semibold">
          {position}
        </div>
        <div className="relative h-10 w-10 shrink-0 rounded-full overflow-hidden bg-surface-elevated">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={player.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center bg-primary font-bold text-primary-foreground text-sm">
              {player.name
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-foreground text-base">
            {player.name}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-8">
        <div className="bg-primary text-primary-foreground text-sm font-bold px-4 py-1.5 rounded-md min-w-[80px] text-center">
          {player.points}
        </div>
        <div className="text-foreground font-semibold text-sm min-w-[100px] text-right">
          {player.holdings > 0 ? (
            <span className="text-success">{player.holdings.toFixed(2)}</span>
          ) : (
            <span className="text-foreground-subtle">0.00</span>
          )}
        </div>
      </div>
    </div>
  );
}

