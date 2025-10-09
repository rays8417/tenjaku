import { useState, useEffect } from "react";
import axios from "axios";
import { getApiUrl } from "@/lib/constants";

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

export function useLeaderboardData() {
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [currentTournament, setCurrentTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch all tournaments
        const tournamentsResponse = await axios.get(
          `${getApiUrl()}/api/tournaments`
        );
        
        const allTournaments = tournamentsResponse.data.tournaments || [];
        
        // Find the latest completed tournament
        const completedTournaments = allTournaments.filter(
          (tournament: Tournament) => tournament.status === "COMPLETED"
        );
        
        if (completedTournaments.length === 0) {
          setError("No completed tournaments found");
          setLoading(false);
          return;
        }
        
        const latestCompletedTournament = completedTournaments.sort(
          (a: Tournament, b: Tournament) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )[0];
        
        setCurrentTournament(latestCompletedTournament);
        
        // Fetch leaderboard data for this tournament
        const leaderboardResponse = await axios.get(
          `${getApiUrl()}/api/user-rewards/leaderboard/${latestCompletedTournament.id}`
        );
        
        const leaderboardData = leaderboardResponse.data.leaderboard || [];
        
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
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return { leaderboardData, currentTournament, loading, error };
}

