"use client";

import { useRouter } from "next/navigation";
import { PlayerInfo, PlayerPosition } from "@/lib/constants";

interface PlayerCardProps {
  player: PlayerInfo;
}

const POSITION_LABELS: Record<PlayerPosition, string> = {
  BAT: "Batsman",
  BWL: "Bowler",
  AR: "All-rounder",
  WK: "Wicketkeeper",
};

const POSITION_COLORS: Record<PlayerPosition, string> = {
  BAT: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  BWL: "bg-red-500/10 text-red-500 border-red-500/20",
  AR: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  WK: "bg-green-500/10 text-green-500 border-green-500/20",
};

export default function PlayerCard({ player }: PlayerCardProps) {
  const router = useRouter();

  const handleClick = () => {
    // Navigate to swaps page with player name as query param
    router.push(`/swaps?player=${encodeURIComponent(player.name)}`);
  };

  return (
    <div 
      onClick={handleClick}
      className="border border-border rounded-lg p-5 bg-card hover:bg-card-subtle transition-all hover:shadow-md cursor-pointer"
    >
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="flex-shrink-0">
          <div className="h-16 w-16 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center overflow-hidden">
            {player.imageUrl ? (
              <img
                src={player.imageUrl}
                alt={player.displayName}
                className="h-full w-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                  const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                  if (fallback) fallback.style.display = "flex";
                }}
              />
            ) : null}
            <span 
              className="text-xl font-bold text-primary items-center justify-center w-full h-full"
              style={{ display: player.imageUrl ? "none" : "flex" }}
            >
              {player.avatar}
            </span>
          </div>
        </div>

        {/* Player Info */}
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-foreground mb-1 truncate">
            {player.displayName}
          </h3>
          
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm text-foreground-muted">
              {player.team}
            </span>
            <span className="text-foreground-subtle">•</span>
            <span
              className={`px-2 py-0.5 rounded-md text-xs font-medium border ${
                POSITION_COLORS[player.position]
              }`}
            >
              {POSITION_LABELS[player.position]}
            </span>
          </div>

          {/* Token Type (truncated) */}
          <div className="text-xs text-foreground-subtle font-mono bg-card-subtle px-2 py-1 rounded truncate">
            {player.name.replace(/\s+/g, "")}
          </div>
        </div>
      </div>
    </div>
  );
}

