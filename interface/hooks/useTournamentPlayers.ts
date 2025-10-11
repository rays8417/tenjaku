import { useState, useEffect } from "react";
import axios from "axios";
import { getApiUrl } from "@/lib/constants";
import { useLiveScores } from "./useLiveScores";

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
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  const liveScores = useLiveScores(
    tournamentStatus === "ONGOING" ? tournamentId : undefined,
    {
      refreshInterval: 30000, // Check every 30 seconds
      autoStartPolling: true, // Automatically start backend polling
      pollingIntervalMinutes: 5, // Backend polls every 5 minutes
    }
  );

  // Initial load for ONGOING tournaments (structure only, runs once)
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

    // For ONGOING tournaments, set up player structure once
    if (tournamentStatus === "ONGOING") {
      if (liveScores.players && liveScores.players.length > 0 && !initialLoadDone) {
        // Initial load: Create player structure
        setPlayers(
          liveScores.players.map((player) => ({
            id: player.moduleName,
            moduleName: player.moduleName,
            name: player.moduleName.replace(/([A-Z])/g, " $1").trim(),
            team: "", // Team info not available in live scores
            role: "", // Role info not available in live scores
            fantasyPoints: player.fantasyPoints.toString(),
          }))
        );
        setInitialLoadDone(true);
      }
      setLoading(liveScores.loading && !initialLoadDone);
      return;
    }

    // For UPCOMING tournaments, fetch eligible players
    const fetchPlayers = async () => {
      setLoading(true);
      try {
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
      } catch (error) {
        console.error("Error fetching tournament players:", error);
        setPlayers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPlayers();
  }, [tournamentId, tournamentStatus, walletAddress, liveScores.players.length, initialLoadDone, liveScores.loading]);

  // Update only fantasy points when live scores change (smooth updates)
  useEffect(() => {
    if (tournamentStatus !== "ONGOING" || !initialLoadDone) return;
    if (!liveScores.players || liveScores.players.length === 0) return;

    // Only update fantasy points, don't recreate entire player objects
    setPlayers((currentPlayers) =>
      currentPlayers.map((player) => {
        const livePlayer = liveScores.players.find(
          (lp) => lp.moduleName === player.moduleName
        );
        if (livePlayer) {
          return {
            ...player,
            fantasyPoints: livePlayer.fantasyPoints.toString(),
          };
        }
        return player;
      })
    );
  }, [liveScores.players, tournamentStatus, initialLoadDone]);

  return { 
    players, 
    loading,
    // Expose live scores info for ONGOING tournaments
    liveInfo: tournamentStatus === "ONGOING" ? {
      lastUpdated: liveScores.lastUpdated,
      isPollingActive: liveScores.isPollingActive,
      error: liveScores.error,
      refresh: liveScores.refresh,
      startPolling: liveScores.startPolling,
      stopPolling: liveScores.stopPolling,
    } : undefined
  };
}

