#!/usr/bin/env ts-node

import { TournamentStatus } from '@prisma/client';
import { prisma } from '../prisma';

/**
 * Create Upcoming Tournament Script
 * Creates a tournament with UPCOMING status (no snapshot until match starts)
 */

interface TournamentData {
  name: string;
  description?: string;
  matchDate: Date;
  team1: string;
  team2: string;
  venue?: string;
  entryFee: number;
  matchId: string;
  rewardPoolAmount: number;
}

/**
 * Create an upcoming tournament with reward pool
 */
async function createUpcomingTournament(tournamentData: TournamentData) {
  console.log('\n🏏 Creating Upcoming Tournament');
  console.log('================================\n');
  console.log(`Name: ${tournamentData.name}`);
  console.log(`Teams: ${tournamentData.team1} vs ${tournamentData.team2}`);
  console.log(`Venue: ${tournamentData.venue}`);
  console.log(`Match Date: ${tournamentData.matchDate.toISOString()}`);
  console.log(`Match ID: ${tournamentData.matchId}`);
  console.log(`Reward Pool: ${tournamentData.rewardPoolAmount} BOSON`);
  console.log('');

  // Create tournament
  console.log('📝 Creating tournament...');
  const tournament = await prisma.tournament.create({
    data: {
      name: tournamentData.name,
      description: tournamentData.description,
      matchDate: tournamentData.matchDate,
      team1: tournamentData.team1,
      team2: tournamentData.team2,
      venue: tournamentData.venue,
      status: TournamentStatus.UPCOMING,
      entryFee: tournamentData.entryFee,
      matchId: tournamentData.matchId,
      currentParticipants: 0,
      maxParticipants: null
    }
  });

  console.log(`✅ Tournament created!`);
  console.log(`   ID: ${tournament.id}`);
  console.log(`   Status: ${tournament.status}\n`);

  // Create reward pool
  if (tournamentData.rewardPoolAmount > 0) {
    console.log('💰 Creating reward pool...');
    const rewardPool = await prisma.rewardPool.create({
      data: {
        tournamentId: tournament.id,
        name: `${tournament.name} - Prize Pool`,
        totalAmount: tournamentData.rewardPoolAmount,
        distributedAmount: 0,
        distributionType: 'PERCENTAGE',
        distributionRules: {
          type: 'snapshot_based',
          description: 'Rewards distributed based on holdings and performance'
        }
      }
    });

    console.log(`✅ Reward pool created: ${rewardPool.totalAmount} BOSON\n`);
  }

  console.log('🎯 Next Steps:');
  console.log('   1. When match starts → Update tournament status to ONGOING');
  console.log('   2. Take pre-match snapshot');
  console.log('   3. After match ends → Use end:with-snapshot command\n');
  console.log(`Tournament ID: ${tournament.id}`);

  return tournament;
}

// Sample data (customize as needed)
const sampleTournament: TournamentData = {
  name: "Australia vs England - Ashes 2025",
  description: "Test match series",
  matchDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
  team1: "Australia",
  team2: "England",
  venue: "Melbourne Cricket Ground",
  entryFee: 0,
  matchId: "999999", // Replace with actual Cricbuzz match ID
  rewardPoolAmount: 100
};

// Run script
createUpcomingTournament(sampleTournament)
  .then(() => {
    console.log('✅ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
