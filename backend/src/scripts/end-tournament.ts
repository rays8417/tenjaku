#!/usr/bin/env ts-node

import { PrismaClient, TournamentStatus, ContractType } from '@prisma/client';
import { Command } from 'commander';
import { createContractSnapshot, createSnapshotSummary } from '../services/contractSnapshotService';
import { calculateRewardsFromSnapshots, RewardCalculation } from '../services/rewardCalculationService';
import { aptos } from '../services/aptosService';
import { Ed25519PrivateKey, Ed25519Account } from '@aptos-labs/ts-sdk';

const prisma = new PrismaClient();

/**
 * End Tournament Script
 * 
 * This script takes a post-match snapshot and then ends a tournament
 * by changing its status to COMPLETED.
 */

/**
 * Take post-match snapshot for a tournament
 */
async function takePostMatchSnapshot(tournamentId: string) {
  try {
    console.log(`\n📸 TAKING POST-MATCH SNAPSHOT`);
    console.log('=============================');
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
    console.log(`   Current Status: ${tournament.status}\n`);

    // Check if tournament is already completed
    if (tournament.status === TournamentStatus.COMPLETED) {
      console.log(`⚠️  Tournament "${tournament.name}" is already completed`);
      console.log(`   Status: ${tournament.status}`);
      console.log(`   Completed at: ${tournament.updatedAt.toISOString()}`);
      return null;
    }

    // Check if post-match snapshot already exists
    const existingSnapshot = await prisma.contractSnapshot.findFirst({
      where: {
        data: { path: ['tournamentId'], equals: tournamentId },
        contractType: 'POST_MATCH' as ContractType
      },
      orderBy: { createdAt: 'desc' }
    });

    if (existingSnapshot) {
      console.log(`⚠️  Post-match snapshot already exists for this tournament`);
      console.log(`   Snapshot ID: ${existingSnapshot.id}`);
      console.log(`   Created at: ${existingSnapshot.createdAt.toISOString()}`);
      console.log(`   Block Number: ${existingSnapshot.blockNumber}`);
      
      // Ask if user wants to create a new snapshot
      console.log(`\n💡 To create a new snapshot, delete the existing one first or use a different tournament ID`);
      return existingSnapshot;
    }

    console.log('📸 Creating post-match snapshot...');
    const snapshot = await createContractSnapshot(tournamentId, 'POST_MATCH');
    
    console.log(`✅ Post-match snapshot created successfully!`);
    console.log(`   Snapshot ID: ${snapshot.snapshotId}`);
    console.log(`   Block Number: ${snapshot.blockNumber}`);
    console.log(`   Total Holders: ${snapshot.totalHolders}`);
    console.log(`   Unique Addresses: ${snapshot.uniqueAddresses}`);

    // Get and display detailed snapshot summary
    const snapshotData = await prisma.contractSnapshot.findUnique({
      where: { id: snapshot.snapshotId }
    });
    if (snapshotData) {
      console.log('\n' + createSnapshotSummary(snapshotData.data as any));
    }

    return snapshot;

  } catch (error) {
    console.error('❌ Error taking post-match snapshot:', error);
    throw error;
  }
}

/**
 * End tournament by changing status to COMPLETED
 */
async function endTournament(tournamentId: string) {
  try {
    console.log(`\n🏁 ENDING TOURNAMENT`);
    console.log('===================');
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
    console.log(`   Current Status: ${tournament.status}`);

    // Check if tournament is already completed
    if (tournament.status === TournamentStatus.COMPLETED) {
      console.log(`\n⚠️  Tournament "${tournament.name}" is already completed`);
      console.log(`   Status: ${tournament.status}`);
      console.log(`   Completed at: ${tournament.updatedAt.toISOString()}`);
      return tournament;
    }

    // Update tournament status to COMPLETED
    console.log('\n🔄 Updating tournament status to COMPLETED...');
    const updatedTournament = await prisma.tournament.update({
      where: { id: tournamentId },
      data: { 
        status: TournamentStatus.COMPLETED,
        updatedAt: new Date()
      }
    });

    console.log(`✅ Tournament ended successfully!`);
    console.log(`   Tournament: ${updatedTournament.name}`);
    console.log(`   New Status: ${updatedTournament.status}`);
    console.log(`   Ended at: ${updatedTournament.updatedAt.toISOString()}`);

    return updatedTournament;

  } catch (error) {
    console.error('❌ Error ending tournament:', error);
    throw error;
  }
}

/**
 * Calculate rewards for a tournament
 */
async function calculateRewards(tournamentId: string, totalRewardAmount: number = 10) {
  try {
    console.log(`\n💰 CALCULATING REWARDS`);
    console.log('=====================');
    console.log(`Tournament ID: ${tournamentId}`);
    console.log(`Total Reward Amount: ${totalRewardAmount} BOSON\n`);

    // Verify tournament exists
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId }
    });

    if (!tournament) {
      throw new Error(`Tournament with ID ${tournamentId} not found`);
    }

    console.log(`✅ Tournament: ${tournament.name}`);
    console.log(`   Teams: ${tournament.team1} vs ${tournament.team2}\n`);

    // Calculate rewards based on snapshots
    console.log('🔍 Calculating rewards based on snapshots...');
    const rewardDistribution = await calculateRewardsFromSnapshots(tournamentId, totalRewardAmount);

    console.log('\n📈 REWARD DISTRIBUTION RESULTS:');
    console.log('===============================');
    console.log(`Total Reward Pool: ${totalRewardAmount} BOSON`);
    console.log(`Total Eligible Holders: ${rewardDistribution.totalEligibleHolders}`);
    console.log(`Total Tokens: ${rewardDistribution.totalTokens}`);
    console.log(`Total Distributed: ${rewardDistribution.summary.totalRewardsDistributed.toFixed(6)} BOSON\n`);

    // Show detailed reward breakdown
    console.log('🏆 DETAILED REWARD BREAKDOWN:');
    console.log('=============================');
    
    // Sort by reward amount (descending)
    const sortedRewards = rewardDistribution.rewardCalculations
      .sort((a, b) => b.rewardAmount - a.rewardAmount);

    // Show top 20 reward recipients
    const topRewards = sortedRewards.slice(0, 20);
    
    topRewards.forEach((reward, index) => {
      console.log(`\n${index + 1}. Address: ${reward.address}`);
      console.log(`   Reward Amount: ${reward.rewardAmount.toFixed(6)} BOSON`);
      console.log(`   Total Score: ${reward.totalScore.toFixed(2)}`);
      console.log(`   Total Tokens: ${reward.totalTokens}`);
      console.log(`   Eligibility: ${reward.eligibility.eligibilityPercentage.toFixed(1)}%`);
      console.log(`   Holdings: ${reward.holdings.length} players`);
      
      // Show individual player holdings
      if (reward.holdings.length > 0) {
        console.log(`   Player Holdings:`);
        reward.holdings.forEach((holding, hIndex) => {
          const formattedBalance = (Number(holding.balance) / 100000000).toFixed(2);
          console.log(`     ${hIndex + 1}. ${holding.moduleName}: ${formattedBalance} tokens (${holding.points.toFixed(2)} points)`);
        });
      }
    });

    // Show summary statistics
    if (sortedRewards.length > 20) {
      console.log(`\n... and ${sortedRewards.length - 20} more addresses`);
    }

    console.log('\n📊 REWARD STATISTICS:');
    console.log('=====================');
    const rewards = sortedRewards.map(r => r.rewardAmount);
    const maxReward = Math.max(...rewards);
    const minReward = Math.min(...rewards);
    const medianReward = rewards.sort((a, b) => a - b)[Math.floor(rewards.length / 2)];
    const totalDistributed = rewards.reduce((sum, r) => sum + r, 0);
    
    console.log(`Highest Reward: ${maxReward.toFixed(6)} BOSON`);
    console.log(`Lowest Reward: ${minReward.toFixed(6)} BOSON`);
    console.log(`Median Reward: ${medianReward.toFixed(6)} BOSON`);
    console.log(`Average Reward: ${(totalDistributed / rewards.length).toFixed(6)} BOSON`);
    console.log(`Reward Range: ${(maxReward - minReward).toFixed(6)} BOSON`);
    console.log(`Total Distributed: ${totalDistributed.toFixed(6)} BOSON`);

    return rewardDistribution;

  } catch (error) {
    console.error('❌ Error calculating rewards:', error);
    throw error;
  }
}

/**
 * Complete workflow: Take post-match snapshot, calculate rewards, and end tournament
 */
async function distributeBosonRewards(rewardCalculations: RewardCalculation[], totalRewardAmount: number) {
  try {
    const BOSON_COIN_TYPE = process.env.BOSON_COIN_TYPE || '0xaf230e3024e92da6a3a15f5a6a3f201c886891268717bf8a21157bb73a1c027b::Boson::Boson';
    const BOSON_DECIMALS = Number(process.env.BOSON_DECIMALS || 8);
    const ADMIN_PRIVATE_KEY = process.env.ADMIN_PRIVATE_KEY;
    const ADMIN_ACCOUNT_ADDRESS = process.env.ADMIN_ACCOUNT_ADDRESS;

    if (!ADMIN_PRIVATE_KEY || !ADMIN_ACCOUNT_ADDRESS) {
      throw new Error('ADMIN_PRIVATE_KEY and ADMIN_ACCOUNT_ADDRESS must be set in environment');
    }

    function hexToBytes(hex: string): Uint8Array {
      const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
      if (clean.length % 2 !== 0) {
        throw new Error('Invalid hex private key');
      }
      const out = new Uint8Array(clean.length / 2);
      for (let i = 0; i < clean.length; i += 2) {
        out[i / 2] = parseInt(clean.slice(i, i + 2), 16);
      }
      return out;
    }

    function parseAdminPrivateKey(raw: string): Uint8Array {
      const trimmed = raw.trim();
      // 1) comma-separated decimal bytes
      if (trimmed.includes(',')) {
        const parts = trimmed.split(',').map(v => parseInt(v.trim(), 10));
        if (parts.some(n => Number.isNaN(n) || n < 0 || n > 255)) {
          throw new Error('Invalid ADMIN_PRIVATE_KEY byte list');
        }
        let bytes = new Uint8Array(parts);
        if (bytes.length === 64) {
          bytes = bytes.slice(0, 32);
        }
        if (bytes.length !== 32) {
          throw new Error(`Invalid ADMIN_PRIVATE_KEY length: ${bytes.length} bytes (expected 32)`);
        }
        return bytes;
      }
      // 2) hex (with or without 0x)
      if (/^(0x)?[0-9a-fA-F]+$/.test(trimmed)) {
        let bytes = hexToBytes(trimmed);
        if (bytes.length === 64) {
          bytes = bytes.slice(0, 32);
        }
        if (bytes.length !== 32) {
          throw new Error(`Invalid hex private key length: ${bytes.length} bytes (expected 32 or 64)`);
        }
        return bytes;
      }
      // 3) base64
      try {
        const buf = Buffer.from(trimmed, 'base64');
        let bytes = new Uint8Array(buf);
        if (bytes.length === 64) {
          bytes = bytes.slice(0, 32);
        }
        if (bytes.length !== 32) {
          throw new Error(`Invalid base64 private key length: ${bytes.length} bytes (expected 32 or 64)`);
        }
        return bytes;
      } catch (_e) {
        // fallthrough
      }
      throw new Error('Unsupported ADMIN_PRIVATE_KEY format. Use comma-separated bytes, 0x-hex, or base64');
    }

    const privateKey = new Ed25519PrivateKey(parseAdminPrivateKey(ADMIN_PRIVATE_KEY));
    const adminAccount = new Ed25519Account({ privateKey });

    // Double-check derived address matches expected
    const derivedAddress = adminAccount.accountAddress.toString();
    if (derivedAddress !== ADMIN_ACCOUNT_ADDRESS) {
      console.warn(`Admin address mismatch. Expected ${ADMIN_ACCOUNT_ADDRESS}, derived ${derivedAddress}`);
    }

    const multiplier = Math.pow(10, BOSON_DECIMALS);

    console.log(`\n🚚 DISTRIBUTING ${totalRewardAmount} BOSON TO WINNERS (${BOSON_DECIMALS} decimals)`);

    const results: { address: string; amount: number; hash?: string; status: 'success'|'failed'; error?: string }[] = [];

    for (const reward of rewardCalculations) {
      const amountInBaseUnits = Math.floor(reward.rewardAmount * multiplier);
      if (amountInBaseUnits <= 0) {
        results.push({ address: reward.address, amount: reward.rewardAmount, status: 'failed', error: 'Zero amount' });
        continue;
      }

      try {
        const transferTx = await aptos.transferCoinTransaction({
          sender: ADMIN_ACCOUNT_ADDRESS,
          recipient: reward.address,
          amount: amountInBaseUnits,
          coinType: BOSON_COIN_TYPE as `${string}::${string}::${string}`,
        });

        const committed = await aptos.signAndSubmitTransaction({ signer: adminAccount, transaction: transferTx });
        await aptos.waitForTransaction({ transactionHash: committed.hash });
        console.log(`✅ Sent ${reward.rewardAmount} BOSON to ${reward.address} (tx: ${committed.hash})`);
        results.push({ address: reward.address, amount: reward.rewardAmount, status: 'success', hash: committed.hash });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`❌ Failed sending to ${reward.address}: ${message}`);
        results.push({ address: reward.address, amount: reward.rewardAmount, status: 'failed', error: message });
      }
    }

    const successes = results.filter(r => r.status === 'success').length;
    const failures = results.filter(r => r.status === 'failed').length;
    console.log(`\n📦 Distribution complete: ${successes} success, ${failures} failed`);
    return results;
  } catch (error) {
    console.error('❌ Error during BOSON distribution:', error);
    throw error;
  }
}

async function endTournamentWithSnapshot(tournamentId: string, totalRewardAmount: number = 10) {
  try {
    console.log(`\n🏁 ENDING TOURNAMENT WITH POST-MATCH SNAPSHOT & REWARDS`);
    console.log('=======================================================');
    console.log(`Tournament ID: ${tournamentId}`);
    console.log(`Total Reward Amount: ${totalRewardAmount} BOSON\n`);

    // Step 1: Take post-match snapshot
    console.log('📸 STEP 1: TAKING POST-MATCH SNAPSHOT');
    console.log('=====================================');
    const snapshot = await takePostMatchSnapshot(tournamentId);

    // Step 2: Calculate rewards
    console.log('\n💰 STEP 2: CALCULATING REWARDS');
    console.log('==============================');
    const rewardDistribution = await calculateRewards(tournamentId, totalRewardAmount);

    // Step 3: Distribute rewards on-chain
    console.log('\n🚚 STEP 3: DISTRIBUTING BOSON REWARDS ON-CHAIN');
    console.log('==============================================');
    await distributeBosonRewards(rewardDistribution.rewardCalculations, totalRewardAmount);

    // Step 4: End tournament
    console.log('\n🏁 STEP 4: ENDING TOURNAMENT');
    console.log('============================');
    const endedTournament = await endTournament(tournamentId);

    // Step 5: Final Summary
    console.log('\n🎉 TOURNAMENT ENDED SUCCESSFULLY!');
    console.log('=================================');
    console.log(`Tournament ID: ${tournamentId}`);
    console.log(`Tournament Name: ${endedTournament.name}`);
    console.log(`Teams: ${endedTournament.team1} vs ${endedTournament.team2}`);
    console.log(`Status: ${endedTournament.status}`);
    console.log(`Ended at: ${endedTournament.updatedAt.toISOString()}`);
    
    if (snapshot) {
      console.log(`Snapshot Block: ${snapshot.blockNumber}`);
    }

    console.log(`\n💰 REWARD SUMMARY:`);
    console.log(`Total Reward Pool: ${totalRewardAmount} BOSON`);
    console.log(`Eligible Holders: ${rewardDistribution.totalEligibleHolders}`);
    console.log(`Total Distributed: ${rewardDistribution.summary.totalRewardsDistributed.toFixed(6)} BOSON`);

    console.log('\n✅ All Steps Completed:');
    console.log('   ✅ Post-match snapshot taken');
    console.log('   ✅ Rewards calculated and displayed');
    console.log('   ✅ Tournament status updated to COMPLETED');
    console.log('   ✅ Tournament ended successfully\n');

    return {
      tournament: endedTournament,
      snapshot: snapshot,
      rewardDistribution: rewardDistribution
    };

  } catch (error) {
    console.error('\n❌ FAILED TO END TOURNAMENT!');
    console.error('============================');
    console.error('Error details:', error);
    throw error;
  }
}

/**
 * Get tournament details
 */
async function getTournamentDetails(tournamentId: string) {
  try {
    console.log(`\n📋 TOURNAMENT DETAILS`);
    console.log('====================');
    console.log(`Tournament ID: ${tournamentId}\n`);

    // Get tournament
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId }
    });

    if (!tournament) {
      throw new Error(`Tournament with ID ${tournamentId} not found`);
    }

    console.log(`🏏 Tournament Information:`);
    console.log(`   Name: ${tournament.name}`);
    console.log(`   Teams: ${tournament.team1} vs ${tournament.team2}`);
    console.log(`   Status: ${tournament.status}`);
    console.log(`   Match Date: ${tournament.matchDate.toISOString()}`);
    console.log(`   Entry Fee: ${tournament.entryFee} APT`);
    console.log(`   Created: ${tournament.createdAt.toISOString()}`);
    console.log(`   Updated: ${tournament.updatedAt.toISOString()}`);

    // Check for snapshots
    const snapshots = await prisma.contractSnapshot.findMany({
      where: {
        data: { path: ['tournamentId'], equals: tournamentId }
      },
      orderBy: { createdAt: 'asc' }
    });

    console.log(`\n📸 Snapshots (${snapshots.length}):`);
    if (snapshots.length === 0) {
      console.log('   No snapshots found');
    } else {
      snapshots.forEach((snapshot, index) => {
        const data = snapshot.data as any;
        console.log(`   ${index + 1}. ${snapshot.contractType}`);
        console.log(`      ID: ${snapshot.id}`);
        console.log(`      Block: ${snapshot.blockNumber}`);
        console.log(`      Holders: ${data.totalHolders}`);
        console.log(`      Addresses: ${data.uniqueAddresses}`);
        console.log(`      Created: ${snapshot.createdAt.toISOString()}`);
      });
    }

    // Check for player scores
    const playerScores = await prisma.playerScore.findMany({
      where: { tournamentId },
      orderBy: { fantasyPoints: 'desc' }
    });

    console.log(`\n📊 Player Scores (${playerScores.length}):`);
    if (playerScores.length === 0) {
      console.log('   No player scores found');
    } else {
      playerScores.slice(0, 5).forEach((player, index) => {
        console.log(`   ${index + 1}. ${player.moduleName}: ${Number(player.fantasyPoints).toFixed(2)} points`);
      });
      if (playerScores.length > 5) {
        console.log(`   ... and ${playerScores.length - 5} more players`);
      }
    }

    return tournament;

  } catch (error) {
    console.error('❌ Error getting tournament details:', error);
    throw error;
  }
}

async function main() {
  const program = new Command();

  program
    .name('end-tournament')
    .description('End tournament with post-match snapshot')
    .version('1.0.0');

  program
    .command('end-with-snapshot')
    .description('Take post-match snapshot, calculate rewards, and end tournament')
    .argument('<tournament-id>', 'Tournament ID to end')
    .option('-a, --amount <amount>', 'Total reward amount in BOSON', '10')
    .action(async (tournamentId: string, options) => {
      try {
        const totalRewardAmount = parseFloat(options.amount) || 10;
        await endTournamentWithSnapshot(tournamentId, totalRewardAmount);
      } catch (error) {
        console.error('Failed to end tournament with snapshot:', error);
        process.exit(1);
      } finally {
        await prisma.$disconnect();
      }
    });

  program
    .command('snapshot-only')
    .description('Take post-match snapshot only (do not end tournament)')
    .argument('<tournament-id>', 'Tournament ID to take snapshot for')
    .action(async (tournamentId: string) => {
      try {
        await takePostMatchSnapshot(tournamentId);
      } catch (error) {
        console.error('Failed to take post-match snapshot:', error);
        process.exit(1);
      } finally {
        await prisma.$disconnect();
      }
    });

  program
    .command('end-only')
    .description('End tournament only (do not take snapshot)')
    .argument('<tournament-id>', 'Tournament ID to end')
    .action(async (tournamentId: string) => {
      try {
        await endTournament(tournamentId);
      } catch (error) {
        console.error('Failed to end tournament:', error);
        process.exit(1);
      } finally {
        await prisma.$disconnect();
      }
    });

  program
    .command('calculate-rewards')
    .description('Calculate rewards for a tournament')
    .argument('<tournament-id>', 'Tournament ID to calculate rewards for')
    .option('-a, --amount <amount>', 'Total reward amount in BOSON', '10')
    .action(async (tournamentId: string, options) => {
      try {
        const totalRewardAmount = parseFloat(options.amount) || 10;
        await calculateRewards(tournamentId, totalRewardAmount);
      } catch (error) {
        console.error('Failed to calculate rewards:', error);
        process.exit(1);
      } finally {
        await prisma.$disconnect();
      }
    });

  program
    .command('details')
    .description('Show tournament details including snapshots and scores')
    .argument('<tournament-id>', 'Tournament ID to show details for')
    .action(async (tournamentId: string) => {
      try {
        await getTournamentDetails(tournamentId);
      } catch (error) {
        console.error('Failed to get tournament details:', error);
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
  endTournamentWithSnapshot,
  takePostMatchSnapshot,
  endTournament,
  calculateRewards,
  getTournamentDetails
};
