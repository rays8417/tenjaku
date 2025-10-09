import { useState, useEffect } from "react";
import axios from "axios";
import { getApiUrl } from "@/lib/constants";

interface LeaderboardEntry {
  id: string;
  rank: number;
  walletAddress: string;
  rewards: number;
}

export function useLeaderboardData() {
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [totalAddresses, setTotalAddresses] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch universal leaderboard data
        const leaderboardResponse = await axios.get(
          `${getApiUrl()}/api/user-rewards/leaderboard/universal`
        );
        
        const leaderboardData = leaderboardResponse.data.leaderboard || [];
        const totalAddresses = leaderboardResponse.data.totalAddresses || 0;
        
        const transformedData: LeaderboardEntry[] = leaderboardData.map((item: any) => ({
          id: item.address || `entry-${item.rank}`,
          rank: item.rank,
          walletAddress: item.address || '',
          rewards: item.amount || 0
        }));
        
        setLeaderboardData(transformedData);
        setTotalAddresses(totalAddresses);
        setLoading(false);
      } catch (err: any) {
        console.error('Error fetching data:', err);
        setError("Failed to fetch leaderboard data");
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return { leaderboardData, totalAddresses, loading, error };
}

