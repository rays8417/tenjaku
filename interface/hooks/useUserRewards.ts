import { useState, useEffect } from "react";
import axios from "axios";
import { getApiUrl } from "@/lib/constants";

interface UserRewards {
  totalEarnings: number;
  totalRewards: number;
}

export function useUserRewards(walletAddress?: string) {
  const [userRewards, setUserRewards] = useState<UserRewards | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRewards = async () => {
      if (!walletAddress) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await axios.get(
          `${getApiUrl()}/api/user-rewards/${walletAddress}`
        );
        
        const rewardsData: UserRewards = {
          totalEarnings: response.data.totalEarnings || 0,
          totalRewards: response.data.totalRewards || 0
        };
        
        setUserRewards(rewardsData);
      } catch (err) {
        console.error('Error fetching user rewards:', err);
        setUserRewards({ totalEarnings: 0, totalRewards: 0 });
      } finally {
        setLoading(false);
      }
    };

    fetchRewards();
  }, [walletAddress]);

  return { userRewards, loading };
}

