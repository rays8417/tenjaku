"use client";

import { useState, useEffect } from "react";
import axios from "axios";

interface LeaderboardEntry {
  id: string;
  rank: number;
  walletAddress: string;
  rewards: number;
}

interface Tournament {
  id: string;
  name: string;
  description: string | null;
  matchDate: string;
  team1: string;
  team2: string;
  venue: string | null;
  status: "UPCOMING" | "ONGOING" | "COMPLETED";
  entryFee: string;
  maxParticipants: number | null;
  currentParticipants: number;
  rewardPools: any[];
  createdAt: string;
}

export default function LeaderboardPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [currentTournament, setCurrentTournament] = useState<Tournament | null>(null);
  
  // Mock data for now - replace with actual API call
  const mockData: LeaderboardEntry[] = [
    { id: "1", rank: 1, walletAddress: "0x1234...5678", rewards: 1250.50 },
    { id: "2", rank: 2, walletAddress: "0x2345...6789", rewards: 1180.25 },
    { id: "3", rank: 3, walletAddress: "0x3456...7890", rewards: 1100.75 },
    { id: "4", rank: 4, walletAddress: "0x4567...8901", rewards: 950.30 },
    { id: "5", rank: 5, walletAddress: "0x5678...9012", rewards: 875.60 },
    { id: "6", rank: 6, walletAddress: "0x6789...0123", rewards: 800.45 },
    { id: "7", rank: 7, walletAddress: "0x7890...1234", rewards: 750.20 },
    { id: "8", rank: 8, walletAddress: "0x8901...2345", rewards: 700.15 },
    { id: "9", rank: 9, walletAddress: "0x9012...3456", rewards: 650.80 },
    { id: "10", rank: 10, walletAddress: "0x0123...4567", rewards: 600.40 },
  ];

  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // First, fetch all tournaments
        const tournamentsResponse = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/api/tournaments`
        );
        
        console.log('Tournaments response:', tournamentsResponse.data);
        const allTournaments = tournamentsResponse.data.tournaments || [];
        setTournaments(allTournaments);
        
        // Find the latest completed tournament
        const completedTournaments = allTournaments.filter(
          (tournament: Tournament) => tournament.status === "COMPLETED"
        );
        
        if (completedTournaments.length === 0) {
          setError("No completed tournaments found");
          setLoading(false);
          return;
        }
        
        // Sort by creation date and get the latest one
        const latestCompletedTournament = completedTournaments.sort(
          (a: Tournament, b: Tournament) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )[0];
        
        console.log('Latest completed tournament:', latestCompletedTournament);
        setCurrentTournament(latestCompletedTournament);
        
        // Now fetch leaderboard data for this tournament
        const leaderboardResponse = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/api/user-rewards/leaderboard/${latestCompletedTournament.id}`
        );
        
        console.log('Leaderboard API Response:', leaderboardResponse.data);
        
        // Extract leaderboard data from the response
        const leaderboardData = leaderboardResponse.data.leaderboard || [];
        
        // Transform the data to match our interface
        const transformedData: LeaderboardEntry[] = leaderboardData.map((item: any, index: number) => ({
          id: item.address || `entry-${index}`,
          rank: item.rank || index + 1,
          walletAddress: item.address || '',
          rewards: item.amount || 0
        }));
        
        setLeaderboardData(transformedData);
        setLoading(false);
      } catch (err: any) {
        console.error('Error fetching data:', err);
        setError("Failed to fetch tournament or leaderboard data");
        
        // Fallback to mock data in case of error
        setLeaderboardData(mockData);
        setLoading(false);
      }
    };

    fetchTournaments();
  }, []);

  const filteredData = leaderboardData.filter(entry =>
    entry.walletAddress.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatWalletAddress = (address: string) => {
    if (address.length <= 10) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatRewards = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-6xl px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-black">Leaderboard</h1>
              <p className="text-gray-500 text-sm mt-1">
                {currentTournament 
                  ? `${currentTournament.team1} vs ${currentTournament.team2}` 
                  : 'Tournament rewards and rankings'
                }
              </p>
              {currentTournament && (
                <p className="text-gray-400 text-xs mt-1">
                  Match Date: {new Date(currentTournament.matchDate).toLocaleDateString()}
                </p>
              )}
            </div>
            <div className="text-2xl">🏆</div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search wallet addresses..."
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
          </div>
        </div>

        {/* Leaderboard Table */}
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          {/* Table Header */}
          <div className="bg-gray-50 border-b border-gray-200">
            <div className="grid grid-cols-3 gap-4 px-6 py-4">
              <div className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Rank</div>
              <div className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Wallet Address</div>
              <div className="text-sm font-semibold text-gray-700 uppercase tracking-wide text-right">Rewards</div>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
              <div className="text-gray-500 mt-2">Loading leaderboard...</div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="text-center py-12 text-red-500">
              <div className="text-4xl mb-2">⚠️</div>
              <div className="font-medium">{error}</div>
            </div>
          )}

          {/* Table Body */}
          {!loading && !error && (
            <div className="divide-y divide-gray-100">
              {filteredData.map((entry, index) => (
                <div
                  key={entry.id}
                  className="grid grid-cols-3 gap-4 px-6 py-4 hover:bg-gray-50/50 transition-colors group"
                >
                  {/* Rank */}
                  <div className="flex items-center">
                    {entry.rank <= 3 ? (
                      <div className="flex items-center gap-2">
                        <div className="text-2xl">
                          {entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : "🥉"}
                        </div>
                        <span className="text-lg font-bold text-gray-900">#{entry.rank}</span>
                      </div>
                    ) : (
                      <span className="text-lg font-bold text-gray-600">#{entry.rank}</span>
                    )}
                  </div>

                  {/* Wallet Address */}
                  <div className="flex items-center">
                    <div className="font-mono text-sm text-gray-900 bg-gray-100 px-3 py-1 rounded-md">
                      {formatWalletAddress(entry.walletAddress)}
                    </div>
                  </div>

                  {/* Rewards */}
                  <div className="text-right">
                    <div className="text-lg font-bold text-black">
                      {formatRewards(entry.rewards)} BOSON
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Empty State */}
              {filteredData.length === 0 && !loading && (
                <div className="text-center py-12 text-gray-500">
                  <div className="text-4xl mb-2">🏆</div>
                  <div className="font-medium">No entries found</div>
                  <div className="text-sm">Try adjusting your search</div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Info */}
        {!loading && !error && filteredData.length > 0 && (
          <div className="mt-6 text-center text-sm text-gray-500">
            Showing {filteredData.length} of {leaderboardData.length} entries
          </div>
        )}
      </div>
    </div>
  );
}
