import axios from 'axios';

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY ;
const RAPIDAPI_HOST = 'cricbuzz-cricket.p.rapidapi.com';

export interface CricketPlayerScore {
  moduleName: string;
  runs: number;
  ballsFaced: number;
  wickets: number;
  oversBowled: number;
  runsConceded: number;
  catches: number;
  stumpings: number;
  runOuts: number;
  fantasyPoints?: number;
}

/**
 * Fetch scorecard from Cricbuzz API
 */
export async function fetchMatchScorecard(matchId: number): Promise<any> {
  try {
    console.log(`📡 Fetching scorecard for match ID: ${matchId}`);
    
    const options = {
      method: 'GET',
      url: `https://cricbuzz-cricket.p.rapidapi.com/mcenter/v1/${matchId}/scard`,
      headers: {
        'x-rapidapi-key': RAPIDAPI_KEY,
        'x-rapidapi-host': RAPIDAPI_HOST
      }
    };

    const response = await axios.request(options);
    console.log(`✅ Scorecard fetched successfully`);
    
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching scorecard:', error);
    throw new Error(`Failed to fetch scorecard for match ${matchId}: ${error}`);
  }
}

/**
 * Map player name to module name
 * This maps actual cricket player names to your smart contract module names
 */
function mapPlayerNameToModuleName(playerName: string): string | null {
  // Remove special characters and spaces for matching
  const cleanName = playerName.toLowerCase().replace(/[^a-z]/g, '');
  
  // Player name mapping - add more players as needed
  const nameMap: { [key: string]: string } = {
    'viratkholi': 'ViratKohli',
    'viratkohli': 'ViratKohli',
    'vkohli': 'ViratKohli',
    'rohitsharma': 'RohitSharma',
    'rsharma': 'RohitSharma',
    'hardikpandya': 'HardikPandya',
    'hpandya': 'HardikPandya',
    'jaspritbumrah': 'JaspreetBumhrah',
    'jbumrah': 'JaspreetBumhrah',
    'shubhmangill': 'ShubhmanGill',
    'shubmangill': 'ShubhmanGill',
    'sgill': 'ShubhmanGill',
    'kanewilliamson': 'KaneWilliamson',
    'kwilliamson': 'KaneWilliamson',
    'benstokes': 'BenStokes',
    'bstokes': 'BenStokes',
    'glenmaxwell': 'GlenMaxwell',
    'gmaxwell': 'GlenMaxwell',
    'glennmaxwell': 'GlenMaxwell',
    'abhisheksharma': 'AbhishekSharma',
    'asharma': 'AbhishekSharma',
    'shubhamdube': 'ShubhamDube',
    'shivamdube': 'ShubhamDube',
    'sdube': 'ShubhamDube',
    'travishead': 'TravisHead',
    'thead': 'TravisHead',
    'msdhoni': 'MSDhoni',
    'mahendrasinghdhoni': 'MSDhoni',
    'mdhoni': 'MSDhoni',
    'suryakumaryadav': 'SuryakumarYadav',
    'skyadav': 'SuryakumarYadav',
    'surya': 'SuryakumarYadav'
  };
  
  return nameMap[cleanName] || null;
}

/**
 * Parse batting performance from scorecard
 */
function parseBattingPerformance(scorecardData: any): Map<string, { runs: number; ballsFaced: number }> {
  const battingStats = new Map<string, { runs: number; ballsFaced: number }>();
  
  try {
    if (!scorecardData || !Array.isArray(scorecardData)) {
      return battingStats;
    }

    for (const innings of scorecardData) {
      if (!innings.batsman || !Array.isArray(innings.batsman)) continue;
      
      // Process each batsman
      for (const batsman of innings.batsman) {
        if (!batsman.name) continue;
        
        const moduleName = mapPlayerNameToModuleName(batsman.name);
        if (!moduleName) continue;
        
        const runs = parseInt(batsman.runs) || 0;
        const balls = parseInt(batsman.balls) || 0;
        
        // If player batted in multiple innings, add them up
        if (battingStats.has(moduleName)) {
          const existing = battingStats.get(moduleName)!;
          battingStats.set(moduleName, {
            runs: existing.runs + runs,
            ballsFaced: existing.ballsFaced + balls
          });
        } else {
          battingStats.set(moduleName, { runs, ballsFaced: balls });
        }
      }
    }
  } catch (error) {
    console.error('Error parsing batting performance:', error);
  }
  
  return battingStats;
}

/**
 * Parse bowling performance from scorecard
 */
function parseBowlingPerformance(scorecardData: any): Map<string, { wickets: number; oversBowled: number; runsConceded: number }> {
  const bowlingStats = new Map<string, { wickets: number; oversBowled: number; runsConceded: number }>();
  
  try {
    if (!scorecardData || !Array.isArray(scorecardData)) {
      return bowlingStats;
    }

    for (const innings of scorecardData) {
      if (!innings.bowler || !Array.isArray(innings.bowler)) continue;
      
      // Process each bowler
      for (const bowler of innings.bowler) {
        if (!bowler.name) continue;
        
        const moduleName = mapPlayerNameToModuleName(bowler.name);
        if (!moduleName) continue;
        
        const wickets = parseInt(bowler.wickets) || 0;
        const overs = parseFloat(bowler.overs) || 0;
        const runs = parseInt(bowler.runs) || 0;
        
        // If player bowled in multiple innings, add them up
        if (bowlingStats.has(moduleName)) {
          const existing = bowlingStats.get(moduleName)!;
          bowlingStats.set(moduleName, {
            wickets: existing.wickets + wickets,
            oversBowled: existing.oversBowled + overs,
            runsConceded: existing.runsConceded + runs
          });
        } else {
          bowlingStats.set(moduleName, { wickets, oversBowled: overs, runsConceded: runs });
        }
      }
    }
  } catch (error) {
    console.error('Error parsing bowling performance:', error);
  }
  
  return bowlingStats;
}

/**
 * Parse fielding performance from scorecard
 * Note: Cricbuzz API doesn't always provide detailed fielding stats
 * This is a best-effort extraction from wicket details
 */
function parseFieldingPerformance(scorecardData: any): Map<string, { catches: number; stumpings: number; runOuts: number }> {
  const fieldingStats = new Map<string, { catches: number; stumpings: number; runOuts: number }>();
  
  try {
    if (!scorecardData || !Array.isArray(scorecardData)) {
      return fieldingStats;
    }

    for (const innings of scorecardData) {
      if (!innings.batsman || !Array.isArray(innings.batsman)) continue;
      
      // Check wicket information for fielding credits
      for (const batsman of innings.batsman) {
        // Parse dismissal info (e.g., "c Smith b Johnson", "run out (Smith)")
        const outDesc = batsman.outdec || '';
        
        // Extract fielder names from dismissal
        // Format: "c Tilak Varma b Varun Chakaravarthy"
        const catchMatch = outDesc.match(/c\s+([A-Za-z\s]+?)\s+b\s+/i);
        if (catchMatch) {
          const fielderName = catchMatch[1].trim();
          const moduleName = mapPlayerNameToModuleName(fielderName);
          if (moduleName) {
            const existing = fieldingStats.get(moduleName) || { catches: 0, stumpings: 0, runOuts: 0 };
            fieldingStats.set(moduleName, { ...existing, catches: existing.catches + 1 });
          }
        }
        
        // Check for stumpings
        // Format: "st Samson b Kuldeep Yadav"
        const stumpingMatch = outDesc.match(/st\s+([A-Za-z\s]+?)\s+b\s+/i);
        if (stumpingMatch) {
          const fielderName = stumpingMatch[1].trim();
          const moduleName = mapPlayerNameToModuleName(fielderName);
          if (moduleName) {
            const existing = fieldingStats.get(moduleName) || { catches: 0, stumpings: 0, runOuts: 0 };
            fieldingStats.set(moduleName, { ...existing, stumpings: existing.stumpings + 1 });
          }
        }
        
        // Check for run outs
        // Format: "run out (Rinku Singh)" or "run out (Rinku Singh/Bumrah)"
        const runoutMatch = outDesc.match(/run\s+out\s+\(([^)]+)\)/i);
        if (runoutMatch) {
          const fielders = runoutMatch[1].split('/');
          for (const fielder of fielders) {
            const fielderName = fielder.trim();
            const moduleName = mapPlayerNameToModuleName(fielderName);
            if (moduleName) {
              const existing = fieldingStats.get(moduleName) || { catches: 0, stumpings: 0, runOuts: 0 };
              fieldingStats.set(moduleName, { ...existing, runOuts: existing.runOuts + 1 });
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Error parsing fielding performance:', error);
  }
  
  return fieldingStats;
}

/**
 * Parse complete scorecard and convert to player scores format
 */
export async function parseScorecard(matchId: number): Promise<CricketPlayerScore[]> {
  try {
    console.log(`\n🏏 PARSING CRICKET SCORECARD`);
    console.log('============================');
    console.log(`Match ID: ${matchId}\n`);
    
    // Fetch scorecard from API
    const data = await fetchMatchScorecard(matchId);
    
    if (!data || !data.scorecard) {
      throw new Error('Invalid scorecard data received from API');
    }
    
    // Parse different aspects of performance
    const battingStats = parseBattingPerformance(data.scorecard);
    const bowlingStats = parseBowlingPerformance(data.scorecard);
    const fieldingStats = parseFieldingPerformance(data.scorecard);
    
    // Combine all stats
    const allPlayers = new Set<string>();
    battingStats.forEach((_, player) => allPlayers.add(player));
    bowlingStats.forEach((_, player) => allPlayers.add(player));
    fieldingStats.forEach((_, player) => allPlayers.add(player));
    
    // Create player score objects
    const playerScores: CricketPlayerScore[] = [];
    
    for (const moduleName of allPlayers) {
      const batting = battingStats.get(moduleName) || { runs: 0, ballsFaced: 0 };
      const bowling = bowlingStats.get(moduleName) || { wickets: 0, oversBowled: 0, runsConceded: 0 };
      const fielding = fieldingStats.get(moduleName) || { catches: 0, stumpings: 0, runOuts: 0 };
      
      playerScores.push({
        moduleName,
        runs: batting.runs,
        ballsFaced: batting.ballsFaced,
        wickets: bowling.wickets,
        oversBowled: bowling.oversBowled,
        runsConceded: bowling.runsConceded,
        catches: fielding.catches,
        stumpings: fielding.stumpings,
        runOuts: fielding.runOuts
      });
    }
    
    // Log parsed results
    console.log(`✅ Successfully parsed ${playerScores.length} player performances`);
    console.log('\n📊 PARSED PLAYER SCORES:');
    console.log('========================');
    
    playerScores.forEach((player, index) => {
      console.log(`\n${index + 1}. ${player.moduleName}`);
      console.log(`   Batting: ${player.runs} runs (${player.ballsFaced} balls)`);
      console.log(`   Bowling: ${player.wickets} wickets (${player.oversBowled} overs, ${player.runsConceded} runs)`);
      console.log(`   Fielding: ${player.catches} catches, ${player.stumpings} stumpings, ${player.runOuts} run outs`);
    });
    
    return playerScores;
    
  } catch (error) {
    console.error('❌ Error parsing scorecard:', error);
    throw error;
  }
}

/**
 * Fetch and format player scores for a tournament
 */
export async function fetchPlayerScoresForTournament(matchId: number): Promise<{
  tournamentId?: string;
  playerScores: CricketPlayerScore[];
}> {
  try {
    const playerScores = await parseScorecard(matchId);
    
    return {
      playerScores
    };
  } catch (error) {
    console.error('Error fetching player scores for tournament:', error);
    throw error;
  }
}

/**
 * Fetch match info from Cricbuzz API
 */
export async function fetchMatchInfo(matchId: number): Promise<any> {
  try {
    console.log(`📡 Fetching match info for match ID: ${matchId}`);
    
    const options = {
      method: 'GET',
      url: `https://cricbuzz-cricket.p.rapidapi.com/mcenter/v1/${matchId}`,
      headers: {
        'x-rapidapi-key': RAPIDAPI_KEY,
        'x-rapidapi-host': RAPIDAPI_HOST
      }
    };

    const response = await axios.request(options);
    console.log(`✅ Match info fetched successfully`);
    
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching match info:', error);
    throw new Error(`Failed to fetch match info for match ${matchId}: ${error}`);
  }
}

/**
 * Fetch team players from Cricbuzz API
 */
export async function fetchTeamPlayers(matchId: number, teamId: number): Promise<any> {
  try {
    console.log(`📡 Fetching team players for match ID: ${matchId}, team ID: ${teamId}`);
    
    const options = {
      method: 'GET',
      url: `https://cricbuzz-cricket.p.rapidapi.com/mcenter/v1/${matchId}/team/${teamId}`,
      headers: {
        'x-rapidapi-key': RAPIDAPI_KEY,
        'x-rapidapi-host': RAPIDAPI_HOST
      }
    };

    const response = await axios.request(options);
    console.log(`✅ Team players fetched successfully`);
    console.log('Team players:-------------------', response.data);
    
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching team players:', error);
    throw new Error(`Failed to fetch team players for match ${matchId}, team ${teamId}: ${error}`);
  }
}

/**
 * List of available player modules in our smart contract
 */
const AVAILABLE_PLAYER_MODULES = [
  'ViratKohli',
  'HardikPandya',
  'JaspreetBumhrah',
  'ShubhmanGill',
  'KaneWilliamson',
  'BenStokes',
  'GlenMaxwell',
  'AbhishekSharma',
  'ShubhamDube',
  'TravisHead',
  'SuryakumarYadav'
];

/**
 * Get eligible players for a match (players we have modules for)
 */
export async function getEligiblePlayers(matchId: number): Promise<any[]> {
  try {
    console.log(`📡 Fetching eligible players for match ID: ${matchId}`);
    
    // Step 1: Fetch match info to get team IDs
    const matchInfo = await fetchMatchInfo(matchId);

    
    if (!matchInfo ) {
      throw new Error('Invalid match info response');
    }
    
   
    const team1Id = matchInfo.team1?.teamid;
    const team2Id = matchInfo.team2?.teamid;
    const team1Name = matchInfo.team1?.teamname || matchInfo.team1?.teamsname;
    const team2Name = matchInfo.team2?.teamname || matchInfo.team2?.teamsname;
    
    if (!team1Id || !team2Id) {
      throw new Error('Could not find team IDs in match info');
    }
    
    console.log(`📋 Team 1: ${team1Name} (ID: ${team1Id}), Team 2: ${team2Name} (ID: ${team2Id})`);
    
    // Step 2: Fetch both teams' players
    const [team1Data, team2Data] = await Promise.all([
      fetchTeamPlayers(matchId, team1Id),
      fetchTeamPlayers(matchId, team2Id)
    ]);
    
    // Step 3: Extract all players from both teams
    const allPlayers: any[] = [];
    
    // Helper function to extract players from team data
    const extractPlayers = (teamData: any, teamId: number, teamName: string) => {
      if (!teamData || !teamData.player || !Array.isArray(teamData.player)) {
        return;
      }
      
      // Iterate through the player categories (playing XI, bench, support staff, etc.)
      teamData.player.forEach((category: any) => {
        // Only process playing XI and bench categories (skip support staff)
        if (category.category === 'playing XI' || category.category === 'bench') {
          if (Array.isArray(category.player)) {
            category.player.forEach((player: any) => {
              allPlayers.push({
                id: player.id,
                name: player.name,
                fullName: player.name, // API doesn't have fullName, using name
                role: player.role || 'Unknown',
                teamId: teamId,
                teamName: teamName,
                category: category.category
              });
            });
          }
        }
      });
    };
    
    // Process team 1 players
    extractPlayers(team1Data, team1Id, team1Name);
    
    // Process team 2 players
    extractPlayers(team2Data, team2Id, team2Name);
    
    console.log(`👥 Total players found: ${allPlayers.length}`);
    
    // Step 4: Filter to only eligible players (those we have modules for)
    const eligiblePlayers = allPlayers.filter(player => {
      const moduleName = mapPlayerNameToModuleName(player.name);
      return moduleName && AVAILABLE_PLAYER_MODULES.includes(moduleName);
    });
    
    // Step 5: Enrich eligible players with module name
    const enrichedPlayers = eligiblePlayers.map(player => ({
      ...player,
      moduleName: mapPlayerNameToModuleName(player.name)
    }));
    
    console.log(`✅ Eligible players found: ${enrichedPlayers.length}`);
    
    return enrichedPlayers;
  } catch (error) {
    console.error('❌ Error fetching eligible players:', error);
    throw error;
  }
}

