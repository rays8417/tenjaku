"use client";

import { useState } from "react";
import SearchBar from "@/components/ui/SearchBar";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import ErrorDisplay from "@/components/ui/ErrorDisplay";
import LeaderboardHeader from "@/components/leaderboard/LeaderboardHeader";
import LeaderboardTable from "@/components/leaderboard/LeaderboardTable";
import { useLeaderboardData } from "@/hooks/useLeaderboardData";

export default function LeaderboardPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const { leaderboardData, totalAddresses, loading, error } = useLeaderboardData();

  const filteredData = leaderboardData.filter(entry =>
    entry.walletAddress.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <LeaderboardHeader totalAddresses={totalAddresses} />
          
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search wallet addresses..."
            className="flex-1"
          />
        </div>

        {loading ? (
          <LoadingSpinner size="lg" text="Loading leaderboard..." />
        ) : error ? (
          <ErrorDisplay 
            message={error} 
            onRetry={() => window.location.reload()} 
          />
        ) : (
          <>
            <LeaderboardTable entries={filteredData} />
            
            {filteredData.length > 0 && (
              <div className="mt-6 text-center text-sm text-foreground-muted">
                Showing {filteredData.length} of {leaderboardData.length} entries
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
