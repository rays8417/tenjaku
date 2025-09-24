import { PrismaClient } from '@prisma/client';
import { getTokenHoldersWithBalances, getCurrentBlockNumber, TokenHolderBalance } from './aptosService';

const prisma = new PrismaClient();

export interface UserSnapshotData {
  userId: string;
  walletAddress: string;
  displayName: string | null;
  playerId: string;
  playerName: string;
  playerTeam: string;
  playerRole: string;
  tokenAmount: bigint;
  avgBuyPrice: number;
  totalInvested: number;
  currentPrice: number;
  currentValue: number;
  source: 'database' | 'aptos_contract'; // Track data source
}

export interface SnapshotCreationResult {
  snapshotId: string;
  tournamentId: string;
  snapshotType: string;
  blockNumber: string;
  contractAddress: string;
  timestamp: string;
  totalUsers: number;
  totalHoldings: number;
  aptosHolders: number;
  databaseHoldings: number;
  mergedHoldings: number;
}

/**
 * Map Aptos token holders to database users
 * This function finds users in the database that match the Aptos wallet addresses
 */
export async function mapAptosHoldersToUsers(aptosHolders: TokenHolderBalance[]) {
  try {
    console.log(`Mapping ${aptosHolders.length} Aptos holders to database users...`);
    
    const walletAddresses = aptosHolders.map(holder => holder.address);
    
    // Find users in database with matching wallet addresses
    const dbUsers = await prisma.user.findMany({
      where: {
        walletAddress: {
          in: walletAddresses
        }
      },
      include: {
        holdings: {
          include: {
            player: {
              select: {
                id: true,
                name: true,
                team: true,
                role: true,
                tokenPrice: true,
                aptosTokenAddress: true
              }
            }
          }
        }
      }
    });

    console.log(`Found ${dbUsers.length} matching users in database`);
    
    // Create mapping of wallet address to user
    const walletToUser = new Map(
      dbUsers.map(user => [user.walletAddress, user])
    );

    const mappedData: UserSnapshotData[] = [];
    
    // Process each Aptos holder
    for (const aptosHolder of aptosHolders) {
      const dbUser = walletToUser.get(aptosHolder.address);
      
      if (dbUser) {
        // User exists in database - use their holdings data
        for (const holding of dbUser.holdings) {
          mappedData.push({
            userId: dbUser.id,
            walletAddress: dbUser.walletAddress,
            displayName: dbUser.displayName,
            playerId: holding.player.id,
            playerName: holding.player.name,
            playerTeam: holding.player.team,
            playerRole: holding.player.role,
            tokenAmount: holding.tokenAmount,
            avgBuyPrice: Number(holding.avgBuyPrice),
            totalInvested: Number(holding.totalInvested),
            currentPrice: Number(holding.player.tokenPrice),
            currentValue: Number(holding.player.tokenPrice) * Number(holding.tokenAmount),
            source: 'database'
          });
        }
      } else {
        // User not in database - this could be a new holder or external holder
        console.log(`Aptos holder ${aptosHolder.address} not found in database`);
        
        // For now, we'll skip users not in our database
        // In the future, you might want to create new user records
        // or handle external holders differently
      }
    }

    return mappedData;
  } catch (error) {
    console.error('Error mapping Aptos holders to users:', error);
    throw new Error(`Failed to map Aptos holders to users: ${error}`);
  }
}

/**
 * Get database holdings for comparison with Aptos data
 */
export async function getDatabaseHoldings() {
  try {
    const userHoldings = await prisma.userHolding.findMany({
      include: {
        user: {
          select: {
            id: true,
            walletAddress: true,
            displayName: true
          }
        },
        player: {
          select: {
            id: true,
            name: true,
            team: true,
            role: true,
            tokenPrice: true
          }
        }
      }
    });

    const mappedData: UserSnapshotData[] = userHoldings.map(holding => ({
      userId: holding.user.id,
      walletAddress: holding.user.walletAddress,
      displayName: holding.user.displayName,
      playerId: holding.player.id,
      playerName: holding.player.name,
      playerTeam: holding.player.team,
      playerRole: holding.player.role,
      tokenAmount: holding.tokenAmount,
      avgBuyPrice: Number(holding.avgBuyPrice),
      totalInvested: Number(holding.totalInvested),
      currentPrice: Number(holding.player.tokenPrice),
      currentValue: Number(holding.player.tokenPrice) * Number(holding.tokenAmount),
      source: 'database'
    }));

    return mappedData;
  } catch (error) {
    console.error('Error fetching database holdings:', error);
    throw new Error(`Failed to fetch database holdings: ${error}`);
  }
}

/**
 * Create a comprehensive snapshot that combines Aptos contract data with database data
 */
export async function createComprehensiveSnapshot(
  tournamentId: string,
  snapshotType: 'PRE_MATCH' | 'POST_MATCH',
  contractAddress?: string
): Promise<SnapshotCreationResult> {
  try {
    console.log(`Creating ${snapshotType} snapshot for tournament ${tournamentId}...`);
    
    // Validate tournament exists
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId }
    });

    if (!tournament) {
      throw new Error('Tournament not found');
    }

    // Step 1: Get Aptos contract data
    console.log('Fetching data from Aptos contract...');
    const aptosHolders = await getTokenHoldersWithBalances();
    const currentBlockNumber = await getCurrentBlockNumber();

    // Step 2: Map Aptos holders to database users
    const aptosMappedData = await mapAptosHoldersToUsers(aptosHolders);

    // Step 3: Get database holdings for comparison
    console.log('Fetching database holdings...');
    const databaseHoldings = await getDatabaseHoldings();

    // Step 4: Create comprehensive snapshot data
    const snapshotData = {
      tournamentId,
      snapshotType,
      timestamp: new Date().toISOString(),
      blockNumber: currentBlockNumber.toString(),
      contractAddress: contractAddress || process.env.APTOS_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000',
      
      // Statistics
      totalUsers: new Set([...aptosMappedData, ...databaseHoldings].map(h => h.userId)).size,
      totalHoldings: aptosMappedData.length + databaseHoldings.length,
      aptosHolders: aptosHolders.length,
      databaseHoldings: databaseHoldings.length,
      mergedHoldings: aptosMappedData.length,
      
      // Data sources
      aptosData: {
        holders: aptosHolders,
        mappedHoldings: aptosMappedData
      },
      databaseData: {
        holdings: databaseHoldings
      },
      
      // Combined holdings for easy access
      allHoldings: [...aptosMappedData, ...databaseHoldings]
    };

    // Step 5: Store snapshot in database
    const snapshot = await prisma.contractSnapshot.create({
      data: {
        contractType: 'AMM_CONTRACT',
        contractAddress: snapshotData.contractAddress,
        blockNumber: currentBlockNumber,
        data: snapshotData as any // Type assertion for Prisma JSON field
      }
    });

    console.log(`Snapshot created successfully: ${snapshot.id}`);

    return {
      snapshotId: snapshot.id,
      tournamentId,
      snapshotType,
      blockNumber: currentBlockNumber.toString(),
      contractAddress: snapshotData.contractAddress,
      timestamp: snapshotData.timestamp,
      totalUsers: snapshotData.totalUsers,
      totalHoldings: snapshotData.totalHoldings,
      aptosHolders: snapshotData.aptosHolders,
      databaseHoldings: snapshotData.databaseHoldings,
      mergedHoldings: snapshotData.mergedHoldings
    };

  } catch (error) {
    console.error('Error creating comprehensive snapshot:', error);
    throw new Error(`Failed to create comprehensive snapshot: ${error}`);
  }
}

/**
 * Compare Aptos contract data with database holdings
 * This helps identify discrepancies and sync issues
 */
export async function compareAptosWithDatabase(aptosHolders: TokenHolderBalance[]) {
  try {
    console.log('Comparing Aptos contract data with database...');
    
    const databaseHoldings = await getDatabaseHoldings();
    
    // Group database holdings by wallet address
    const dbHoldingsByWallet = new Map<string, UserSnapshotData[]>();
    databaseHoldings.forEach(holding => {
      const existing = dbHoldingsByWallet.get(holding.walletAddress) || [];
      existing.push(holding);
      dbHoldingsByWallet.set(holding.walletAddress, existing);
    });

    const comparison = {
      aptosOnlyHolders: [] as TokenHolderBalance[],
      databaseOnlyHolders: [] as UserSnapshotData[],
      matchingHolders: [] as { aptos: TokenHolderBalance; database: UserSnapshotData[] }[],
      discrepancies: [] as any[]
    };

    // Check each Aptos holder
    for (const aptosHolder of aptosHolders) {
      const dbHoldings = dbHoldingsByWallet.get(aptosHolder.address);
      
      if (!dbHoldings) {
        comparison.aptosOnlyHolders.push(aptosHolder);
      } else {
        comparison.matchingHolders.push({
          aptos: aptosHolder,
          database: dbHoldings
        });
        
        // Check for balance discrepancies
        const totalDbTokens = dbHoldings.reduce((sum, h) => sum + Number(h.tokenAmount), 0);
        const aptosTokens = Number(aptosHolder.balance);
        
        if (Math.abs(totalDbTokens - aptosTokens) > 0) {
          comparison.discrepancies.push({
            address: aptosHolder.address,
            aptosBalance: aptosTokens,
            databaseTotal: totalDbTokens,
            difference: aptosTokens - totalDbTokens
          });
        }
      }
    }

    // Find database-only holders
    const aptosAddresses = new Set(aptosHolders.map(h => h.address));
    databaseHoldings.forEach(holding => {
      if (!aptosAddresses.has(holding.walletAddress)) {
        comparison.databaseOnlyHolders.push(holding);
      }
    });

    return comparison;
  } catch (error) {
    console.error('Error comparing Aptos with database:', error);
    throw new Error(`Failed to compare Aptos with database: ${error}`);
  }
}
