#!/usr/bin/env ts-node

import { TournamentStatus, ContractType } from '@prisma/client';
import { Command } from 'commander';
import { prisma } from '../prisma';
import { createContractSnapshot, createSnapshotSummary } from '../services/contractSnapshotService';
import { calculateRewardsFromSnapshots, RewardCalculation } from '../services/rewardCalculationService';
import { aptos } from '../services/aptosService';
import { Ed25519PrivateKey, Ed25519Account } from '@aptos-labs/ts-sdk';

/**
 * STEP 4: End Tournament
 * Takes post-match snapshot, calculates & distributes rewards, and completes tournament
 * 
 * Usage: npm run tournament:end -- <tournament-id> --amount 100
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
  console.log('=============================\n');

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId }
  });

  if (!tournament) {
    throw new Error('Tournament not found');
  }

  console.log(`Tournament: ${tournament.name}`);
  console.log(`Status: ${tournament.status}\n`);

  if (tournament.status === TournamentStatus.COMPLETED) {
    console.log('⚠️  Tournament already completed');
    return null;
  }

  // Check for existing snapshot
  const existing = await prisma.contractSnapshot.findFirst({
    where: {
      data: { path: ['tournamentId'], equals: tournamentId },
      contractType: 'POST_MATCH' as ContractType
    },
    orderBy: { createdAt: 'desc' }
  });

  if (existing) {
    console.log('⚠️  Post-match snapshot already exists');
    console.log(`   Using existing snapshot: ${existing.id}\n`);
    return existing;
  }

  console.log('📸 Creating post-match snapshot...');
  const snapshot = await createContractSnapshot(tournamentId, 'POST_MATCH');

  console.log(`✅ Snapshot created!`);
  console.log(`   ID: ${snapshot.snapshotId}`);
  console.log(`   Holders: ${snapshot.totalHolders}`);
  console.log(`   Addresses: ${snapshot.uniqueAddresses}\n`);

  const snapshotData = await prisma.contractSnapshot.findUnique({
    where: { id: snapshot.snapshotId }
  });
  if (snapshotData) {
    console.log(createSnapshotSummary(snapshotData.data as any));
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
    throw new Error('Tournament not found');
  }

  // Use existing reward pool or provided amount
  if (!totalRewardAmount) {
    if (tournament.rewardPools.length > 0) {
      totalRewardAmount = Number(tournament.rewardPools[0].totalAmount);
      console.log(`Using existing reward pool: ${totalRewardAmount} BOSON`);
    } else {
      totalRewardAmount = 100; // Default
      console.log(`Using default: ${totalRewardAmount} BOSON`);
    }
  }

  console.log(`Total Pool: ${totalRewardAmount} BOSON\n`);

  const rewardDistribution = await calculateRewardsFromSnapshots(tournamentId, totalRewardAmount);

  console.log('📈 REWARD DISTRIBUTION:');
  console.log(`Eligible Holders: ${rewardDistribution.totalEligibleHolders}`);
  console.log(`Total Distributed: ${rewardDistribution.summary.totalRewardsDistributed.toFixed(6)} BOSON\n`);

  // Show top 10
  const top10 = rewardDistribution.rewardCalculations
    .sort((a, b) => b.rewardAmount - a.rewardAmount)
    .slice(0, 10);

  console.log('🏆 TOP 10 REWARDS:');
  top10.forEach((reward, i) => {
    console.log(`${i + 1}. ${reward.address.slice(0, 12)}...`);
    console.log(`   ${reward.rewardAmount.toFixed(6)} BOSON | Score: ${reward.totalScore.toFixed(2)}\n`);
  });

  return rewardDistribution;
}

/**
 * Distribute rewards on-chain
 */
async function distributeRewards(rewardCalculations: RewardCalculation[]) {
  console.log(`\n🚚 DISTRIBUTING REWARDS ON-CHAIN`);
  console.log('=================================\n');

  if (!REWARD_CONFIG.ADMIN_PRIVATE_KEY || !REWARD_CONFIG.ADMIN_ACCOUNT_ADDRESS) {
    throw new Error('Admin credentials not configured in .env');
  }

  // Create admin account
  const privateKeyBytes = REWARD_CONFIG.ADMIN_PRIVATE_KEY.split(',').map(Number);
  const privateKey = new Ed25519PrivateKey(new Uint8Array(privateKeyBytes));
  const adminAccount = new Ed25519Account({ privateKey });
  const adminAddress = privateKey.publicKey().authKey().derivedAddress();

  console.log(`Admin: ${adminAddress}\n`);

  let success = 0, failed = 0, skipped = 0;

  for (const reward of rewardCalculations) {
    try {
      if (reward.rewardAmount < REWARD_CONFIG.MIN_REWARD_AMOUNT) {
        console.log(`⏭️  Skip: ${reward.address.slice(0, 12)}... (too small)`);
        skipped++;
        continue;
      }

      const amountInBaseUnits = Math.floor(reward.rewardAmount * Math.pow(10, REWARD_CONFIG.BOSON_DECIMALS));

      console.log(`💸 ${reward.address.slice(0, 12)}... → ${reward.rewardAmount} BOSON`);

      const transferTx = await aptos.transferCoinTransaction({
        sender: adminAddress.toString(),
        recipient: reward.address,
        amount: amountInBaseUnits,
        coinType: REWARD_CONFIG.BOSON_COIN_TYPE as `${string}::${string}::${string}`,
      });

      const committed = await aptos.signAndSubmitTransaction({
        signer: adminAccount,
        transaction: transferTx,
      });

      await aptos.waitForTransaction({ transactionHash: committed.hash });

      console.log(`   ✅ TX: ${committed.hash}\n`);
      success++;
    } catch (error) {
      console.log(`   ❌ Failed\n`);
      failed++;
    }
  }

  console.log('📊 DISTRIBUTION SUMMARY:');
  console.log(`✅ Successful: ${success}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⏭️  Skipped: ${skipped}\n`);
}

/**
 * Complete tournament
 */
async function completeTournament(tournamentId: string) {
  console.log(`\n🏁 COMPLETING TOURNAMENT`);
  console.log('========================\n');

  const tournament = await prisma.tournament.update({
    where: { id: tournamentId },
    data: { 
      status: TournamentStatus.COMPLETED,
      updatedAt: new Date()
    }
  });

  console.log(`✅ Tournament completed!`);
  console.log(`   Name: ${tournament.name}`);
  console.log(`   Status: ${tournament.status}`);
  console.log(`   Ended: ${tournament.updatedAt.toISOString()}\n`);

  return tournament;
}

/**
 * End tournament with complete workflow
 */
async function endTournamentWithSnapshot(tournamentId: string, options: any = {}) {
  console.log(`\n🎬 STEP 4: END TOURNAMENT (COMPLETE WORKFLOW)`);
  console.log('=============================================\n');
  console.log(`Tournament ID: ${tournamentId}\n`);

  // Step 1: Post-match snapshot
  const snapshot = await takePostMatchSnapshot(tournamentId);

  // Step 2: Calculate rewards
  const rewardAmount = options.amount ? parseFloat(options.amount) : undefined;
  const rewardDistribution = await calculateRewards(tournamentId, rewardAmount);

  // Step 3: Distribute rewards
  await distributeRewards(rewardDistribution.rewardCalculations);

  // Step 4: Complete tournament
  const completedTournament = await completeTournament(tournamentId);

  // Final summary
  console.log('\n🎉 TOURNAMENT ENDED SUCCESSFULLY!');
  console.log('=================================');
  console.log(`Tournament: ${completedTournament.name}`);
  console.log(`Teams: ${completedTournament.team1} vs ${completedTournament.team2}`);
  console.log(`Status: ${completedTournament.status}`);
  console.log(`Distributed: ${rewardDistribution.summary.totalRewardsDistributed.toFixed(6)} BOSON\n`);

  console.log('✅ All steps completed:');
  console.log('   ✅ Post-match snapshot taken');
  console.log('   ✅ Rewards calculated');
  console.log('   ✅ Rewards distributed on-chain');
  console.log('   ✅ Tournament marked as COMPLETED\n');

  return { tournament: completedTournament, snapshot, rewardDistribution };
}

// Main CLI
async function main() {
  const program = new Command();

  program
    .name('end-tournament')
    .description('End tournament with rewards distribution')
    .version('1.0.0');

  program
    .command('end-with-snapshot')
    .description('Complete workflow: snapshot → rewards → distribute → complete')
    .argument('<tournament-id>', 'Tournament ID')
    .option('-a, --amount <amount>', 'Total reward amount in BOSON (optional)')
    .action(async (tournamentId: string, options) => {
      try {
        await endTournamentWithSnapshot(tournamentId, options);
      } catch (error) {
        console.error('Failed:', error);
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

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
  process.exit(1);
});

main().catch((error) => {
  console.error('Script failed:', error);
  process.exit(1);
});

