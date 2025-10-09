import { useState, useEffect } from "react";
import axios from "axios";
import { getApiUrl } from "@/lib/constants";

interface PlayerScore {
  id: string;
  tournamentId: string;
  playerId: string | null;
  moduleName: string;
  runs: number;
  ballsFaced: number;
  wickets: number;
  oversBowled: string;
  runsConceded: number;
  catches: number;
  stumpings: number;
  runOuts: number;
  fantasyPoints: string;
  createdAt: string;
  updatedAt: string;
  player: any | null;
}

export function useTournamentPerformance(tournamentId?: string) {
  const [playerScores, setPlayerScores] = useState<PlayerScore[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!tournamentId) {
      setLoading(false);
      return;
    }

    const fetchPerformance = async () => {
      setLoading(true);
      try {
        const response = await axios.get(
          `${getApiUrl()}/api/tournaments/${tournamentId}`
        );
        setPlayerScores(response.data.tournament.playerScores || []);
      } catch (error) {
        console.error("Error fetching tournament performance:", error);
        setPlayerScores([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPerformance();
  }, [tournamentId]);

  return { playerScores, loading };
}

