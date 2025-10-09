"use client";

import { useMemo, useState } from "react";
import SearchBar from "@/components/ui/SearchBar";
import EmptyState from "@/components/ui/EmptyState";
import TournamentCard from "@/components/tournaments/TournamentCard";
import PlayerPerformanceTable from "@/components/tournaments/PlayerPerformanceTable";
import TournamentShimmer from "@/components/tournaments/TournamentShimmer";
import PlayerShimmer from "@/components/tournaments/PlayerShimmer";
import PastTournamentModal from "@/components/tournaments/PastTournamentModal";
import { useTournaments } from "@/hooks/useTournaments";
import { useTournamentPlayers } from "@/hooks/useTournamentPlayers";
import { usePlayerHoldings } from "@/hooks/usePlayerHoldings";
import { useWallet } from "@/contexts/WalletContext";

interface PlayerRow {
  id: string;
  name: string;
  points: number;
  holdings: number;
  moduleName: string;
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
  totalRewardPool?: number;
}

export default function TournamentsPage() {
  const [query, setQuery] = useState("");
  const [selectedPastTournament, setSelectedPastTournament] = useState<Tournament | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { account } = useWallet();
  
  const { tournaments, loading: isLoadingTournaments } = useTournaments();
  
  // Filter tournaments by status
  const activeTournaments = useMemo(() => 
    tournaments.filter(t => t.status === "UPCOMING" || t.status === "LIVE"),
    [tournaments]
  );
  const pastTournaments = useMemo(() => 
    tournaments.filter(t => t.status === "COMPLETED"),
    [tournaments]
  );
  
  // Get the active tournament (first one from activeTournaments)
  const activeTournament = useMemo(() => 
    activeTournaments.length > 0 ? activeTournaments[0] : null,
    [activeTournaments]
  );
  
  const { players: tournamentPlayers, loading: isLoadingPlayers } = useTournamentPlayers(
    activeTournament?.id,
    activeTournament?.status
  );
  const { holdings, loading: isLoadingHoldings } = usePlayerHoldings(account?.address);

  const players = useMemo<PlayerRow[]>(() => {
    if (tournamentPlayers.length === 0) return [];

    return tournamentPlayers
      .map((player) => {
        // Match holdings by player module name
        const holding = holdings.find(h => {
          const holdingName = h.playerName.replace(/\s+/g, '');
          const playerModuleName = player.moduleName.replace(/\s+/g, '');
          return holdingName.toLowerCase() === playerModuleName.toLowerCase();
        });

        return {
          id: player.id,
          name: player.name,
          moduleName: player.moduleName,
          points: parseInt(player.fantasyPoints),
          holdings: holding?.shares || 0,
        };
      })
      .sort((a, b) => b.holdings - a.holdings);
  }, [tournamentPlayers, holdings]);

  const visiblePlayers = players.filter((p) => {
    const matchesQuery = query.trim()
      ? p.name.toLowerCase().includes(query.toLowerCase())
      : true;
    return matchesQuery;
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="grid grid-cols-12 gap-8">
          <aside className="col-span-12 lg:col-span-4 space-y-6">
            <div className="border border-border rounded-xl p-6 bg-card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-foreground">Active Tournament</h2>
                <div className="h-2 w-2 bg-error rounded-full animate-pulse" />
              </div>
              <div className="space-y-3 max-h-[600px] overflow-y-auto scrollbar-thin pr-2">
                {isLoadingTournaments ? (
                  Array.from({ length: 2 }).map((_, index) => (
                    <TournamentShimmer key={index} />
                  ))
                ) : activeTournaments.length > 0 ? (
                  activeTournaments.map((tournament) => (
                    <TournamentCard key={tournament.id} tournament={tournament} />
                  ))
                ) : (
                  <EmptyState
                    icon={
                      <svg className="h-12 w-12 text-foreground-subtle" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    }
                    title="No active tournaments"
                    description="Check back later for upcoming tournaments or matches"
                  />
                )}
              </div>
            </div>

            <div className="border border-border rounded-xl p-6 bg-card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-foreground">Past Tournaments</h2>
                <div className="h-2 w-2 bg-foreground-subtle rounded-full" />
              </div>
              <div className="space-y-4 max-h-[500px] overflow-y-auto scrollbar-thin pr-2">
                {isLoadingTournaments ? (
                  Array.from({ length: 2 }).map((_, index) => (
                    <TournamentShimmer key={index} />
                  ))
                ) : pastTournaments.length > 0 ? (
                  pastTournaments.map((tournament) => (
                    <TournamentCard 
                      key={tournament.id} 
                      tournament={tournament}
                      onClick={() => {
                        setSelectedPastTournament(tournament);
                        setIsModalOpen(true);
                      }}
                    />
                  ))
                ) : (
                  <EmptyState
                    icon={
                      <svg className="h-12 w-12 text-foreground-subtle" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    }
                    title="No past tournaments"
                    description="Completed tournaments will appear here"
                  />
                )}
              </div>
            </div>
          </aside>

          <section className="col-span-12 lg:col-span-8">
            <div className="border border-border rounded-xl p-6 bg-card">
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-foreground">Eligible Players for this Tournament</h2>
                <p className="text-foreground-muted text-sm mt-1">
                  Track player performance and your holdings
                </p>
              </div>

              <div className="flex flex-col gap-6">
                <SearchBar
                  value={query}
                  onChange={setQuery}
                  placeholder="Search players by name..."
                />

                <div className="space-y-1">
                  <div className="text-sm font-medium text-foreground mb-4">
                    {visiblePlayers.length} {visiblePlayers.length === 1 ? 'Player' : 'Players'}
                  </div>
                  <div className="space-y-0">
                    {isLoadingPlayers || isLoadingHoldings ? (
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

      {/* Past Tournament Modal */}
      <PastTournamentModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedPastTournament(null);
        }}
        tournament={selectedPastTournament}
      />
    </div>
  );
}
