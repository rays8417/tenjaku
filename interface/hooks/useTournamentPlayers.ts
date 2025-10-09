import { useState, useEffect } from "react";
import axios from "axios";
import { getApiUrl } from "@/lib/constants";

interface Player {
  id: string;
  name: string;
  team: string;
  role: string;
  tokenPrice: string;
}

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

interface TournamentPlayerData {
  id: string;
  moduleName: string;
  name: string;
  team: string;
  role: string;
  fantasyPoints: string;
}

export function useTournamentPlayers(
  tournamentId?: string,
  tournamentStatus?: "UPCOMING" | "LIVE" | "COMPLETED"
) {
  const [players, setPlayers] = useState<TournamentPlayerData[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!tournamentId || !tournamentStatus) {
      setPlayers([]);
      setLoading(false);
      return;
    }

    // Don't show players for completed tournaments
    if (tournamentStatus === "COMPLETED") {
      setPlayers([]);
      setLoading(false);
      return;
    }

    const fetchPlayers = async () => {
      setLoading(true);
      try {
        if (tournamentStatus === "UPCOMING") {
          // For upcoming tournaments, fetch eligible players with 0 points
          const response = await axios.get(
            `${getApiUrl()}/api/tournaments/${tournamentId}/players`
          );
          const eligiblePlayers = response.data.players || [];

          setPlayers(
            eligiblePlayers.map((player: Player) => ({
              id: player.id,
              moduleName: player.name.replace(/\s+/g, ""),
              name: player.name,
              team: player.team,
              role: player.role,
              fantasyPoints: "0",
            }))
          );
        } else if (tournamentStatus === "LIVE") {
          // For live tournaments, fetch actual player scores
          const response = await axios.get(
            `${getApiUrl()}/api/tournaments/${tournamentId}`
          );
          const playerScores = response.data.tournament.playerScores || [];

          setPlayers(
            playerScores.map((score: PlayerScore) => ({
              id: score.id,
              moduleName: score.moduleName,
              name: score.moduleName.replace(/([A-Z])/g, " $1").trim(),
              team: "", // Team info not available in playerScores
              role: "", // Role info not available in playerScores
              fantasyPoints: score.fantasyPoints,
            }))
          );
        }
      } catch (error) {
        console.error("Error fetching tournament players:", error);
        setPlayers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPlayers();

    // For LIVE tournaments, refresh every 1 minute
    let interval: NodeJS.Timeout | null = null;
    if (tournamentStatus === "LIVE") {
      interval = setInterval(fetchPlayers, 60000); // 60 seconds
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [tournamentId, tournamentStatus]);

  return { players, loading };
}

