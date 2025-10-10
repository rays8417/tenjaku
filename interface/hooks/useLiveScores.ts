import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { getApiUrl } from "@/lib/constants";

export interface LivePlayerScore {
  moduleName: string;
  runs: number;
  ballsFaced: number;
  wickets: number;
  oversBowled: number;
  runsConceded: number;
  catches: number;
  stumpings: number;
  runOuts: number;
  fantasyPoints: number;
  breakdown: {
    batting: number;
    bowling: number;
    fielding: number;
  };
}

export interface LiveScoresData {
  success: boolean;
  tournament: {
    id: string;
    name: string;
    team1: string;
    team2: string;
    status: string;
  };
  matchId: number;
  lastUpdated: string;
  pollingActive: boolean;
  note: string;
  totalEligiblePlayers: number;
  players: LivePlayerScore[];
}

interface UseLiveScoresOptions {

  refreshInterval?: number;
  
  autoStartPolling?: boolean;
  
  pollingIntervalMinutes?: number;
}

export function useLiveScores(
  tournamentId: string | undefined,
  options: UseLiveScoresOptions = {}
) {
  const {
    refreshInterval = 30000, // Check every 30 seconds
    autoStartPolling = false,
    pollingIntervalMinutes = 5,
  } = options;

  const [data, setData] = useState<LiveScoresData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPollingActive, setIsPollingActive] = useState(false);

  
  const fetchLiveScores = useCallback(async () => {
    if (!tournamentId) return;

    try {
      setLoading(true);
      setError(null);

      const response = await axios.get<LiveScoresData>(
        `${getApiUrl()}/api/live-scores/${tournamentId}`
      );

      setData(response.data);
      setIsPollingActive(response.data.pollingActive);
      
      console.log(`✅ Live scores updated: ${response.data.totalEligiblePlayers} players`);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || "Failed to fetch live scores";
      setError(errorMessage);
      console.error("Live scores fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [tournamentId]);

  
  const startPolling = useCallback(async () => {
    if (!tournamentId) return;

    try {
      setLoading(true);
      setError(null);

      await axios.post(
        `${getApiUrl()}/api/live-scores/${tournamentId}/start-polling`,
        { intervalMinutes: pollingIntervalMinutes }
      );

      console.log(`🔄 Started backend polling (every ${pollingIntervalMinutes} minutes)`);
      setIsPollingActive(true);
      
      // Fetch initial scores
      await fetchLiveScores();
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || "Failed to start polling";
      setError(errorMessage);
      console.error("Start polling error:", err);
    } finally {
      setLoading(false);
    }
  }, [tournamentId, pollingIntervalMinutes, fetchLiveScores]);

  
  const stopPolling = useCallback(async () => {
    if (!tournamentId) return;

    try {
      await axios.post(
        `${getApiUrl()}/api/live-scores/${tournamentId}/stop-polling`
      );

      console.log("⏹️  Stopped backend polling");
      setIsPollingActive(false);
    } catch (err: any) {
      console.error("Stop polling error:", err);
    }
  }, [tournamentId]);

 
  const startLiveUpdates = useCallback(async () => {
    // First fetch current scores
    const response = await axios.get<LiveScoresData>(
      `${getApiUrl()}/api/live-scores/${tournamentId}?startPolling=true&intervalMinutes=${pollingIntervalMinutes}`
    );
    
    setData(response.data);
    setIsPollingActive(response.data.pollingActive);
    console.log("🚀 Live updates started");
  }, [tournamentId, pollingIntervalMinutes]);


  const refresh = useCallback(() => {
    fetchLiveScores();
  }, [fetchLiveScores]);

  useEffect(() => {
    if (!tournamentId) {
      setData(null);
      setLoading(false);
      return;
    }

    if (autoStartPolling) {
      startLiveUpdates();
    } else {
      fetchLiveScores();
    }

    const interval = setInterval(() => {
      fetchLiveScores();
    }, refreshInterval);

    // Cleanup
    return () => {
      clearInterval(interval);
    };
  }, [tournamentId, autoStartPolling, refreshInterval, fetchLiveScores, startLiveUpdates]);

  return {
    
    data,
    players: data?.players || [],
    lastUpdated: data?.lastUpdated ? new Date(data.lastUpdated) : null,
    tournament: data?.tournament,
    totalPlayers: data?.totalEligiblePlayers || 0,
    
    loading,
    error,
    isPollingActive,
    
    startPolling,
    stopPolling,
    startLiveUpdates,
    refresh,
  };
}

