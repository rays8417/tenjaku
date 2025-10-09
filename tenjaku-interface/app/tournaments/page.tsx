"use client";

import { useMemo, useState } from "react";
import SearchBar from "@/components/ui/SearchBar";
import EmptyState from "@/components/ui/EmptyState";
import TournamentCard from "@/components/tournaments/TournamentCard";
import UpcomingMatchCard from "@/components/tournaments/UpcomingMatchCard";
import RoleTabs from "@/components/tournaments/RoleTabs";
import PlayerPerformanceTable from "@/components/tournaments/PlayerPerformanceTable";
import TournamentShimmer from "@/components/tournaments/TournamentShimmer";
import PlayerShimmer from "@/components/tournaments/PlayerShimmer";
import { useTournaments } from "@/hooks/useTournaments";
import { useUpcomingMatches } from "@/hooks/useUpcomingMatches";
import { useTournamentPerformance } from "@/hooks/useTournamentPerformance";

type Role = "Overview" | "Batsmen" | "Bowlers" | "All-rounders" | "Wicketkeepers";

interface PlayerRow {
  id: string;
  name: string;
  role: Exclude<Role, "Overview">;
  points: number;
  avg?: number;
  strikeRate?: number;
}

export default function TournamentsPage() {
  const [activeTab, setActiveTab] = useState<Role>("Overview");
  const [query, setQuery] = useState("");
  
  const { tournaments, loading: isLoadingTournaments } = useTournaments();
  const { upcomingMatches, loading: isLoadingUpcomingMatches } = useUpcomingMatches();
  const latestTournamentId = tournaments.length > 0 ? tournaments[0].id : undefined;
  const { playerScores, loading: isLoadingPerformance } = useTournamentPerformance(latestTournamentId);

  const determinePlayerRole = (playerScore: any): Exclude<Role, "Overview"> => {
    const { runs, wickets, stumpings } = playerScore;
    if (wickets > 0) return runs > 0 ? "All-rounders" : "Bowlers";
    if (stumpings > 0) return "Wicketkeepers";
    return "Batsmen";
  };

  const calculateStrikeRate = (runs: number, ballsFaced: number): number | undefined => {
    if (ballsFaced === 0) return undefined;
    return Number(((runs / ballsFaced) * 100).toFixed(2));
  };

  const calculateAverage = (runs: number, ballsFaced: number): number | undefined => {
    if (ballsFaced === 0) return undefined;
    return Number((runs / (ballsFaced / 6)).toFixed(2));
  };

  const players = useMemo<PlayerRow[]>(() => {
    if (playerScores.length === 0) return [];

    return playerScores
      .map((playerScore) => {
        const strikeRate = calculateStrikeRate(playerScore.runs, playerScore.ballsFaced);
        const avg = calculateAverage(playerScore.runs, playerScore.ballsFaced);

        return {
          id: playerScore.id,
          name: playerScore.moduleName.replace(/([A-Z])/g, " $1").trim(),
          role: determinePlayerRole(playerScore),
          points: parseInt(playerScore.fantasyPoints),
          avg,
          strikeRate,
        };
      })
      .sort((a, b) => b.points - a.points);
  }, [playerScores]);

  const visiblePlayers = players.filter((p) => {
    const matchesTab = activeTab === "Overview" ? true : p.role === activeTab;
    const matchesQuery = query.trim()
      ? p.name.toLowerCase().includes(query.toLowerCase())
      : true;
    return matchesTab && matchesQuery;
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="grid grid-cols-12 gap-8">
          <aside className="col-span-12 lg:col-span-4 space-y-6">
            <div className="border border-border rounded-xl p-6 bg-card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-foreground">Tournments</h2>
                <div className="h-2 w-2 bg-error rounded-full animate-pulse" />
              </div>
              <div className="space-y-3 max-h-[600px] overflow-y-auto scrollbar-thin pr-2">
                {isLoadingTournaments ? (
                  Array.from({ length: 2 }).map((_, index) => (
                    <TournamentShimmer key={index} />
                  ))
                ) : tournaments.length > 0 ? (
                  tournaments.map((tournament) => (
                    <TournamentCard key={tournament.id} tournament={tournament} />
                  ))
                ) : (
                  <EmptyState
                    icon={
                      <svg className="h-12 w-12 text-foreground-subtle" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    }
                    title="Tournament will start when the upcoming match starts"
                    description="Make sure you hold player tokens before the tournament starts"
                  />
                )}
              </div>
            </div>

            <div className="border border-border rounded-xl p-6 bg-card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-foreground">Upcoming Matches</h2>
                <div className="h-2 w-2 bg-info rounded-full animate-pulse" />
              </div>
              <div className="space-y-4 max-h-[500px] overflow-y-auto scrollbar-thin pr-2">
                {isLoadingUpcomingMatches ? (
                  Array.from({ length: 2 }).map((_, index) => (
                    <TournamentShimmer key={index} />
                  ))
                ) : upcomingMatches.length > 0 ? (
                  upcomingMatches.map((match) => (
                    <UpcomingMatchCard key={match.matchId} match={match} />
                  ))
                ) : (
                  <EmptyState
                    icon={
                      <svg className="h-12 w-12 text-foreground-subtle" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    }
                    title="No upcoming matches"
                    description="Check back later for upcoming cricket matches"
                  />
                )}
              </div>
            </div>
          </aside>

          <section className="col-span-12 lg:col-span-8">
            <div className="border border-border rounded-xl p-6 bg-card">
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-foreground">Player Performance</h2>
                <p className="text-foreground-muted text-sm mt-1">
                  Track and analyze player statistics
                </p>
              </div>

              <div className="flex flex-col gap-6">
                <SearchBar
                  value={query}
                  onChange={setQuery}
                  placeholder="Search players by name or team..."
                />

                <RoleTabs activeTab={activeTab} onTabChange={setActiveTab} />

                <div className="space-y-1">
                  <div className="text-sm font-medium text-foreground mb-4">
                    {activeTab === "Overview" ? "Eligible Players" : activeTab} ({visiblePlayers.length})
                  </div>
                  <div className="space-y-0">
                    {isLoadingPerformance ? (
                      Array.from({ length: 5 }).map((_, index) => (
                        <PlayerShimmer key={index} />
                      ))
                    ) : (
                      <PlayerPerformanceTable players={visiblePlayers} />
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
