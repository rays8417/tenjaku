"use client";

import { useState } from "react";

interface Player {
  id: string;
  rank: number;
  username: string;
  skillRating: number;
  tier: "Elite" | "Bronze" | "Silver" | "Gold" | "Platinum";
  avatar: string;
}

export default function LeaderboardPage() {
  const [searchQuery, setSearchQuery] = useState("");
  
  // Current user data
  const currentUser = {
    username: "stuckskink#9897",
    tier: "Bronze" as const,
    rep: 0,
    skillRating: 0,
    squadValue: 0,
    level: 1,
    nextLevel: 200,
    avatar: "S"
  };

  // Mock leaderboard data
  const players: Player[] = [
    { id: "1", rank: 1, username: "legalelk#7166", skillRating: 2253.399055, tier: "Elite", avatar: "L" },
    { id: "2", rank: 2, username: "Shogun_2332", skillRating: 2237.692764, tier: "Elite", avatar: "S" },
    { id: "3", rank: 3, username: "Prixm", skillRating: 2163.776323, tier: "Elite", avatar: "P" },
    { id: "4", rank: 4, username: "kimbokitten", skillRating: 2138.098622, tier: "Elite", avatar: "K" },
    { id: "5", rank: 5, username: "Rom1", skillRating: 2132.154509, tier: "Elite", avatar: "R" },
    { id: "6", rank: 6, username: "Lukalaki", skillRating: 2103.658032, tier: "Elite", avatar: "L" },
    { id: "7", rank: 7, username: "JLitxs", skillRating: 2094.923306, tier: "Elite", avatar: "J" },
  ];

  const filteredPlayers = players.filter(player =>
    player.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getTierColor = (tier: string) => {
    switch (tier) {
      case "Elite": return "bg-black text-white";
      case "Bronze": return "bg-black text-white";
      case "Silver": return "bg-gray-600 text-white";
      case "Gold": return "bg-black text-white";
      case "Platinum": return "bg-gray-800 text-white";
      default: return "bg-gray-500 text-white";
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
        <div className="flex gap-8">
          {/* Left Sidebar - User Profile */}
          <aside className="w-80 flex-shrink-0">
            <div className="bg-white border border-gray-200 rounded-lg p-6 text-black h-fit shadow-sm">
              {/* User Avatar and Info */}
              <div className="flex items-center gap-4 mb-8">
                <div className="h-20 w-20 rounded-full bg-gray-600 flex items-center justify-center text-white text-3xl font-bold">
                  {currentUser.avatar}
                </div>
                <div>
                  <h2 className="font-medium text-xl text-black">{currentUser.username}</h2>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-black text-lg">★</span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getTierColor(currentUser.tier)}`}>
                      {currentUser.tier}
                    </span>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="space-y-8">
                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-3">REP</div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-black font-medium">★ LVL {currentUser.level}</span>
                  </div>
                  <div className="text-3xl font-light text-black mb-2">{currentUser.rep}</div>
                  <div className="text-xs text-gray-500">Next level {currentUser.nextLevel}</div>
                </div>

                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-3">SKILL RATING</div>
                  <div className="text-3xl font-light text-black">{currentUser.skillRating}</div>
                </div>

                <div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-3">SQUAD VALUE</div>
                  <div className="flex items-center gap-2">
                    <span className="text-black text-lg">🪙</span>
                    <span className="text-black text-lg">{currentUser.squadValue}</span>
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-200">
                  <div className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-4">MY TEAM</div>
                  <button className="w-full text-left text-sm text-gray-600 hover:text-black transition-colors flex items-center justify-between">
                    <span>JOIN TEAM WITH CODE</span>
                    <span>→</span>
                  </button>
                </div>

                <div className="pt-6 border-t border-gray-200">
                  <div className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-4">TROPHY CABINET</div>
                </div>
              </div>

            </div>
          </aside>

          {/* Main Content - Leaderboard */}
          <main className="flex-1">
            <div className="bg-white border border-gray-200 rounded-lg p-8 text-black shadow-sm">
              {/* Header */}
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h1 className="text-3xl font-medium text-black mb-4">Leaderboard</h1>
                  <div className="flex items-center gap-4">
                    <span className="px-4 py-2 bg-black text-white rounded-full text-sm font-medium">
                      Skill Rating
                    </span>
                  </div>
                </div>
                <div className="relative w-80">
                  <input
                    type="text"
                    placeholder="Search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-black placeholder-gray-500 outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
                    🔍
                  </div>
                </div>
              </div>

              {/* Table Header */}
              <div className="grid grid-cols-12 gap-6 text-xs uppercase tracking-wider text-gray-500 mb-6 px-6 py-2">
                <div className="col-span-1">POSITION</div>
                <div className="col-span-6">PLAYER</div>
                <div className="col-span-2">RANK</div>
                <div className="col-span-3 text-right">SKILL RATING</div>
              </div>

              {/* Current User Row */}
              <div className="mb-6">
                <div className="rounded-lg bg-black text-white p-5 flex items-center gap-4">
                  <span className="text-sm font-medium w-8">-</span>
                  <div className="h-12 w-12 rounded-full bg-gray-600 flex items-center justify-center text-white font-semibold text-lg">
                    {currentUser.avatar}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-lg">{currentUser.username}</div>
                  </div>
                  <div className={`px-4 py-2 rounded-full text-sm font-medium ${getTierColor(currentUser.tier)}`}>
                    {currentUser.tier}
                  </div>
                </div>
              </div>

              {/* Leaderboard List */}
              <div className="space-y-2">
                {filteredPlayers.map((player) => (
                  <div
                    key={player.id}
                    className="grid grid-cols-12 gap-6 items-center rounded-lg bg-gray-50 border border-gray-100 p-5 hover:bg-gray-100 transition-colors"
                  >
                    <div className="col-span-1 text-sm font-medium text-black">
                      {String(player.rank).padStart(2, "0")}
                    </div>
                    <div className="col-span-6 flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-gray-600 flex items-center justify-center text-white font-semibold text-lg">
                        {player.avatar}
                      </div>
                      <span className="font-medium text-black text-lg">{player.username}</span>
                    </div>
                    <div className="col-span-2">
                      <span className={`px-4 py-2 rounded-full text-sm font-medium ${getTierColor(player.tier)}`}>
                        {player.tier}
                      </span>
                    </div>
                    <div className="col-span-3 text-right font-mono text-lg text-black">
                      {player.skillRating.toFixed(6)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
