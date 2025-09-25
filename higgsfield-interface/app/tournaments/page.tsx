"use client";

import { use, useEffect, useMemo, useState } from "react";
import axios from "axios";

type Role = "Overview" | "Batsmen" | "Bowlers" | "All-rounders" | "Wicketkeepers";

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


  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/tournaments`)
        console.log("tournaments data on client side", response.data.tournaments)
        setTournaments(response.data.tournaments || [])
      } catch (error) {
        console.error("Error fetching tournaments:", error)
        setTournaments([])
      }
    }

    fetchTournaments()
  }, [])

  const players = useMemo<PlayerRow[]>(
    () => [
      { id: "p1", name: "Babar Azam", team: "PAK", role: "Batsmen", price: "₹9.8m", points: 218, avg: 59.38, strikeRate: 89.34 },
      { id: "p2", name: "Virat Kohli", team: "IND", role: "Batsmen", price: "₹9.5m", points: 206, avg: 58.07, strikeRate: 93.54 },
      { id: "p3", name: "Rohit Sharma", team: "IND", role: "Batsmen", price: "₹9.0m", points: 199, avg: 48.63, strikeRate: 90.90 },
      { id: "p4", name: "Shakib Al Hasan", team: "BAN", role: "All-rounders", price: "₹8.7m", points: 189, avg: 39.66, strikeRate: 84.04 },
      { id: "p5", name: "Shaheen Afridi", team: "PAK", role: "Bowlers", price: "₹8.9m", points: 185 },
      { id: "p6", name: "Jasprit Bumrah", team: "IND", role: "Bowlers", price: "₹8.8m", points: 172 },
      { id: "p7", name: "Mohammad Rizwan", team: "PAK", role: "Wicketkeepers", price: "₹8.6m", points: 165, avg: 49.45, strikeRate: 87.89 },
      { id: "p8", name: "Hardik Pandya", team: "IND", role: "All-rounders", price: "₹8.4m", points: 151, avg: 33.26, strikeRate: 113.55 },
    ],
    []
  );

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

  const PlayerItem = ({ player, index }: { player: PlayerRow; index: number }) => (
    <div className="flex items-center justify-between py-4 border-b border-gray-100 hover:bg-gray-50/50 transition-colors group">
      <div className="flex items-center gap-4">
        <div className="text-sm w-8 text-gray-400 font-mono">{String(index + 1).padStart(2, "0")}</div>
        <div className="relative h-9 w-9 shrink-0 rounded bg-black flex items-center justify-center font-bold text-white text-xs">
          {player.name.split(" ").map((n) => n[0]).join("")}
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
        <div className="text-sm text-gray-600 font-medium">{player.price}</div>
        <div className="bg-black text-white text-sm font-bold px-3 py-1 rounded min-w-[50px] text-center">
          {player.points}
        </div>
      </div>
    </div>
  );

  const TournamentItem = ({ tournament }: { tournament: Tournament }) => {
    const matchDate = new Date(tournament.matchDate)
    const dateStr = matchDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const timeStr = matchDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    
    return (
      <div className="flex flex-col gap-2 p-4 border border-gray-200 rounded-lg hover:bg-gray-50/50 transition-colors">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 bg-gradient-to-br from-orange-500 to-red-600 rounded text-white text-xs font-bold flex items-center justify-center">
                {tournament.team1.substring(0, 3).toUpperCase()}
              </div>
              <span className="text-sm font-medium text-black">{tournament.team1}</span>
            </div>
            <span className="text-xs text-gray-400 font-medium">VS</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-black">{tournament.team2}</span>
              <div className="h-6 w-6 bg-gradient-to-br from-green-500 to-blue-600 rounded text-white text-xs font-bold flex items-center justify-center">
                {tournament.team2.substring(0, 3).toUpperCase()}
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between text-xs">
          <div className="text-gray-600">
            <div className="font-medium">{dateStr} • {timeStr}</div>
            <div className="text-gray-500 mt-1">{tournament.venue || 'Venue TBD'}</div>
            {tournament.description && (
              <div className="text-gray-500 mt-1 text-xs">{tournament.description}</div>
            )}
          </div>
          <div className={`px-2 py-1 rounded-full text-xs font-medium ${
            tournament.status === 'UPCOMING' ? 'bg-blue-100 text-blue-700' :
            tournament.status === 'LIVE' ? 'bg-red-100 text-red-700' :
            'bg-green-100 text-green-700'
          }`}>
            {tournament.status}
          </div>
        </div>
        <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t border-gray-100">
          <div className="text-gray-500">
            Entry Fee: {tournament.entryFee === '0' ? 'Free' : `₹${tournament.entryFee}`}
          </div>
         
        </div>
      </div>
    )
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="grid grid-cols-12 gap-8">
          {/* Left Sidebar */}
          <aside className="col-span-12 lg:col-span-4 space-y-6">
            {/* Tournament Card */}
            <div className="border border-gray-200 rounded-xl p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="text-sm text-gray-500 font-medium">ASIA CUP 2024</div>
                  <h1 className="text-2xl font-bold text-black mt-1">Fantasy Cricket</h1>
                </div>
                <div className="h-12 w-12 rounded-lg bg-black text-white flex items-center justify-center font-bold text-lg">
                  🏏
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <div className="text-3xl font-bold text-black">3,096,340</div>
                  <div className="text-sm text-gray-500 mt-1">Total Points • 4/6 matches remaining</div>
                </div>

                <div className="space-y-3">
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-black rounded-full transition-all duration-500" style={{ width: "33%" }} />
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Progress</span>
                    <span className="font-medium text-black">33%</span>
                  </div>
                </div>

                <div className="border border-orange-200 bg-orange-50 rounded-lg p-4">
                  <div className="text-sm font-bold text-orange-700 mb-2">QUALIFICATION STATUS</div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-gray-600">Active Players</div>
                      <div className="font-bold text-black">5/11</div>
                    </div>
                    <div>
                      <div className="text-gray-600">Min Points</div>
                      <div className="font-bold text-black">180/200</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Fixtures */}
            <div className="border border-gray-200 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-black">Matches</h2>
                <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse" />
              </div>
              <div className="space-y-3">
                {tournaments.length > 0 ? (
                  tournaments.map((tournament) => (
                    <TournamentItem key={tournament.id} tournament={tournament} />
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-4xl mb-2">🏏</div>
                    <div className="font-medium">No tournaments available</div>
                    <div className="text-sm">Check back later for upcoming matches</div>
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
                  <h2 className="text-2xl font-bold text-black">Player Performance</h2>
                  <p className="text-gray-500 text-sm mt-1">Track and analyze player statistics</p>
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
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>

                <div className="border-b border-gray-200">
                  <div className="flex space-x-8">
                    {(["Overview", "Batsmen", "Bowlers", "All-rounders", "Wicketkeepers"] as Role[]).map((r) => (
                      <TabButton key={r} label={r} />
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-sm font-medium text-gray-900 mb-4">
                    {activeTab === "Overview" ? "All Players" : activeTab} ({visiblePlayers.length})
                  </div>
                  <div className="space-y-0">
                    {visiblePlayers.map((p, idx) => (
                      <PlayerItem key={p.id} player={p} index={idx} />
                    ))}
                  </div>
                  {visiblePlayers.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                      <div className="text-4xl mb-2">🏏</div>
                      <div className="font-medium">No players found</div>
                      <div className="text-sm">Try adjusting your search or filters</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

