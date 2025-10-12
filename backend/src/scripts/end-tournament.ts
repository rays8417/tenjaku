#!/usr/bin/env ts-node

import { TournamentStatus, ContractType } from '@prisma/client';
import { Command } from 'commander';
import { prisma } from '../prisma';
import { createContractSnapshot, createSnapshotSummary } from '../services/contractSnapshotService';
import { calculateRewardsFromSnapshots, RewardCalculation } from '../services/rewardCalculationService';
import { aptos } from '../services/aptosService';
import { Ed25519PrivateKey, Ed25519Account } from '@aptos-labs/ts-sdk';

/**
 * End Tournament Script
 * Simplified version with only end-with-snapshot command
 * 
 * Usage: npm run end:with-snapshot -- <tournament-id> --amount 100
 */

// Reward configuration
const REWARD_CONFIG = {
  ADMIN_PRIVATE_KEY: process.env.ADMIN_PRIVATE_KEY,
  ADMIN_ACCOUNT_ADDRESS: process.env.ADMIN_ACCOUNT_ADDRESS,
  BOSON_COIN_TYPE: (process.env.BOSON_COIN_TYPE as string) || `${process.env.APTOS_CONTRACT_ADDRESS}::Boson::Boson`,
  BOSON_DECIMALS: Number(process.env.BOSON_DECIMALS || 8),
  MIN_REWARD_AMOUNT: 0.001,
};

/**
 * Take post-match snapshot
 */
async function takePostMatchSnapshot(tournamentId: string) {
  console.log(`\n📸 TAKING POST-MATCH SNAPSHOT`);
  console.log('=============================');
  console.log(`Tournament ID: ${tournamentId}\n`);

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId }
  });

  if (!tournament) {
    throw new Error(`Tournament not found`);
  }

  console.log(`✅ Tournament: ${tournament.name}`);
  console.log(`   Teams: ${tournament.team1} vs ${tournament.team2}`);
  console.log(`   Status: ${tournament.status}\n`);

  if (tournament.status === TournamentStatus.COMPLETED) {
    console.log(`⚠️  Tournament is already completed`);
    return null;
  }

  // Check for existing snapshot
  const existingSnapshot = await prisma.contractSnapshot.findFirst({
    where: {
      data: { path: ['tournamentId'], equals: tournamentId },
      contractType: 'POST_MATCH' as ContractType
    },
    orderBy: { createdAt: 'desc' }
  });

  if (existingSnapshot) {
    console.log(`⚠️  Post-match snapshot already exists`);
    console.log(`   Snapshot ID: ${existingSnapshot.id}`);
    return existingSnapshot;
  }

  console.log('📸 Creating post-match snapshot...');
  const snapshot = await createContractSnapshot(tournamentId, 'POST_MATCH');
  
  console.log(`✅ Post-match snapshot created!`);
  console.log(`   Snapshot ID: ${snapshot.snapshotId}`);
  console.log(`   Total Holders: ${snapshot.totalHolders}`);
  console.log(`   Unique Addresses: ${snapshot.uniqueAddresses}`);

  const snapshotData = await prisma.contractSnapshot.findUnique({
    where: { id: snapshot.snapshotId }
  });
  if (snapshotData) {
    console.log('\n' + createSnapshotSummary(snapshotData.data as any));
  }

  return snapshot;
}

/**
 * Calculate rewards
 */
async function calculateRewards(tournamentId: string, totalRewardAmount?: number) {
  console.log(`\n💰 CALCULATING REWARDS`);
  console.log('=====================\n');

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: { rewardPools: true }
  });

  if (!tournament) {
    throw new Error(`Tournament not found`);
  }

  // Use existing reward pool or provided amount
  if (!totalRewardAmount) {
    if (tournament.rewardPools.length > 0) {
      totalRewardAmount = Number(tournament.rewardPools[0].totalAmount);
      console.log(`Using existing reward pool: ${totalRewardAmount} BOSON`);
    } else {
      totalRewardAmount = 10; // Default
      console.log(`⚠️  No reward pool found, using default: ${totalRewardAmount} BOSON`);
    }
  }

  console.log('🔍 Calculating rewards based on snapshots...\n');
  const rewardDistribution = await calculateRewardsFromSnapshots(tournamentId, totalRewardAmount);

  console.log('📈 REWARD DISTRIBUTION:');
  console.log(`Total Pool: ${totalRewardAmount} BOSON`);
  console.log(`Eligible Holders: ${rewardDistribution.totalEligibleHolders}`);
  console.log(`Total Distributed: ${rewardDistribution.summary.totalRewardsDistributed.toFixed(6)} BOSON\n`);

  // Show top 10 rewards
  const sortedRewards = rewardDistribution.rewardCalculations
    .sort((a, b) => b.rewardAmount - a.rewardAmount)
    .slice(0, 10);

  console.log('🏆 TOP 10 REWARDS:');
  sortedRewards.forEach((reward, index) => {
    console.log(`${index + 1}. ${reward.address.slice(0, 10)}...`);
    console.log(`   Reward: ${reward.rewardAmount.toFixed(6)} BOSON`);
    console.log(`   Score: ${reward.totalScore.toFixed(2)} | Holdings: ${reward.holdings.length} players\n`);
  });

  return rewardDistribution;
}

/**
 * Distribute rewards on-chain
 */
async function distributeBosonRewards(rewardCalculations: RewardCalculation[], totalRewardAmount: number) {
  console.log(`Starting BOSON token transfers for ${rewardCalculations.length} users...\n`);

  if (!REWARD_CONFIG.ADMIN_PRIVATE_KEY || !REWARD_CONFIG.ADMIN_ACCOUNT_ADDRESS) {
    throw new Error('Admin private key and account address must be configured');
  }

  // Create admin account
  const privateKeyBytes = REWARD_CONFIG.ADMIN_PRIVATE_KEY.split(',').map(Number);
  const privateKey = new Ed25519PrivateKey(new Uint8Array(privateKeyBytes));
  const adminAccount = new Ed25519Account({ privateKey });
  const adminAddress = privateKey.publicKey().authKey().derivedAddress();

  console.log(`Admin account: ${adminAddress}\n`);

  let successCount = 0;
  let failCount = 0;
  let skipCount = 0;

  for (const reward of rewardCalculations) {
    try {
      if (reward.rewardAmount < REWARD_CONFIG.MIN_REWARD_AMOUNT) {
        console.log(`⏭️  Skipping ${reward.address.slice(0, 10)}... - too small (${reward.rewardAmount})`);
        skipCount++;
        continue;
      }

      const amountInBaseUnits = Math.floor(reward.rewardAmount * Math.pow(10, REWARD_CONFIG.BOSON_DECIMALS));
      
      console.log(`💸 Transferring ${reward.rewardAmount} BOSON to ${reward.address.slice(0, 10)}...`);

      const transferTx = await aptos.transferCoinTransaction({
        sender: adminAddress.toString(),
        recipient: reward.address,
        amount: amountInBaseUnits,
        coinType: REWARD_CONFIG.BOSON_COIN_TYPE as `${string}::${string}::${string}`,
      });

      const committedTx = await aptos.signAndSubmitTransaction({
        signer: adminAccount,
        transaction: transferTx,
      });

      await aptos.waitForTransaction({ transactionHash: committedTx.hash });

      console.log(`   ✅ Success - TX: ${committedTx.hash}\n`);
      successCount++;
    } catch (error) {
      console.error(`   ❌ Failed: ${error}\n`);
      failCount++;
    }
  }

  console.log(`\n📊 DISTRIBUTION SUMMARY:`);
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`⏭️  Skipped: ${skipCount}`);
  console.log(`📈 Total Pool: ${totalRewardAmount} BOSON\n`);
}

/**
 * End tournament
 */
async function endTournament(tournamentId: string) {
  console.log(`\n🏁 ENDING TOURNAMENT`);
  console.log('===================\n');

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId }
  });

  if (!tournament) {
    throw new Error(`Tournament not found`);
  }

  if (tournament.status === TournamentStatus.COMPLETED) {
    console.log(`⚠️  Tournament already completed`);
    return tournament;
  }

  const updated = await prisma.tournament.update({
    where: { id: tournamentId },
    data: { 
      status: TournamentStatus.COMPLETED,
      updatedAt: new Date()
    }
  });

  console.log(`✅ Tournament ended!`);
  console.log(`   Name: ${updated.name}`);
  console.log(`   Status: ${updated.status}`);
  console.log(`   Ended at: ${updated.updatedAt.toISOString()}\n`);

  return updated;
}

/**
 * End tournament with snapshot (MAIN COMMAND)
 */
async function endTournamentWithSnapshot(tournamentId: string, options: any = {}) {
  console.log(`\n🏁 ENDING TOURNAMENT WITH SNAPSHOT & REWARDS`);
  console.log('============================================\n');

  // Step 1: Take post-match snapshot
  const snapshot = await takePostMatchSnapshot(tournamentId);

  // Step 2: Calculate rewards
  const rewardDistribution = await calculateRewards(tournamentId, options.amount ? parseFloat(options.amount) : undefined);

  // Step 3: Distribute rewards on-chain
  console.log('\n🚚 DISTRIBUTING BOSON REWARDS ON-CHAIN');
  console.log('======================================');
  await distributeBosonRewards(rewardDistribution.rewardCalculations, rewardDistribution.totalRewardAmount);

  // Step 4: End tournament
  const endedTournament = await endTournament(tournamentId);

  // Final summary
  console.log('\n🎉 TOURNAMENT ENDED SUCCESSFULLY!');
  console.log('=================================');
  console.log(`Tournament: ${endedTournament.name}`);
  console.log(`Teams: ${endedTournament.team1} vs ${endedTournament.team2}`);
  console.log(`Status: ${endedTournament.status}`);
  console.log(`Total Distributed: ${rewardDistribution.summary.totalRewardsDistributed.toFixed(6)} BOSON\n`);

  return { tournament: endedTournament, snapshot, rewardDistribution };
}

// Main CLI
async function main() {
  const program = new Command();

  program
    .name('end-tournament')
    .description('End tournament with post-match snapshot and rewards')
    .version('1.0.0');

  program
    .command('end-with-snapshot')
    .description('Complete workflow: snapshot → calculate rewards → distribute → end tournament')
    .argument('<tournament-id>', 'Tournament ID to end')
    .option('-a, --amount <amount>', 'Total reward amount in BOSON (optional, uses existing pool if not specified)')
    .action(async (tournamentId: string, options) => {
      try {
        await endTournamentWithSnapshot(tournamentId, options);
      } catch (error) {
        console.error('Failed to end tournament:', error);
        process.exit(1);
      } finally {
        await prisma.$disconnect();
      }
    });

  if (process.argv.length <= 2) {
    program.help();
  }

  await program.parseAsync(process.argv);
}

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
  process.exit(1);
});

main().catch((error) => {
  console.error('Script failed:', error);
  process.exit(1);
});
