#!/usr/bin/env ts-node

import { PrismaClient, TournamentStatus, ContractType } from '@prisma/client';
import { Command } from 'commander';
import { 
  createTournament, 
  updateScoresAndCreatePostMatchSnapshot,
  calculateSimpleRewards,
  sampleTournaments,
  calculateFantasyPoints
} from './tournament';
import { createContractSnapshot } from '../services/contractSnapshotService';
import { calculateRewardsFromSnapshots } from '../services/rewardCalculationService';

const prisma = new PrismaClient();

/**
 * Complete Tournament Workflow Script
 * 
 * This script provides a comprehensive workflow for managing cricket tournaments:
 * 1. Create tournament with pre-match snapshot
 * 2. Update player scores
 * 3. Create post-match snapshot
 * 4. Calculate and display rewards
 * 5. Show detailed analysis
 */

interface WorkflowOptions {
  tournamentName?: string;
  totalRewardAmount?: number;
  verbose?: boolean;
}

async function runCompleteWorkflow(options: WorkflowOptions = {}) {
  const { tournamentName, totalRewardAmount = 10, verbose = true } = options;
  
  try {
    console.log('\n🚀 COMPLETE TOURNAMENT WORKFLOW');
    console.log('================================');
    console.log('This comprehensive workflow will:');
    console.log('1. 🏏 Create a new tournament with pre-match snapshot');
    console.log('2. 📊 Update player scores with sample data');
    console.log('3. 📸 Create post-match snapshot');
    console.log('4. 💰 Calculate and display detailed rewards');
    console.log('5. 📈 Show comprehensive analysis\n');

    // Step 1: Create Tournament with Pre-Match Snapshot
    console.log('🏏 STEP 1: CREATING TOURNAMENT WITH PRE-MATCH SNAPSHOT');
    console.log('=====================================================');
    
    const tournamentData = tournamentName 
      ? { ...sampleTournaments[0], name: tournamentName }
      : sampleTournaments[0];
    
    const tournament = await createTournament(tournamentData, true);
    const tournamentId = tournament.id;
    
    console.log(`\n✅ Tournament created successfully!`);
    console.log(`   ID: ${tournamentId}`);
    console.log(`   Name: ${tournament.name}`);
    console.log(`   Teams: ${tournament.team1} vs ${tournament.team2}`);
    console.log(`   Status: ${tournament.status}\n`);

    // Step 2: Update Scores and Create Post-Match Snapshot
    console.log('📊 STEP 2: UPDATING SCORES AND CREATING POST-MATCH SNAPSHOT');
    console.log('=========================================================');
    
    const postMatchSnapshot = await updateScoresAndCreatePostMatchSnapshot(tournamentId);

    // Step 3: Calculate Rewards
    console.log('💰 STEP 3: CALCULATING REWARDS');
    console.log('==============================');
    
    const rewardDistribution = await calculateSimpleRewards(tournamentId, totalRewardAmount);

    // Step 4: Detailed Analysis
    if (verbose) {
      await showDetailedAnalysis(tournamentId, rewardDistribution);
    }

    // Step 5: Summary
    console.log('\n🎉 WORKFLOW COMPLETED SUCCESSFULLY!');
    console.log('==================================');
    console.log(`Tournament ID: ${tournamentId}`);
    console.log(`Tournament Name: ${tournament.name}`);
    console.log(`Total Reward Pool: ${totalRewardAmount} BOSON`);
    console.log(`Eligible Holders: ${rewardDistribution.totalEligibleHolders}`);
    console.log(`Total Distributed: ${rewardDistribution.summary.totalRewardsDistributed.toFixed(6)} BOSON`);
    
    console.log('\n✅ All Steps Completed:');
    console.log('   ✅ Tournament created');
    console.log('   ✅ Pre-match snapshot taken');
    console.log('   ✅ Player scores updated');
    console.log('   ✅ Post-match snapshot taken');
    console.log('   ✅ Rewards calculated');
    console.log('   ✅ Analysis completed\n');

    return {
      tournamentId,
      tournament,
      rewardDistribution,
      postMatchSnapshot
    };

  } catch (error) {
    console.error('\n❌ WORKFLOW FAILED!');
    console.error('==================');
    console.error('Error details:', error);
    throw error;
  }
}

async function showDetailedAnalysis(tournamentId: string, rewardDistribution: any) {
  try {
    console.log('\n📈 STEP 4: DETAILED ANALYSIS');
    console.log('============================');

    // Get tournament details
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId }
    });

    // Get snapshots
    const [preMatchSnapshot, postMatchSnapshot] = await Promise.all([
      prisma.contractSnapshot.findFirst({
        where: {
          data: { path: ['tournamentId'], equals: tournamentId },
          contractType: 'PRE_MATCH' as ContractType
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.contractSnapshot.findFirst({
        where: {
          data: { path: ['tournamentId'], equals: tournamentId },
          contractType: 'POST_MATCH' as ContractType
        },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    // Get player scores
    const playerScores = await prisma.playerScore.findMany({
      where: { tournamentId },
      orderBy: { fantasyPoints: 'desc' }
    });

    console.log('\n🏏 Tournament Information:');
    console.log('-------------------------');
    console.log(`Name: ${tournament?.name}`);
    console.log(`Teams: ${tournament?.team1} vs ${tournament?.team2}`);
    console.log(`Match Date: ${tournament?.matchDate?.toISOString()}`);
    console.log(`Status: ${tournament?.status}`);

    console.log('\n📸 Snapshot Comparison:');
    console.log('----------------------');
    if (preMatchSnapshot && postMatchSnapshot) {
      const preData = preMatchSnapshot.data as any;
      const postData = postMatchSnapshot.data as any;
      
      console.log(`Pre-Match Holders: ${preData.totalHolders}`);
      console.log(`Post-Match Holders: ${postData.totalHolders}`);
      console.log(`Pre-Match Unique Addresses: ${preData.uniqueAddresses}`);
      console.log(`Post-Match Unique Addresses: ${postData.uniqueAddresses}`);
      console.log(`Pre-Match Total Tokens: ${preData.totalTokens}`);
      console.log(`Post-Match Total Tokens: ${postData.totalTokens}`);
    }

    console.log('\n🏆 Player Performance:');
    console.log('---------------------');
    playerScores.forEach((player, index) => {
      console.log(`${index + 1}. ${player.moduleName}`);
      console.log(`   Fantasy Points: ${Number(player.fantasyPoints).toFixed(2)}`);
      console.log(`   Runs: ${player.runs} (${player.ballsFaced} balls)`);
      console.log(`   Wickets: ${player.wickets} (${player.oversBowled} overs)`);
      console.log(`   Fielding: ${player.catches} catches, ${player.stumpings} stumpings, ${player.runOuts} run outs`);
    });

    console.log('\n💰 Reward Distribution Summary:');
    console.log('-------------------------------');
    console.log(`Total Reward Pool: ${rewardDistribution.totalRewardAmount} BOSON`);
    console.log(`Eligible Holders: ${rewardDistribution.totalEligibleHolders}`);
    console.log(`Total Tokens: ${rewardDistribution.totalTokens}`);
    console.log(`Total Distributed: ${rewardDistribution.summary.totalRewardsDistributed.toFixed(6)} BOSON`);
    console.log(`Average Reward: ${(rewardDistribution.summary.totalRewardsDistributed / rewardDistribution.totalEligibleHolders).toFixed(6)} BOSON`);

    console.log('\n🏆 Top 10 Reward Recipients:');
    console.log('----------------------------');
    const topRewards = rewardDistribution.rewardCalculations
      .sort((a: any, b: any) => b.rewardAmount - a.rewardAmount)
      .slice(0, 10);

    topRewards.forEach((reward: any, index: number) => {
      console.log(`${index + 1}. ${reward.address}`);
      console.log(`   Reward: ${reward.rewardAmount.toFixed(6)} BOSON`);
      console.log(`   Score: ${reward.totalScore.toFixed(2)}`);
      console.log(`   Tokens: ${reward.totalTokens}`);
      console.log(`   Eligibility: ${reward.eligibility.eligibilityPercentage.toFixed(1)}%`);
      console.log(`   Holdings: ${reward.holdings.length} players`);
    });

    console.log('\n📊 Reward Distribution Statistics:');
    console.log('---------------------------------');
    const rewards = rewardDistribution.rewardCalculations.map((r: any) => r.rewardAmount);
    const maxReward = Math.max(...rewards);
    const minReward = Math.min(...rewards);
    const medianReward = rewards.sort((a: number, b: number) => a - b)[Math.floor(rewards.length / 2)];
    
    console.log(`Highest Reward: ${maxReward.toFixed(6)} BOSON`);
    console.log(`Lowest Reward: ${minReward.toFixed(6)} BOSON`);
    console.log(`Median Reward: ${medianReward.toFixed(6)} BOSON`);
    console.log(`Reward Range: ${(maxReward - minReward).toFixed(6)} BOSON`);

  } catch (error) {
    console.error('❌ Error in detailed analysis:', error);
  }
}

async function runWorkflowForExistingTournament(tournamentId: string, totalRewardAmount: number = 10) {
  try {
    console.log('\n🔄 RUNNING WORKFLOW FOR EXISTING TOURNAMENT');
    console.log('==========================================');
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

    // Step 1: Update Scores and Create Post-Match Snapshot
    const postMatchSnapshot = await updateScoresAndCreatePostMatchSnapshot(tournamentId);

    // Step 2: Calculate Rewards
    const rewardDistribution = await calculateSimpleRewards(tournamentId, totalRewardAmount);

    // Step 3: Detailed Analysis
    await showDetailedAnalysis(tournamentId, rewardDistribution);

    console.log('\n🎉 WORKFLOW COMPLETED FOR EXISTING TOURNAMENT!');
    console.log('============================================');

    return {
      tournamentId,
      tournament,
      rewardDistribution,
      postMatchSnapshot
    };

  } catch (error) {
    console.error('\n❌ WORKFLOW FAILED FOR EXISTING TOURNAMENT!');
    console.error('Error details:', error);
    throw error;
  }
}

async function listTournamentsWithDetails() {
  try {
    console.log('\n📋 TOURNAMENTS WITH DETAILS');
    console.log('===========================\n');

    const tournaments = await prisma.tournament.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    if (tournaments.length === 0) {
      console.log('No tournaments found.');
      return;
    }

    for (const tournament of tournaments) {
      console.log(`🏏 ${tournament.name}`);
      console.log(`   ID: ${tournament.id}`);
      console.log(`   Teams: ${tournament.team1} vs ${tournament.team2}`);
      console.log(`   Status: ${tournament.status}`);
      console.log(`   Date: ${tournament.matchDate.toISOString()}`);
      console.log(`   Entry Fee: ${tournament.entryFee} APT`);
      console.log(`   Created: ${tournament.createdAt.toISOString()}`);

      // Check for snapshots
      const snapshots = await prisma.contractSnapshot.findMany({
        where: {
          data: { path: ['tournamentId'], equals: tournament.id }
        },
        orderBy: { createdAt: 'asc' }
      });

      if (snapshots.length > 0) {
        console.log(`   📸 Snapshots: ${snapshots.length}`);
        snapshots.forEach(snapshot => {
          const data = snapshot.data as any;
          console.log(`      - ${snapshot.contractType}: ${data.totalHolders} holders, ${data.uniqueAddresses} addresses`);
        });
      } else {
        console.log(`   📸 Snapshots: None`);
      }

      // Check for player scores
      const playerScores = await prisma.playerScore.findMany({
        where: { tournamentId: tournament.id }
      });

      if (playerScores.length > 0) {
        console.log(`   📊 Player Scores: ${playerScores.length} players`);
        const totalPoints = playerScores.reduce((sum, score) => sum + Number(score.fantasyPoints), 0);
        console.log(`      - Total Fantasy Points: ${totalPoints.toFixed(2)}`);
      } else {
        console.log(`   📊 Player Scores: None`);
      }

      console.log('');
    }

  } catch (error) {
    console.error('❌ Error listing tournaments:', error);
  }
}

async function main() {
  const program = new Command();

  program
    .name('complete-tournament-workflow')
    .description('Complete tournament workflow script for cricket fantasy sports')
    .version('1.0.0');

  program
    .command('run-complete')
    .description('Run complete tournament workflow from start to finish')
    .option('-n, --name <name>', 'Custom tournament name')
    .option('-a, --amount <amount>', 'Total reward amount in BOSON', '10')
    .option('-v, --verbose', 'Show detailed analysis', false)
    .action(async (options) => {
      try {
        const totalRewardAmount = parseFloat(options.amount) || 10;
        await runCompleteWorkflow({
          tournamentName: options.name,
          totalRewardAmount,
          verbose: options.verbose
        });
      } catch (error) {
        console.error('Failed to run complete workflow:', error);
        process.exit(1);
      } finally {
        await prisma.$disconnect();
      }
    });

  program
    .command('run-for-existing')
    .description('Run workflow for existing tournament (update scores, create post-match snapshot, calculate rewards)')
    .argument('<tournament-id>', 'Tournament ID to run workflow for')
    .option('-a, --amount <amount>', 'Total reward amount in BOSON', '10')
    .action(async (tournamentId: string, options) => {
      try {
        const totalRewardAmount = parseFloat(options.amount) || 10;
        await runWorkflowForExistingTournament(tournamentId, totalRewardAmount);
      } catch (error) {
        console.error('Failed to run workflow for existing tournament:', error);
        process.exit(1);
      } finally {
        await prisma.$disconnect();
      }
    });

  program
    .command('list-detailed')
    .description('List all tournaments with detailed information including snapshots and scores')
    .action(async () => {
      try {
        await listTournamentsWithDetails();
      } catch (error) {
        console.error('Failed to list tournaments:', error);
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
  runCompleteWorkflow,
  runWorkflowForExistingTournament,
  showDetailedAnalysis,
  listTournamentsWithDetails
};
