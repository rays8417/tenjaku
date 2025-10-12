#!/usr/bin/env ts-node

import { TournamentStatus } from '@prisma/client';
import { Command } from 'commander';
import { prisma } from '../prisma';
import { createContractSnapshot, createSnapshotSummary } from '../services/contractSnapshotService';

/**
 * Tournament Management Script
 * Simplified version with only create-sample and list commands
 */

interface TournamentData {
  name: string;
  description?: string;
  matchDate: Date;
  team1: string;
  team2: string;
  venue?: string;
  status: TournamentStatus;
  entryFee: number;
  maxParticipants?: number;
  matchId?: number;
  rewardPoolAmount?: number;
}

// Sample tournament data
const sampleTournaments: TournamentData[] = [
  {
    name: "India vs Pakistan - Asia Cup 2025",
    description: "Final match between India and Pakistan",
    matchDate: new Date("2025-09-28T19:30:00.000Z"),
    team1: "India",
    team2: "Pakistan", 
    venue: "Dubai International Cricket Stadium",
    entryFee: 0,
    status: TournamentStatus.ONGOING,
    matchId: 130179,
    rewardPoolAmount: 100 // 100 BOSON tokens reward pool
  }
];

/**
 * Create a tournament with optional snapshot
 */
async function createTournament(tournamentData: TournamentData, createSnapshot: boolean = true) {
  console.log(`Creating tournament: ${tournamentData.name}`);
  
  const tournament = await prisma.tournament.create({
    data: {
      name: tournamentData.name,
      description: tournamentData.description,
      matchDate: tournamentData.matchDate,
      team1: tournamentData.team1,
      team2: tournamentData.team2,
      venue: tournamentData.venue,
      status: tournamentData.status,
      entryFee: tournamentData.entryFee,
      maxParticipants: tournamentData.maxParticipants,
      matchId: tournamentData.matchId?.toString(),
      currentParticipants: 0
    }
  });

  console.log(`✅ Tournament created successfully!`);
  console.log(`   ID: ${tournament.id}`);
  console.log(`   Name: ${tournament.name}`);
  console.log(`   Status: ${tournament.status}`);
  console.log(`   Teams: ${tournament.team1} vs ${tournament.team2}`);
  console.log(`   Match Date: ${tournament.matchDate.toISOString()}`);
  console.log('');

  // Create reward pool if specified
  if (tournamentData.rewardPoolAmount && tournamentData.rewardPoolAmount > 0) {
    try {
      console.log(`💰 Creating reward pool...`);
      const rewardPool = await prisma.rewardPool.create({
        data: {
          tournamentId: tournament.id,
          name: `${tournament.name} - Prize Pool`,
          totalAmount: tournamentData.rewardPoolAmount,
          distributedAmount: 0,
          distributionType: 'PERCENTAGE',
          distributionRules: {
            type: 'snapshot_based',
            description: 'Rewards distributed based on player token holdings and fantasy scores',
          }
        }
      });
      console.log(`✅ Reward pool created: ${rewardPool.totalAmount} BOSON\n`);
    } catch (rewardPoolError) {
      console.error(`⚠️  Warning: Failed to create reward pool`);
      console.error(rewardPoolError);
    }
  }

  // Create pre-match snapshot if requested
  if (createSnapshot) {
    try {
      console.log(`📸 Creating pre-match snapshot...`);
      const snapshot = await createContractSnapshot(tournament.id, 'PRE_MATCH');
      console.log(`✅ Pre-match snapshot created!`);
      console.log(`   Snapshot ID: ${snapshot.snapshotId}`);
      console.log(`   Total Holders: ${snapshot.totalHolders}`);
      console.log(`   Unique Addresses: ${snapshot.uniqueAddresses}`);
      
      // Display snapshot summary
      const snapshotData = await prisma.contractSnapshot.findUnique({
        where: { id: snapshot.snapshotId }
      });
      if (snapshotData) {
        console.log('\n' + createSnapshotSummary(snapshotData.data as any));
      }
      console.log('');
    } catch (snapshotError) {
      console.error(`⚠️  Warning: Failed to create pre-match snapshot`);
      console.error(snapshotError);
    }
  }

  return tournament;
}

/**
 * Create sample tournaments
 */
async function createSampleTournaments() {
  console.log('\n🏏 Creating Sample Tournaments');
  console.log('==============================\n');

  for (const tournamentData of sampleTournaments) {
    await createTournament(tournamentData, true);
  }

  console.log(`✅ Created ${sampleTournaments.length} sample tournament(s)!`);
}

/**
 * List all tournaments
 */
async function listTournaments() {
  console.log('\n📋 Current Tournaments');
  console.log('======================\n');

  const tournaments = await prisma.tournament.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: {
      rewardPools: true
    }
  });

  if (tournaments.length === 0) {
    console.log('No tournaments found.');
    return;
  }

  tournaments.forEach((tournament, index) => {
    console.log(`${index + 1}. ${tournament.name}`);
    console.log(`   ID: ${tournament.id}`);
    console.log(`   Status: ${tournament.status}`);
    console.log(`   Teams: ${tournament.team1} vs ${tournament.team2}`);
    console.log(`   Date: ${tournament.matchDate.toISOString()}`);
    console.log(`   Entry Fee: ${tournament.entryFee} BOSON`);
    console.log(`   Participants: ${tournament.currentParticipants}/${tournament.maxParticipants || '∞'}`);
    
    if (tournament.rewardPools.length > 0) {
      const totalRewardPool = tournament.rewardPools.reduce((sum, pool) => sum + Number(pool.totalAmount), 0);
      console.log(`   💰 Reward Pool: ${totalRewardPool} BOSON`);
    }
    
    console.log('');
  });
}

// Main CLI setup
async function main() {
  const program = new Command();

  program
    .name('tournament')
    .description('Tournament management script')
    .version('1.0.0');

  program
    .command('create-sample')
    .description('Create sample tournament with ONGOING status and pre-match snapshot')
    .action(async () => {
      try {
        await createSampleTournaments();
      } catch (error) {
        console.error('Failed to create sample tournaments:', error);
        process.exit(1);
      } finally {
        await prisma.$disconnect();
      }
    });

  program
    .command('list')
    .description('List all tournaments')
    .action(async () => {
      try {
        await listTournaments();
      } catch (error) {
        console.error('Failed to list tournaments:', error);
        process.exit(1);
      } finally {
        await prisma.$disconnect();
      }
    });

  // Show help if no command provided
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

// Run main
main().catch((error) => {
  console.error('Script failed:', error);
  process.exit(1);
});
