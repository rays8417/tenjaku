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
  status: "UPCOMING" | "LIVE" | "COMPLETED";
  entryFee: string;
  maxParticipants: number | null;
  currentParticipants: number;
  participantCount: number;
  rewardPools: any[];
  createdAt: string;
}

export function useTournaments() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTournaments = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`${getApiUrl()}/api/tournaments`);
        setTournaments((response.data.tournaments || []).reverse());
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

