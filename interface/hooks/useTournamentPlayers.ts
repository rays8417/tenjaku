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
  tournamentStatus?: "UPCOMING" | "ONGOING" | "COMPLETED",
  walletAddress?: string
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
        if (tournamentStatus === "UPCOMING" || tournamentStatus === "ONGOING") {
          // For upcoming/ONGOING tournaments, first try to get player scores
          try {
            const tournamentResponse = await axios.get(
              `${getApiUrl()}/api/tournaments/${tournamentId}`
            );
            console.log('Tournament response:-------------------', tournamentResponse.data);
            const playerScores = tournamentResponse.data.tournament.playerScores || [];

            const matchId = tournamentResponse.data.tournament.matchId;
            if (playerScores.length > 0 && tournamentStatus === "ONGOING") {
              // Use actual scores for ONGOING tournaments if available
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
              return;
            }
          } catch (err) {
            console.log("No player scores yet, fetching eligible players");
          }

          // Fallback: Fetch eligible players from Cricbuzz API with holdings
          const url = walletAddress
            ? `${getApiUrl()}/api/tournaments/${tournamentId}/eligible-players?address=${walletAddress}`
            : `${getApiUrl()}/api/tournaments/${tournamentId}/eligible-players`;
          
          const response = await axios.get(url);
          const eligiblePlayers = response.data.players || [];

          setPlayers(
            eligiblePlayers.map((player: any) => ({
              id: player.id,
              moduleName: player.moduleName,
              name: player.name,
              team: player.teamName || "",
              role: player.role || "",
              fantasyPoints: player.formattedHoldings || "0",
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

    // For ONGOING tournaments, refresh every 1 minute
    let interval: NodeJS.Timeout | null = null;
    if (tournamentStatus === "ONGOING") {
      interval = setInterval(fetchPlayers, 60000); // 60 seconds
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [tournamentId, tournamentStatus, walletAddress]);

  return { players, loading };
}

