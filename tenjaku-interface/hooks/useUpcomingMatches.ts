import { useState, useEffect } from "react";
import { getRapidApiKey, CRICBUZZ_API_HOST } from "@/lib/constants";

export function useUpcomingMatches() {
  const [upcomingMatches, setUpcomingMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUpcomingMatches = async () => {
      setLoading(true);
      try {
        const options = {
          method: "GET",
          headers: {
            "x-rapidapi-key": getRapidApiKey(),
            "x-rapidapi-host": CRICBUZZ_API_HOST,
          },
        };

        const response = await fetch(
          "https://cricbuzz-cricket.p.rapidapi.com/matches/v1/upcoming",
          options
        );
        const data = await response.json();

        const matches: any[] = [];
        if (data.typeMatches) {
          data.typeMatches.forEach((typeMatch: any) => {
            if (typeMatch.seriesMatches) {
              typeMatch.seriesMatches.forEach((seriesMatch: any) => {
                if (seriesMatch.seriesAdWrapper) {
                  const seriesName = seriesMatch.seriesAdWrapper.seriesName || "";
                  if (seriesMatch.seriesAdWrapper.matches) {
                    seriesMatch.seriesAdWrapper.matches.forEach(
                      (matchWrapper: any) => {
                        if (matchWrapper.matchInfo) {
                          matches.push({
                            ...matchWrapper.matchInfo,
                            seriesName,
                          });
                        }
                      }
                    );
                  }
                }
              });
            }
          });
        }

        const indiaMatches = matches.filter((match) => {
          const team1 = match.team1?.teamName?.toLowerCase() || "";
          const team2 = match.team2?.teamName?.toLowerCase() || "";
          const team1Code = match.team1?.teamSName?.toLowerCase() || "";
          const team2Code = match.team2?.teamSName?.toLowerCase() || "";
          
          return (
            team1.includes("india") ||
            team2.includes("india") ||
            team1Code === "ind" ||
            team2Code === "ind"
          );
        });

        setUpcomingMatches(indiaMatches.slice(0, 2));
      } catch (error) {
        console.error("Error fetching upcoming matches:", error);
        setUpcomingMatches([]);
      } finally {
        setLoading(false);
      }
    };

    fetchUpcomingMatches();
  }, []);

  return { upcomingMatches, loading };
}

