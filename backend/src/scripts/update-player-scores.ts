#!/usr/bin/env ts-node

import { Command } from 'commander';
import { prisma } from '../prisma';
import { parseScorecard } from '../services/cricketApiService';
import { calculateTotalFantasyPoints } from '../utils/fantasyPointsCalculator';

/**
 * Update Player Scores Script
 * 
 * This script updates player scores for a specific tournament
 * without running the complete workflow.
 */

// Sample player scores data for testing
const sampleScoresData = {
  playerScores: [
    {
      moduleName: 'ViratKohli',
      runs: 85,
      ballsFaced: 65,
      wickets: 0,
      oversBowled: 0,
      catches: 1,
      stumpings: 0,
      runOuts: 0,
      fantasyPoints: 0 // Will be calculated
    },
    {
      moduleName: 'BenStokes',
      runs: 45,
      ballsFaced: 38,
      wickets: 2,
      oversBowled: 4,
      catches: 0,
      stumpings: 0,
      runOuts: 1,
      fantasyPoints: 0 // Will be calculated
    },
    {
      moduleName: 'KaneWilliamson',
      runs: 72,
      ballsFaced: 58,
      wickets: 0,
      oversBowled: 0,
      catches: 2,
      stumpings: 0,
      runOuts: 0,
      fantasyPoints: 0 // Will be calculated
    },
    {
      moduleName: 'AbhishekSharma',
      runs: 38,
      ballsFaced: 42,
      wickets: 1,
      oversBowled: 3,
      catches: 1,
      stumpings: 0,
      runOuts: 0,
      fantasyPoints: 0 // Will be calculated
    },
    {
      moduleName: 'HardikPandya',
      runs: 56,
      ballsFaced: 45,
      wickets: 1,
      oversBowled: 2,
      catches: 0,
      stumpings: 0,
      runOuts: 1,
      fantasyPoints: 0 // Will be calculated
    },
    {
      moduleName: 'JaspreetBumhrah',
      runs: 12,
      ballsFaced: 8,
      wickets: 3,
      oversBowled: 4,
      catches: 0,
      stumpings: 0,
      runOuts: 0,
      fantasyPoints: 0 // Will be calculated
    },
    {
      moduleName: 'ShubhamDube',
      runs: 29,
      ballsFaced: 35,
      wickets: 0,
      oversBowled: 0,
      catches: 1,
      stumpings: 0,
      runOuts: 0,
      fantasyPoints: 0 // Will be calculated
    },
    {
      moduleName: 'ShubhmanGill',
      runs: 67,
      ballsFaced: 52,
      wickets: 0,
      oversBowled: 0,
      catches: 0,
      stumpings: 0,
      runOuts: 0,
      fantasyPoints: 0 // Will be calculated
    },
    {
      moduleName: 'TravisHead',
      runs: 41,
      ballsFaced: 33,
      wickets: 0,
      oversBowled: 0,
      catches: 1,
      stumpings: 0,
      runOuts: 0,
      fantasyPoints: 0 // Will be calculated
    },
    {
      moduleName: 'GlenMaxwell',
      runs: 33,
      ballsFaced: 28,
      wickets: 1,
      oversBowled: 3,
      catches: 0,
      stumpings: 0,
      runOuts: 0,
      fantasyPoints: 0 // Will be calculated
    }
  ]
};

/**
 * Calculate fantasy points - using shared calculator
 */
function calculateFantasyPoints(playerData: any): number {
  return calculateTotalFantasyPoints(playerData);
}

/**
 * Update player scores for a tournament
 */
async function updatePlayerScores(tournamentId: string, customScores?: any) {
  try {
    console.log(`\n📊 UPDATING PLAYER SCORES`);
    console.log('========================');
    console.log(`Tournament ID: ${tournamentId}\n`);

    // Verify tournament exists
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId }
    });

    if (!tournament) {
      throw new Error(`Tournament with ID ${tournamentId} not found`);
    }

    console.log(`✅ Tournament found: ${tournament.name}`);
    console.log(`   Teams: ${tournament.team1} vs ${tournament.team2}`);
    console.log(`   Status: ${tournament.status}\n`);

    // Use custom scores if provided, otherwise use sample data
    const scoresData = customScores || sampleScoresData.playerScores;

    console.log('🏏 Updating player scores...');
    console.log('----------------------------');

    // Calculate fantasy points for each player
    const updatedScores = scoresData.map((player: any) => ({
      ...player,
      fantasyPoints: calculateFantasyPoints(player)
    }));

    // Sort by fantasy points (descending)
    updatedScores.sort((a: any, b: any) => b.fantasyPoints - a.fantasyPoints);

    // Display scores before updating database
    updatedScores.forEach((player: any, index: any) => {
      console.log(`${index + 1}. ${player.moduleName}`);
      console.log(`   Fantasy Points: ${player.fantasyPoints}`);
      console.log(`   Runs: ${player.runs} (${player.ballsFaced} balls)`);
      console.log(`   Wickets: ${player.wickets} (${player.oversBowled} overs)`);
      console.log(`   Fielding: ${player.catches} catches, ${player.stumpings} stumpings, ${player.runOuts} run outs`);
      console.log('');
    });

    // Update or create player scores in database
    console.log('💾 Saving scores to database...');
    
    for (const playerScore of updatedScores) {
      await prisma.playerScore.upsert({
        where: {
          tournamentId_moduleName: {
            tournamentId: tournamentId,
            moduleName: playerScore.moduleName
          }
        },
        update: {
          runs: playerScore.runs,
          ballsFaced: playerScore.ballsFaced,
          wickets: playerScore.wickets,
          oversBowled: playerScore.oversBowled,
          runsConceded: playerScore.runsConceded || 0,
          catches: playerScore.catches,
          stumpings: playerScore.stumpings,
          runOuts: playerScore.runOuts,
          fantasyPoints: playerScore.fantasyPoints
        },
        create: {
          tournamentId: tournamentId,
          moduleName: playerScore.moduleName,
          runs: playerScore.runs,
          ballsFaced: playerScore.ballsFaced,
          wickets: playerScore.wickets,
          oversBowled: playerScore.oversBowled,
          runsConceded: playerScore.runsConceded || 0,
          catches: playerScore.catches,
          stumpings: playerScore.stumpings,
          runOuts: playerScore.runOuts,
          fantasyPoints: playerScore.fantasyPoints
        }
      });
    }

    console.log('✅ Player scores updated successfully!');
    console.log(`   Total players: ${updatedScores.length}`);
    console.log(`   Highest score: ${updatedScores[0].fantasyPoints} points (${updatedScores[0].moduleName})`);
    console.log(`   Lowest score: ${updatedScores[updatedScores.length - 1].fantasyPoints} points (${updatedScores[updatedScores.length - 1].moduleName})`);

    return updatedScores;

  } catch (error) {
    console.error('❌ Error updating player scores:', error);
    throw error;
  }
}

/**
 * Get current player scores for a tournament
 */
async function getPlayerScores(tournamentId: string) {
  try {
    console.log(`\n📊 CURRENT PLAYER SCORES`);
    console.log('========================');
    console.log(`Tournament ID: ${tournamentId}\n`);

    // Verify tournament exists
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId }
    });

    if (!tournament) {
      throw new Error(`Tournament with ID ${tournamentId} not found`);
    }

    console.log(`✅ Tournament: ${tournament.name}`);
    console.log(`   Teams: ${tournament.team1} vs ${tournament.team2}\n`);

    // Get player scores
    const playerScores = await prisma.playerScore.findMany({
      where: { tournamentId },
      orderBy: { fantasyPoints: 'desc' }
    });

    if (playerScores.length === 0) {
      console.log('❌ No player scores found for this tournament.');
      console.log('💡 Use the update command to add player scores.');
      return [];
    }

    console.log('🏆 Current Player Scores:');
    console.log('-------------------------');
    
    playerScores.forEach((player, index) => {
      console.log(`${index + 1}. ${player.moduleName}`);
      console.log(`   Fantasy Points: ${Number(player.fantasyPoints).toFixed(2)}`);
      console.log(`   Runs: ${player.runs} (${player.ballsFaced} balls)`);
      console.log(`   Wickets: ${player.wickets} (${player.oversBowled} overs)`);
      console.log(`   Fielding: ${player.catches} catches, ${player.stumpings} stumpings, ${player.runOuts} run outs`);
      console.log('');
    });

    return playerScores;

  } catch (error) {
    console.error('❌ Error getting player scores:', error);
    throw error;
  }
}

async function main() {
  const program = new Command();

  program
    .name('update-player-scores')
    .description('Update player scores for a specific tournament')
    .version('1.0.0');

  program
    .command('update')
    .description('Update player scores for a tournament')
    .argument('<tournament-id>', 'Tournament ID to update scores for')
    .option('-c, --custom', 'Use custom scores instead of sample data')
    .action(async (tournamentId: string, options) => {
      try {
        await updatePlayerScores(tournamentId);
      } catch (error) {
        console.error('Failed to update player scores:', error);
        process.exit(1);
      } finally {
        await prisma.$disconnect();
      }
    });

  program
    .command('fetch-from-api')
    .description('Fetch and update player scores from Cricket API')
    .argument('<tournament-id>', 'Tournament ID to update scores for')
    .argument('<match-id>', 'Cricket match ID from Cricbuzz')
    .action(async (tournamentId: string, matchId: string) => {
      try {
        const matchIdNum = parseInt(matchId);
        if (isNaN(matchIdNum)) {
          throw new Error('Invalid match ID. Must be a number.');
        }
        
        console.log(`\n🏏 FETCHING SCORES FROM CRICKET API`);
        console.log('===================================');
        console.log(`Tournament ID: ${tournamentId}`);
        console.log(`Match ID: ${matchIdNum}\n`);
        
        // Fetch scores from API
        const playerScores = await parseScorecard(matchIdNum);
        
        if (playerScores.length === 0) {
          console.log('⚠️  No player scores found from API');
          return;
        }
        
        // Update tournament with these scores
        console.log(`\n💾 Updating database with ${playerScores.length} player scores...`);
        
        // Calculate fantasy points for each player
        const scoresWithPoints = playerScores.map(player => ({
          ...player,
          fantasyPoints: calculateFantasyPoints(player)
        }));
        
        // Update database
        for (const playerScore of scoresWithPoints) {
          await prisma.playerScore.upsert({
            where: {
              tournamentId_moduleName: {
                tournamentId: tournamentId,
                moduleName: playerScore.moduleName
              }
            },
            update: {
              runs: playerScore.runs,
              ballsFaced: playerScore.ballsFaced,
              wickets: playerScore.wickets,
              oversBowled: playerScore.oversBowled,
              runsConceded: playerScore.runsConceded,
              catches: playerScore.catches,
              stumpings: playerScore.stumpings,
              runOuts: playerScore.runOuts,
              fantasyPoints: playerScore.fantasyPoints
            },
            create: {
              tournamentId: tournamentId,
              moduleName: playerScore.moduleName,
              runs: playerScore.runs,
              ballsFaced: playerScore.ballsFaced,
              wickets: playerScore.wickets,
              oversBowled: playerScore.oversBowled,
              runsConceded: playerScore.runsConceded,
              catches: playerScore.catches,
              stumpings: playerScore.stumpings,
              runOuts: playerScore.runOuts,
              fantasyPoints: playerScore.fantasyPoints
            }
          });
        }
        
        console.log(`✅ Successfully updated ${scoresWithPoints.length} player scores!`);
        console.log(`\n📊 FANTASY POINTS SUMMARY:`);
        console.log('==========================');
        
        // Sort by fantasy points
        scoresWithPoints.sort((a, b) => b.fantasyPoints! - a.fantasyPoints!);
        
        scoresWithPoints.forEach((player, index) => {
          console.log(`${index + 1}. ${player.moduleName}: ${player.fantasyPoints?.toFixed(2)} points`);
        });
        
      } catch (error) {
        console.error('Failed to fetch and update scores from API:', error);
        process.exit(1);
      } finally {
        await prisma.$disconnect();
      }
    });

  program
    .command('get')
    .description('Get current player scores for a tournament')
    .argument('<tournament-id>', 'Tournament ID to get scores for')
    .action(async (tournamentId: string) => {
      try {
        await getPlayerScores(tournamentId);
      } catch (error) {
        console.error('Failed to get player scores:', error);
        process.exit(1);
      } finally {
        await prisma.$disconnect();
      }
    });

  // If no command is provided, show help
  if (process.argv.length <= 2) {
    program.help();
  }

  await program.parseAsync(process.argv);
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Run the main function
if (require.main === module) {
  main().catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
}

export { 
  updatePlayerScores,
  getPlayerScores,
  calculateFantasyPoints
};
