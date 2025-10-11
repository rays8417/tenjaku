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
            className="fixed top-0 left-0 right-0 bottom-0 bg-black/70 backdrop-blur-md overflow-y-auto transition-all duration-300"
            style={{ zIndex: 9999 }}
            onClick={onClose}
          >
            <div className="min-h-screen flex items-center justify-center p-4">
              <div
                className="bg-card border-2 border-border rounded-2xl shadow-2xl max-w-5xl w-full relative my-8 transition-all duration-300 transform overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="bg-gradient-to-r from-success to-success-hover px-6 md:px-8 py-6 border-b-2 border-border relative">
                  <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-white hover:text-white/80 transition-all hover:rotate-90 duration-300 bg-white/20 rounded-full p-2 hover:bg-white/30"
                    aria-label="Close"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      className="h-5 w-5"
                      strokeWidth={2.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                  
                  <div className="space-y-2 pr-12">
                    <div className="flex items-center gap-2">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                      </svg>
                      <h2 className="text-2xl md:text-3xl font-black text-white">
                        {tournament?.name || "Tournament Details"}
                      </h2>
                    </div>
                    <div className="flex items-center gap-3 text-white/90">
                      <span className="font-semibold">{tournament?.team1}</span>
                      <span className="text-white/70">vs</span>
                      <span className="font-semibold">{tournament?.team2}</span>
                      {tournament?.venue && (
                        <>
                          <span className="text-white/70">•</span>
                          <span className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            {tournament.venue}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Modal content */}
                <div className="p-6 md:p-8 space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-black text-foreground flex items-center gap-2">
                      <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Player Performances
                    </h3>
                    {!loading && sortedPlayers.length > 0 && (
                      <span className="text-sm font-bold text-foreground-muted bg-surface-elevated px-3 py-1.5 rounded-lg border border-border">
                        {sortedPlayers.length} Players
                      </span>
                    )}
                  </div>

                  {loading ? (
                    <div className="flex items-center justify-center py-16">
                      <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent shadow-lg"></div>
                    </div>
                  ) : sortedPlayers.length === 0 ? (
                    <div className="text-center py-16 bg-surface rounded-xl border-2 border-border">
                      <svg className="mx-auto h-16 w-16 text-foreground-subtle mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                      </svg>
                      <p className="text-foreground-muted font-semibold">No player data available</p>
                    </div>
                  ) : (
                    <div className="max-h-[500px] overflow-y-auto scrollbar-thin border-2 border-border rounded-xl bg-card shadow-lg">
                      <table className="w-full">
                        <thead className="sticky top-0 bg-gradient-to-r from-surface-elevated to-surface border-b-2 border-border z-10">
                          <tr>
                            <th className="text-center py-4 px-4 text-xs font-black text-foreground uppercase tracking-wider">
                              Rank
                            </th>
                            <th className="text-left py-4 px-4 text-xs font-black text-foreground uppercase tracking-wider">
                              Player
                            </th>
                            <th className="text-center py-4 px-4 text-xs font-black text-foreground uppercase tracking-wider">
                              Runs
                            </th>
                            <th className="text-center py-4 px-4 text-xs font-black text-foreground uppercase tracking-wider">
                              Wickets
                            </th>
                            <th className="text-right py-4 px-4 text-xs font-black text-foreground uppercase tracking-wider">
                              Points
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortedPlayers.map((player, index) => {
                            const playerInfo = getPlayerInfo(player.moduleName);
                            // Skip players not in PLAYER_MAPPING (no fallback data)
                            if (!playerInfo) return null;
                            
                            const isTop3 = index < 3;
                            
                            return (
                              <tr
                                key={player.id}
                                className="border-b border-border/50 last:border-b-0 hover:bg-gradient-to-r hover:from-primary/5 hover:to-transparent transition-all duration-200"
                              >
                                <td className="py-5 px-4">
                                  <div className={`flex items-center justify-center w-10 h-10 rounded-xl font-black text-sm shadow-md border-2 ${
                                    index === 0 
                                      ? 'bg-gradient-to-br from-warning to-warning/80 text-white border-warning/30'
                                      : index === 1
                                      ? 'bg-gradient-to-br from-gray-400 to-gray-500 text-white border-gray-400/30'
                                      : index === 2
                                      ? 'bg-gradient-to-br from-amber-700 to-amber-800 text-white border-amber-700/30'
                                      : 'bg-surface-elevated text-foreground border-border'
                                  }`}>
                                    {isTop3 ? (
                                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                      </svg>
                                    ) : (
                                      index + 1
                                    )}
                                  </div>
                                </td>
                                <td className="py-5 px-4">
                                  <div className="flex items-center gap-3">
                                    {playerInfo.imageUrl ? (
                                      <img
                                        src={playerInfo.imageUrl}
                                        alt={playerInfo.displayName}
                                        className="w-12 h-12 rounded-xl border-2 border-border shadow-md object-cover"
                                      />
                                    ) : (
                                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary-hover flex items-center justify-center text-white font-black text-sm border-2 border-primary/30 shadow-md">
                                        {playerInfo.avatar}
                                      </div>
                                    )}
                                    <div>
                                      <div className="font-bold text-foreground">
                                        {playerInfo.displayName}
                                      </div>
                                      <div className="text-xs text-foreground-muted font-medium">
                                        {playerInfo.team} • {playerInfo.position}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-5 px-4 text-center">
                                  <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-surface-elevated border border-border text-foreground font-bold">
                                    {player.runs}
                                  </span>
                                </td>
                                <td className="py-5 px-4 text-center">
                                  <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-surface-elevated border border-border text-foreground font-bold">
                                    {player.wickets}
                                  </span>
                                </td>
                                <td className="py-5 px-4 text-right">
                                  <div className="inline-flex items-center px-4 py-2 rounded-xl bg-gradient-to-r from-primary to-primary-hover text-primary-foreground font-black shadow-md border-2 border-primary/20">
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
          </div>,
          document.body
        )
      : null;

  return <>{modalContent}</>;
}

