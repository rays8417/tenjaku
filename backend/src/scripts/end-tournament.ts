#!/usr/bin/env ts-node

import { PrismaClient, TournamentStatus } from '@prisma/client';
import { Command } from 'commander';
import { createContractSnapshot, createSnapshotSummary } from '../services/contractSnapshotService';

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
        contractType: 'POST_MATCH'
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
 * Complete workflow: Take post-match snapshot and end tournament
 */
async function endTournamentWithSnapshot(tournamentId: string) {
  try {
    console.log(`\n🏁 ENDING TOURNAMENT WITH POST-MATCH SNAPSHOT`);
    console.log('============================================');
    console.log(`Tournament ID: ${tournamentId}\n`);

    // Step 1: Take post-match snapshot
    console.log('📸 STEP 1: TAKING POST-MATCH SNAPSHOT');
    console.log('=====================================');
    const snapshot = await takePostMatchSnapshot(tournamentId);

    // Step 2: End tournament
    console.log('\n🏁 STEP 2: ENDING TOURNAMENT');
    console.log('============================');
    const endedTournament = await endTournament(tournamentId);

    // Step 3: Summary
    console.log('\n🎉 TOURNAMENT ENDED SUCCESSFULLY!');
    console.log('=================================');
    console.log(`Tournament ID: ${tournamentId}`);
    console.log(`Tournament Name: ${endedTournament.name}`);
    console.log(`Teams: ${endedTournament.team1} vs ${endedTournament.team2}`);
    console.log(`Status: ${endedTournament.status}`);
    console.log(`Ended at: ${endedTournament.updatedAt.toISOString()}`);
    
    if (snapshot) {
      console.log(`Post-Match Snapshot: ${snapshot.snapshotId}`);
      console.log(`Snapshot Block: ${snapshot.blockNumber}`);
    }

    console.log('\n✅ All Steps Completed:');
    console.log('   ✅ Post-match snapshot taken');
    console.log('   ✅ Tournament status updated to COMPLETED');
    console.log('   ✅ Tournament ended successfully\n');

    return {
      tournament: endedTournament,
      snapshot: snapshot
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
    .description('Take post-match snapshot and end tournament')
    .argument('<tournament-id>', 'Tournament ID to end')
    .action(async (tournamentId: string) => {
      try {
        await endTournamentWithSnapshot(tournamentId);
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
  getTournamentDetails
};
