#!/usr/bin/env ts-node

import { PrismaClient, TournamentStatus } from '@prisma/client';

const prisma = new PrismaClient();

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
 * Create an upcoming tournament with reward pool (no snapshot)
 */
async function createUpcomingTournament(tournamentData: TournamentData) {
  try {
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

    console.log(`✅ Tournament created successfully!`);
    console.log(`   ID: ${tournament.id}`);
    console.log(`   Name: ${tournament.name}`);
    console.log(`   Status: ${tournament.status}`);
    console.log(`   Teams: ${tournament.team1} vs ${tournament.team2}`);
    console.log(`   Match Date: ${tournament.matchDate.toISOString()}`);
    console.log(`   Match ID: ${tournament.matchId}`);
    console.log('');

    // Create reward pool
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
          description: 'Rewards distributed based on player token holdings and fantasy scores',
          createdAt: new Date().toISOString()
        }
      }
    });

    console.log(`✅ Reward pool created successfully!`);
    console.log(`   Pool ID: ${rewardPool.id}`);
    console.log(`   Total Amount: ${rewardPool.totalAmount} BOSON`);
    console.log(`   Distribution Type: ${rewardPool.distributionType}`);
    console.log('');

    console.log('🎉 Tournament setup complete!');
    console.log(`   Tournament ID: ${tournament.id}`);
    console.log(`   Ready for players to join`);
    console.log('');

    return tournament;

  } catch (error) {
    console.error('❌ Error creating tournament:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Tournament data from the user
const tournamentData: TournamentData = {
  name: "India vs West Indies - Test",
  description: "West Indies tour of India, 2025",
  matchDate: new Date("2025-10-10T04:00:00.000Z"),
  team1: "India",
  team2: "West Indies",
  venue: "Arun Jaitley Stadium",
  entryFee: 0,
  matchId: "117362",
  rewardPoolAmount: 50000 // 50000 BOSON tokens reward pool
};

// Run the script
if (require.main === module) {
  createUpcomingTournament(tournamentData)
    .then(() => {
      console.log('✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

export { createUpcomingTournament };

