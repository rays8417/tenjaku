#!/usr/bin/env ts-node

import { PrismaClient } from '@prisma/client';
import { Command } from 'commander';

const prisma = new PrismaClient();

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
 * Calculate fantasy points based on cricket statistics
 */
function calculateFantasyPoints(playerData: any): number {
  let points = 0;
  
  // Batting points
  points += playerData.runs * 1; // 1 point per run
  
  // Bonus points for milestones
  if (playerData.runs >= 50) points += 8; // Half century bonus
  if (playerData.runs >= 100) points += 16; // Century bonus
  
  // Strike rate bonus (if balls faced > 0)
  if (playerData.ballsFaced > 0) {
    const strikeRate = (playerData.runs / playerData.ballsFaced) * 100;
    if (strikeRate >= 150) points += 6; // High strike rate bonus
    else if (strikeRate >= 120) points += 4;
    else if (strikeRate >= 100) points += 2;
  }
  
  // Bowling points
  points += playerData.wickets * 25; // 25 points per wicket
  
  // Bonus points for bowling milestones
  if (playerData.wickets >= 3) points += 8; // 3-wicket haul bonus
  if (playerData.wickets >= 5) points += 16; // 5-wicket haul bonus
  
  // Economy rate bonus (if overs bowled > 0)
  if (playerData.oversBowled > 0) {
    const economyRate = (playerData.runs / playerData.oversBowled);
    if (economyRate <= 4) points += 6; // Excellent economy bonus
    else if (economyRate <= 6) points += 4;
    else if (economyRate <= 8) points += 2;
  }
  
  // Fielding points
  points += playerData.catches * 8; // 8 points per catch
  points += playerData.stumpings * 12; // 12 points per stumping
  points += playerData.runOuts * 10; // 10 points per run out
  
  return Math.round(points * 100) / 100; // Round to 2 decimal places
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
