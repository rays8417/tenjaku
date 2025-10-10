import { useState, useEffect } from "react";
import axios from "axios";
import { getApiUrl } from "@/lib/constants";

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
  participantCount: number;
  rewardPools: any[];
  createdAt: string;
  totalRewardPool?: number;
}

export function useTournaments() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTournaments = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`${getApiUrl()}/api/tournaments`);
        const tournamentsData = response.data.tournaments || [];
        
        // Map tournaments and calculate total reward pool
        const mappedTournaments = tournamentsData.map((tournament: any) => ({
          ...tournament,
          totalRewardPool: tournament.rewardPools?.reduce(
            (sum: number, pool: any) => sum + Number(pool.totalAmount || 0),
            0
          ) || 0
        }));
        
        setTournaments(mappedTournaments.reverse());
      } catch (error) {
        console.error("Error fetching tournaments:", error);
        setTournaments([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTournaments();
  }, []);

  return { tournaments, loading };
}

