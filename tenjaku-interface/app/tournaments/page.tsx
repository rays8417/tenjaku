"use client";

import { use, useEffect, useMemo, useState } from "react";
import axios from "axios";

type Role =
  | "Overview"
  | "Batsmen"
  | "Bowlers"
  | "All-rounders"
  | "Wicketkeepers";

interface PlayerRow {
  id: string;
  name: string;
  team: string;
  role: Exclude<Role, "Overview">;
  price: string;
  points: number;
  avg?: number;
  strikeRate?: number;
}

interface PlayerScore {
  id: string;
  tournamentId: string;
  playerId: string | null;
  moduleName: string;
  runs: number;
  ballsFaced: number;
  wickets: number;
  oversBowled: string;
  runsConceded: number;
  catches: number;
  stumpings: number;
  runOuts: number;
  fantasyPoints: string;
  createdAt: string;
  updatedAt: string;
  player: any | null;
}

interface Tournament {
  id: string;
  name: string;
  description: string | null;
  matchDate: string;
  team1: string;
  team2: string;
  venue: string | null;
  status: "UPCOMING" | "LIVE" | "COMPLETED";
  entryFee: string;
  maxParticipants: number | null;
  currentParticipants: number;
  participantCount: number;
  rewardPools: any[];
  createdAt: string;
}

export default function TournamentsPage() {
  const [activeTab, setActiveTab] = useState<Role>("Overview");
  const [query, setQuery] = useState("");
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [latestTournamentPerformance, setLatestTournamentPerformance] =
    useState<PlayerScore[]>([]);
  const [isLoadingTournaments, setIsLoadingTournaments] = useState(true);
  const [isLoadingPerformance, setIsLoadingPerformance] = useState(false);

  useEffect(() => {
    const fetchTournaments = async () => {
      setIsLoadingTournaments(true);
      try {
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/api/tournaments`
        );
        console.log(
          "tournaments data on client side",
          response.data.tournaments
        );
        setTournaments((response.data.tournaments || []).reverse());
      } catch (error) {
        console.error("Error fetching tournaments:", error);
        setTournaments([]);
      } finally {
        setIsLoadingTournaments(false);
      }
    };

    fetchTournaments();
  }, []);

  const fetchLatestTournamentPerformance = async () => {
    if (tournaments.length === 0) return;

    setIsLoadingPerformance(true);
    try {
      const latestTournament = tournaments[0];
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/tournaments/${latestTournament.id}`
      );
      console.log(
        "latest tournament performance data on client side",
        response.data.tournament
      );
      setLatestTournamentPerformance(
        response.data.tournament.playerScores || []
      );
    } catch (error) {
      console.error("Error fetching tournament performance:", error);
      setLatestTournamentPerformance([]);
    } finally {
      setIsLoadingPerformance(false);
    }
  };

  useEffect(() => {
    fetchLatestTournamentPerformance();
  }, [tournaments]);

  // Function to determine player role based on performance
  const determinePlayerRole = (
    playerScore: PlayerScore
  ): Exclude<Role, "Overview"> => {
    const { runs, wickets, catches, stumpings } = playerScore;

    // If player has wickets, they are a bowler or all-rounder
    if (wickets > 0) {
      // If they also have runs, they are an all-rounder
      if (runs > 0) {
        return "All-rounders";
      }
      return "Bowlers";
    }

    // If player has stumpings, they are a wicketkeeper
    if (stumpings > 0) {
      return "Wicketkeepers";
    }

    // If player has catches but no stumpings, could be wicketkeeper or batsman
    if (catches > 0 && runs > 0) {
      return "Wicketkeepers";
    }

    // Default to batsman if they have runs
    if (runs > 0) {
      return "Batsmen";
    }

    // Default fallback
    return "Batsmen";
  };

  // Function to calculate strike rate
  const calculateStrikeRate = (
    runs: number,
    ballsFaced: number
  ): number | undefined => {
    if (ballsFaced === 0) return undefined;
    return Number(((runs / ballsFaced) * 100).toFixed(2));
  };

  // Function to calculate average
  const calculateAverage = (
    runs: number,
    ballsFaced: number
  ): number | undefined => {
    if (ballsFaced === 0) return undefined;
    return Number((runs / (ballsFaced / 6)).toFixed(2));
  };

  // Transform server data to PlayerRow format
  const players = useMemo<PlayerRow[]>(() => {
    if (latestTournamentPerformance.length === 0) {
      return [];
    }

    return latestTournamentPerformance
      .map((playerScore) => {
        const strikeRate = calculateStrikeRate(
          playerScore.runs,
          playerScore.ballsFaced
        );
        const avg = calculateAverage(playerScore.runs, playerScore.ballsFaced);

        return {
          id: playerScore.id,
          name: playerScore.moduleName.replace(/([A-Z])/g, " $1").trim(), // Convert camelCase to readable name
          team: "TBD", // Team info not available in current data structure
          role: determinePlayerRole(playerScore),
          price: "₹0", // Price not available in current data structure
          points: parseInt(playerScore.fantasyPoints),
          avg: avg,
          strikeRate: strikeRate,
        };
      })
      .sort((a, b) => b.points - a.points); // Sort by fantasy points descending
  }, [latestTournamentPerformance]);

  const visiblePlayers = players.filter((p) => {
    const matchesTab = activeTab === "Overview" ? true : p.role === activeTab;
    const matchesQuery = query.trim()
      ? p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.team.toLowerCase().includes(query.toLowerCase())
      : true;
    return matchesTab && matchesQuery;
  });

  const TabButton = ({ label }: { label: Role }) => (
    <button
      onClick={() => setActiveTab(label)}
      className={`px-4 py-2 text-sm font-medium transition-all duration-200 ${
        activeTab === label
          ? "text-black border-b-2 border-black"
          : "text-gray-500 hover:text-gray-700 border-b-2 border-transparent"
      }`}
    >
      {label}
    </button>
  );

  const PlayerItem = ({
    player,
    index,
  }: {
    player: PlayerRow;
    index: number;
  }) => (
    <div className="flex items-center justify-between py-4 border-b border-gray-100 hover:bg-gray-50/50 transition-colors group">
      <div className="flex items-center gap-4">
        <div className="text-sm w-8 text-gray-400 font-mono">
          {String(index + 1).padStart(2, "0")}
        </div>
        <div className="relative h-9 w-9 shrink-0 rounded bg-black flex items-center justify-center font-bold text-white text-xs">
          {player.name
            .split(" ")
            .map((n) => n[0])
            .join("")}
        </div>
        <div className="min-w-0">
          <div className="font-semibold text-black text-sm">{player.name}</div>
          <div className="text-xs text-gray-500 flex items-center gap-3">
            <span className="font-medium">{player.team}</span>
            <span>{player.role}</span>
            {player.avg && (
              <>
                <span className="text-gray-300">•</span>
                <span>Avg {player.avg}</span>
              </>
            )}
            {player.strikeRate && (
              <>
                <span className="text-gray-300">•</span>
                <span>SR {player.strikeRate}</span>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4">
        {/* <div className="text-sm text-gray-600 font-medium">{player.price}</div> */}
        <div className="bg-black text-white text-sm font-bold px-3 py-1 rounded min-w-[50px] text-center">
          {player.points}
        </div>
      </div>
    </div>
  );

  // Shimmer component for tournament items
  const TournamentShimmer = () => (
    <div className="flex flex-col gap-2 p-4 border border-gray-200 rounded-lg animate-pulse">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 bg-gray-200 rounded"></div>
            <div className="h-4 w-16 bg-gray-200 rounded"></div>
          </div>
          <div className="h-3 w-6 bg-gray-200 rounded"></div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-16 bg-gray-200 rounded"></div>
            <div className="h-6 w-6 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="h-3 w-24 bg-gray-200 rounded"></div>
          <div className="h-3 w-32 bg-gray-200 rounded"></div>
        </div>
        <div className="h-6 w-16 bg-gray-200 rounded-full"></div>
      </div>
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
        <div className="h-3 w-20 bg-gray-200 rounded"></div>
      </div>
    </div>
  );

  // Shimmer component for player items
  const PlayerShimmer = () => (
    <div className="flex items-center justify-between py-4 border-b border-gray-100 animate-pulse">
      <div className="flex items-center gap-4">
        <div className="h-4 w-8 bg-gray-200 rounded"></div>
        <div className="h-9 w-9 bg-gray-200 rounded"></div>
        <div className="space-y-1">
          <div className="h-4 w-24 bg-gray-200 rounded"></div>
          <div className="flex items-center gap-3">
            <div className="h-3 w-8 bg-gray-200 rounded"></div>
            <div className="h-3 w-16 bg-gray-200 rounded"></div>
            <div className="h-3 w-12 bg-gray-200 rounded"></div>
            <div className="h-3 w-10 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="h-4 w-12 bg-gray-200 rounded"></div>
        <div className="h-8 w-12 bg-gray-200 rounded"></div>
      </div>
    </div>
  );

  const TournamentItem = ({ tournament }: { tournament: Tournament }) => {
    const matchDate = new Date(tournament.matchDate);
    const dateStr = matchDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    const timeStr = matchDate.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    return (
      <div className="flex flex-col gap-2 p-4 border border-gray-200 rounded-lg hover:bg-gray-50/50 transition-colors">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 bg-gradient-to-br from-orange-500 to-red-600 rounded text-white text-xs font-bold flex items-center justify-center">
                {tournament.team1.substring(0, 3).toUpperCase()}
              </div>
              <span className="text-sm font-medium text-black">
                {tournament.team1}
              </span>
            </div>
            <span className="text-xs text-gray-400 font-medium">VS</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-black">
                {tournament.team2}
              </span>
              <div className="h-6 w-6 bg-gradient-to-br from-green-500 to-blue-600 rounded text-white text-xs font-bold flex items-center justify-center">
                {tournament.team2.substring(0, 3).toUpperCase()}
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between text-xs">
          <div className="text-gray-600">
            <div className="font-medium">
              {dateStr} • {timeStr}
            </div>
            <div className="text-gray-500 mt-1">
              {tournament.venue || "Venue TBD"}
            </div>
            {tournament.description && (
              <div className="text-gray-500 mt-1 text-xs">
                {tournament.description}
              </div>
            )}
          </div>
          <div
            className={`px-2 py-1 rounded-full text-xs font-medium ${
              tournament.status === "UPCOMING"
                ? "bg-blue-100 text-blue-700"
                : tournament.status === "LIVE"
                ? "bg-red-100 text-red-700"
                : "bg-green-100 text-green-700"
            }`}
          >
            {tournament.status}
          </div>
        </div>
        <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t border-gray-100">
          <div className="text-gray-500">
            Entry Fee:{" "}
            {tournament.entryFee === "0" ? "Free" : `₹${tournament.entryFee}`}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="grid grid-cols-12 gap-8">
          {/* Left Sidebar */}
          <aside className="col-span-12 lg:col-span-4 space-y-6">
            {/* Matches */}
            <div className="border border-gray-200 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-black">Matches</h2>
                <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse" />
              </div>
              <div className="space-y-3">
                {isLoadingTournaments ? (
                  // Show shimmer while loading
                  Array.from({ length: 2 }).map((_, index) => (
                    <TournamentShimmer key={index} />
                  ))
                ) : tournaments.length > 0 ? (
                  tournaments.map((tournament) => (
                    <TournamentItem
                      key={tournament.id}
                      tournament={tournament}
                    />
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-4xl mb-2">🏏</div>
                    <div className="font-medium">No tournaments available</div>
                    <div className="text-sm">
                      Check back later for upcoming matches
                    </div>
                  </div>
                )}
              </div>
            </div>
          </aside>

          {/* Center Content */}
          <section className="col-span-12 lg:col-span-8">
            <div className="border border-gray-200 rounded-xl p-6">
              <div className="mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-black">
                    Player Performance
                  </h2>
                  <p className="text-gray-500 text-sm mt-1">
                    Track and analyze player statistics
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-6">
                <div className="relative">
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search players by name or team..."
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm bg-white outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                  </div>
                </div>

                <div className="border-b border-gray-200">
                  <div className="flex space-x-8">
                    {(
                      [
                        "Overview",
                        "Batsmen",
                        "Bowlers",
                        "All-rounders",
                        "Wicketkeepers",
                      ] as Role[]
                    ).map((r) => (
                      <TabButton key={r} label={r} />
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-sm font-medium text-gray-900 mb-4">
                    {activeTab === "Overview" ? "All Players" : activeTab} (
                    {visiblePlayers.length})
                  </div>
                  <div className="space-y-0">
                    {isLoadingPerformance ? (
                      // Show shimmer while loading player performance
                      Array.from({ length: 5 }).map((_, index) => (
                        <PlayerShimmer key={index} />
                      ))
                    ) : visiblePlayers.length > 0 ? (
                      visiblePlayers.map((p, idx) => (
                        <PlayerItem key={p.id} player={p} index={idx} />
                      ))
                    ) : (
                      <div className="text-center py-12 text-gray-500">
                        <div className="text-4xl mb-2">🏏</div>
                        <div className="font-medium">No players found</div>
                        <div className="text-sm">
                          Try adjusting your search or filters
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
