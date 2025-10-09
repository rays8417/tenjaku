"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { PLAYER_MAPPING } from "@/lib/constants";
import { useTournamentPerformance } from "@/hooks/useTournamentPerformance";

interface Tournament {
  id: string;
  name: string;
  description: string | null;
  matchDate: string;
  team1: string;
  team2: string;
  venue: string | null;
  status: "UPCOMING" | "ONGOING" | "COMPLETED";
}

interface PastTournamentModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournament: Tournament | null;
}

export default function PastTournamentModal({
  isOpen,
  onClose,
  tournament,
}: PastTournamentModalProps) {
  const [mounted, setMounted] = useState(false);
  
  // Use the existing hook to fetch tournament performance data
  const { playerScores, loading } = useTournamentPerformance(
    isOpen ? tournament?.id : undefined
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sort players by fantasy points (descending)
  const sortedPlayers = [...playerScores].sort(
    (a, b) => parseFloat(b.fantasyPoints) - parseFloat(a.fantasyPoints)
  );

  const getPlayerInfo = (moduleName: string) => {
    // Only return players in PLAYER_MAPPING (no fallback data)
    return PLAYER_MAPPING[moduleName] || null;
  };

  const modalContent =
    isOpen && mounted
      ? createPortal(
          <div
            className="fixed top-0 left-0 right-0 bottom-0 bg-black/60 backdrop-blur-sm overflow-y-auto transition-all duration-200"
            style={{ zIndex: 9999 }}
            onClick={onClose}
          >
            <div className="min-h-screen flex items-center justify-center p-4">
              <div
                className="bg-surface border border-border rounded-lg shadow-2xl max-w-4xl w-full p-6 md:p-8 relative my-8 transition-all duration-200"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Close button */}
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 text-foreground-muted hover:text-foreground transition-colors"
                  aria-label="Close"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    className="h-6 w-6"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.5"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>

                {/* Modal content */}
                <div className="space-y-6">
                  <div className="space-y-2">
                    <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                      {tournament?.name || "Tournament Details"}
                    </h2>
                    <p className="text-foreground-muted text-sm">
                      {tournament?.team1} vs {tournament?.team2}
                      {tournament?.venue && ` • ${tournament.venue}`}
                    </p>
                  </div>

                  {/* Players Table */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-foreground">
                      Player Performances
                    </h3>
                    {loading ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                      </div>
                    ) : sortedPlayers.length === 0 ? (
                      <div className="text-center py-12 text-foreground-muted">
                        No player data available
                      </div>
                    ) : (
                      <div className="max-h-[400px] overflow-y-auto scrollbar-thin">
                        <table className="w-full">
                          <thead className="sticky top-0 bg-surface border-b border-border">
                            <tr>
                              <th className="text-left py-3 px-4 text-sm font-semibold text-foreground-muted">
                                Rank
                              </th>
                              <th className="text-left py-3 px-4 text-sm font-semibold text-foreground-muted">
                                Player
                              </th>
                              <th className="text-right py-3 px-4 text-sm font-semibold text-foreground-muted">
                                Runs
                              </th>
                              <th className="text-right py-3 px-4 text-sm font-semibold text-foreground-muted">
                                Wickets
                              </th>
                              <th className="text-right py-3 px-4 text-sm font-semibold text-foreground-muted">
                                Points
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {sortedPlayers.map((player, index) => {
                              const playerInfo = getPlayerInfo(player.moduleName);
                              // Skip players not in PLAYER_MAPPING (no fallback data)
                              if (!playerInfo) return null;
                              
                              return (
                                <tr
                                  key={player.id}
                                  className="border-b border-border hover:bg-surface-elevated transition-colors"
                                >
                                  <td className="py-4 px-4">
                                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                                      {index + 1}
                                    </div>
                                  </td>
                                  <td className="py-4 px-4">
                                    <div className="flex items-center gap-3">
                                      {playerInfo.imageUrl ? (
                                        <img
                                          src={playerInfo.imageUrl}
                                          alt={playerInfo.displayName}
                                          className="w-10 h-10 rounded-full"
                                        />
                                      ) : (
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                                          {playerInfo.avatar}
                                        </div>
                                      )}
                                      <div>
                                        <div className="font-semibold text-foreground">
                                          {playerInfo.displayName}
                                        </div>
                                        <div className="text-xs text-foreground-muted">
                                          {playerInfo.team} • {playerInfo.position}
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="py-4 px-4 text-right text-foreground">
                                    {player.runs}
                                  </td>
                                  <td className="py-4 px-4 text-right text-foreground">
                                    {player.wickets}
                                  </td>
                                  <td className="py-4 px-4 text-right">
                                    <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary font-semibold">
                                      {parseFloat(player.fantasyPoints).toFixed(2)}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  return <>{modalContent}</>;
}

