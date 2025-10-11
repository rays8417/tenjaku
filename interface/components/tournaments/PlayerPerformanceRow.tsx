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
    <div className="flex items-center justify-between py-3 px-5 border-b border-border/50 last:border-b-0 hover:bg-gradient-to-r hover:from-primary/5 hover:to-transparent transition-all duration-200 group">
      <div className="flex items-center gap-4 flex-1">
        <div className="text-sm w-16 text-foreground-muted font-black group-hover:text-primary transition-colors">
          {position}
        </div>
        <div className="relative h-10 w-10 shrink-0 rounded-xl overflow-hidden bg-surface-elevated border-2 border-border group-hover:border-primary/30 transition-all shadow-sm group-hover:shadow-md group-hover:scale-105">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={player.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-primary to-primary-hover font-black text-primary-foreground text-sm">
              {player.name
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-bold text-foreground text-base group-hover:text-primary transition-colors">
            {player.name}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-8">
        <div className="bg-gradient-to-r from-primary to-primary-hover text-primary-foreground text-base font-black px-4 py-1 rounded-xl min-w-[80px] text-center shadow-md border-2 border-primary/20 group-hover:shadow-lg transition-all">
          {player.points}
        </div>
        <div className="text-foreground font-bold text-base min-w-[100px] text-right">
          {player.holdings > 0 ? (
            <span className="text-success bg-success/10 px-3 py-1 rounded-lg border border-success/30 inline-block font-black">
              {player.holdings.toFixed(2)}
            </span>
          ) : (
            <span className="text-foreground-subtle bg-surface-elevated px-3 py-1 rounded-lg border border-border inline-block">0.00</span>
          )}
        </div>
      </div>
    </div>
  );
}

