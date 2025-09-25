"use client";

import { useState } from "react";

interface Player {
  id: string;
  rank: number;
  username: string;
  fantasyPoints: number;
  tier: "Elite" | "Bronze" | "Silver" | "Gold" | "Platinum";
  avatar: string;
  totalMatches: number;
  averageScore: number;
  winRate: number;
}

export default function LeaderboardPage() {
  const [searchQuery, setSearchQuery] = useState("");
  
  // Current user data
  const currentUser = {
    username: "CricketFan#9897",
    tier: "Bronze" as const,
    fantasyPoints: 12450,
    totalMatches: 15,
    averageScore: 830,
    winRate: 60,
    level: 3,
    nextLevelPoints: 15000,
    avatar: "C",
    rank: 892
  };

  // Mock leaderboard data with cricket context
  const players: Player[] = [
    { id: "1", rank: 1, username: "CricketKing#7166", fantasyPoints: 45230, tier: "Elite", avatar: "C", totalMatches: 89, averageScore: 1450, winRate: 89 },
    { id: "2", rank: 2, username: "BallByBall#2332", fantasyPoints: 42370, tier: "Elite", avatar: "B", totalMatches: 76, averageScore: 1380, winRate: 85 },
    { id: "3", rank: 3, username: "SixHitter#9901", fantasyPoints: 38650, tier: "Elite", avatar: "S", totalMatches: 71, averageScore: 1290, winRate: 82 },
    { id: "4", rank: 4, username: "SpinMaster#4455", fantasyPoints: 35890, tier: "Elite", avatar: "S", totalMatches: 68, averageScore: 1220, winRate: 79 },
    { id: "5", rank: 5, username: "PowerPlay#7789", fantasyPoints: 33210, tier: "Gold", avatar: "P", totalMatches: 65, averageScore: 1180, winRate: 76 },
    { id: "6", rank: 6, username: "BoundaryLord#3344", fantasyPoints: 31580, tier: "Gold", avatar: "B", totalMatches: 62, averageScore: 1150, winRate: 74 },
    { id: "7", rank: 7, username: "WicketKeeper#5566", fantasyPoints: 29940, tier: "Gold", avatar: "W", totalMatches: 59, averageScore: 1120, winRate: 71 },
  ];

  const filteredPlayers = players.filter(player =>
    player.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getTierColor = (tier: string) => {
    switch (tier) {
      case "Elite": return "bg-gradient-to-r from-purple-600 to-blue-600 text-white";
      case "Gold": return "bg-gradient-to-r from-yellow-500 to-orange-500 text-white";
      case "Silver": return "bg-gradient-to-r from-gray-400 to-gray-600 text-white";
      case "Bronze": return "bg-gradient-to-r from-orange-700 to-red-700 text-white";
      case "Platinum": return "bg-gradient-to-r from-gray-300 to-gray-500 text-black";
      default: return "bg-gray-500 text-white";
    }
  };

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case "Elite": return "👑";
      case "Gold": return "🥇";
      case "Silver": return "🥈";
      case "Bronze": return "🥉";
      case "Platinum": return "💎";
      default: return "🏆";
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="grid grid-cols-12 gap-8">
          {/* Left Sidebar - User Profile */}
          <aside className="col-span-12 lg:col-span-4">
            <div className="border border-gray-200 rounded-xl p-6 space-y-6">
              {/* User Profile Header */}
              <div className="flex items-start gap-4">
                <div className="h-16 w-16 rounded-lg bg-black text-white flex items-center justify-center text-2xl font-bold">
                  {currentUser.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-bold text-xl text-black truncate">{currentUser.username}</h2>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-lg">{getTierIcon(currentUser.tier)}</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${getTierColor(currentUser.tier)}`}>
                      {currentUser.tier}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 mt-1">Rank #{currentUser.rank.toLocaleString()}</div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-black">{currentUser.totalMatches}</div>
                  <div className="text-sm text-gray-600">Matches</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-black">{currentUser.winRate}%</div>
                  <div className="text-sm text-gray-600">Win Rate</div>
                </div>
              </div>

              {/* Detailed Stats */}
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600">FANTASY POINTS</span>
                    <span className="text-sm text-gray-500">Level {currentUser.level}</span>
                  </div>
                  <div className="text-3xl font-bold text-black">{currentUser.fantasyPoints.toLocaleString()}</div>
                  <div className="mt-3">
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-black rounded-full transition-all duration-500" 
                        style={{ width: `${(currentUser.fantasyPoints / currentUser.nextLevelPoints) * 100}%` }} 
                      />
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-2">
                      <span>{currentUser.fantasyPoints.toLocaleString()}</span>
                      <span>{currentUser.nextLevelPoints.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium text-gray-600 mb-2">AVERAGE SCORE</div>
                  <div className="text-2xl font-bold text-black">{currentUser.averageScore}</div>
                  <div className="text-sm text-gray-500">Per match</div>
                </div>

                <div className="pt-6 border-t border-gray-200">
                  <div className="text-sm font-medium text-gray-600 mb-4">ACHIEVEMENTS</div>
                  <div className="grid grid-cols-4 gap-2">
                    <div className="bg-gray-100 rounded-lg p-3 text-center">
                      <div className="text-xl">🏏</div>
                      <div className="text-xs text-gray-600 mt-1">Player</div>
                    </div>
                    <div className="bg-gray-100 rounded-lg p-3 text-center opacity-50">
                      <div className="text-xl">🎯</div>
                      <div className="text-xs text-gray-600 mt-1">Scorer</div>
                    </div>
                    <div className="bg-gray-100 rounded-lg p-3 text-center opacity-50">
                      <div className="text-xl">⚡</div>
                      <div className="text-xs text-gray-600 mt-1">Streak</div>
                    </div>
                    <div className="bg-gray-100 rounded-lg p-3 text-center opacity-50">
                      <div className="text-xl">🏆</div>
                      <div className="text-xs text-gray-600 mt-1">Winner</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content - Leaderboard */}
          <main className="col-span-12 lg:col-span-8">
            <div className="border border-gray-200 rounded-xl p-6">
              {/* Header */}
              <div className="flex flex-col gap-6 mb-8">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-2xl font-bold text-black">Fantasy Cricket Leaderboard</h1>
                    <p className="text-gray-500 text-sm mt-1">Top performers in the fantasy league</p>
                  </div>
                  <div className="text-2xl">🏏</div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="Search players..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm bg-white outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-4 py-2 bg-black text-white rounded-lg text-sm font-medium">
                      Fantasy Points
                    </span>
                  </div>
                </div>
              </div>

              {/* Current User Highlight */}
              <div className="mb-6">
                <div className="text-sm font-medium text-gray-600 mb-3">YOUR POSITION</div>
                <div className="bg-gradient-to-r from-black to-gray-800 text-white rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="text-lg font-bold">#{currentUser.rank}</div>
                      <div className="h-10 w-10 rounded bg-white/20 flex items-center justify-center text-white font-bold">
                        {currentUser.avatar}
                      </div>
                      <div>
                        <div className="font-semibold">{currentUser.username}</div>
                        <div className="text-sm text-gray-300">{currentUser.totalMatches} matches • {currentUser.winRate}% win rate</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">{currentUser.fantasyPoints.toLocaleString()}</div>
                      <div className="text-sm text-gray-300">Fantasy Points</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Leaderboard */}
              <div className="space-y-1">
                <div className="text-sm font-medium text-gray-900 mb-4">
                  Top Players ({filteredPlayers.length})
                </div>
                
                {filteredPlayers.map((player, index) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between py-4 border-b border-gray-100 hover:bg-gray-50/50 transition-colors group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-3">
                        {player.rank <= 3 ? (
                          <div className="text-2xl">
                            {player.rank === 1 ? "🥇" : player.rank === 2 ? "🥈" : "🥉"}
                          </div>
                        ) : (
                          <div className="text-lg font-bold text-gray-400 w-8 text-center">
                            {player.rank}
                          </div>
                        )}
                      </div>
                      <div className="h-10 w-10 rounded bg-black flex items-center justify-center text-white font-bold text-sm">
                        {player.avatar}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-black">{player.username}</div>
                        <div className="text-xs text-gray-500 flex items-center gap-3">
                          <span className="flex items-center gap-1">
                            <span>{getTierIcon(player.tier)}</span>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${getTierColor(player.tier)}`}>
                              {player.tier}
                            </span>
                          </span>
                          <span>{player.totalMatches} matches</span>
                          <span>{player.winRate}% win rate</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-black text-lg">{player.fantasyPoints.toLocaleString()}</div>
                      <div className="text-xs text-gray-500">Avg {player.averageScore}</div>
                    </div>
                  </div>
                ))}
                
                {filteredPlayers.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <div className="text-4xl mb-2">🏏</div>
                    <div className="font-medium">No players found</div>
                    <div className="text-sm">Try adjusting your search</div>
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
