"use client";

import { useMemo, useState } from "react";
import { getAllPlayerInfos, PlayerPosition } from "@/lib/constants";
import SearchBar from "@/components/ui/SearchBar";
import EmptyState from "@/components/ui/EmptyState";
import PlayerCard from "@/components/players/PlayerCard";

type FilterOption = "All" | "BAT" | "BWL" | "AR" | "WK";

const POSITION_LABELS: Record<PlayerPosition, string> = {
  BAT: "Batsmen",
  BWL: "Bowlers",
  AR: "All-rounders",
  WK: "Wicketkeepers",
};

export default function PlayersPage() {
  const [query, setQuery] = useState("");
  const [selectedPosition, setSelectedPosition] = useState<FilterOption>("All");

  const allPlayers = getAllPlayerInfos();

  const filteredPlayers = useMemo(() => {
    return allPlayers.filter((player) => {
      const matchesQuery = query.trim()
        ? player.displayName.toLowerCase().includes(query.toLowerCase()) ||
          player.team.toLowerCase().includes(query.toLowerCase())
        : true;

      const matchesPosition =
        selectedPosition === "All" ? true : player.position === selectedPosition;

      return matchesQuery && matchesPosition;
    });
  }, [allPlayers, query, selectedPosition]);

  const positionCounts = useMemo(() => {
    const counts: Record<FilterOption, number> = {
      All: allPlayers.length,
      BAT: 0,
      BWL: 0,
      AR: 0,
      WK: 0,
    };

    allPlayers.forEach((player) => {
      counts[player.position]++;
    });

    return counts;
  }, [allPlayers]);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Players</h1>
          <p className="text-foreground-muted text-sm">
            Browse all available players on the platform
          </p>
        </div>

        <div className="border border-border rounded-xl p-6 bg-card">
          <div className="flex flex-col gap-6">
            <SearchBar
              value={query}
              onChange={setQuery}
              placeholder="Search players by name or team..."
            />

            {/* Position Filter Tabs */}
            <div className="flex gap-2 overflow-x-auto scrollbar-thin pb-2">
              <button
                onClick={() => setSelectedPosition("All")}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedPosition === "All"
                    ? "bg-primary text-primary-foreground"
                    : "bg-card-subtle text-foreground-muted hover:bg-card-subtle/80"
                }`}
              >
                All ({positionCounts.All})
              </button>
              {(Object.keys(POSITION_LABELS) as PlayerPosition[]).map((position) => (
                <button
                  key={position}
                  onClick={() => setSelectedPosition(position)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    selectedPosition === position
                      ? "bg-primary text-primary-foreground"
                      : "bg-card-subtle text-foreground-muted hover:bg-card-subtle/80"
                  }`}
                >
                  {POSITION_LABELS[position]} ({positionCounts[position]})
                </button>
              ))}
            </div>

            {/* Players Grid */}
            <div>
              <div className="text-sm font-medium text-foreground mb-4">
                {selectedPosition === "All"
                  ? "All Players"
                  : POSITION_LABELS[selectedPosition]}{" "}
                ({filteredPlayers.length})
              </div>

              {filteredPlayers.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredPlayers.map((player) => (
                    <PlayerCard key={player.name} player={player} />
                  ))}
                </div>
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
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                  }
                  title="No players found"
                  description="Try adjusting your search or filters"
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

