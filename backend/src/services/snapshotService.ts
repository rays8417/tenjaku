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
        // If we have playerId from Aptos data, use that specific player
        if (aptosHolder.playerId) {
          const playerHolding = dbUser.holdings.find(h => h.player.id === aptosHolder.playerId);
          if (playerHolding) {
            mappedData.push({
              userId: dbUser.id,
              walletAddress: dbUser.walletAddress,
              displayName: dbUser.displayName,
              playerId: playerHolding.player.id,
              playerName: playerHolding.player.name,
              playerTeam: playerHolding.player.team,
              playerRole: playerHolding.player.role,
              tokenAmount: aptosHolder.balance, // Use Aptos balance instead of database balance
              avgBuyPrice: Number(playerHolding.avgBuyPrice),
              totalInvested: Number(playerHolding.totalInvested),
              currentPrice: Number(playerHolding.player.tokenPrice),
              currentValue: Number(playerHolding.player.tokenPrice) * Number(aptosHolder.balance),
              source: 'aptos_contract'
            });
          }
        } else {
          // No specific player ID, use all holdings for this user
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

/**
 * Compare pre-match and post-match snapshots
 * This is specifically designed for tournament reward calculations
 */
export async function comparePrePostMatchSnapshots(tournamentId: string) {
  try {
    console.log(`Comparing pre/post match snapshots for tournament ${tournamentId}...`);
    
    // Get snapshots for this tournament
    const snapshots = await prisma.contractSnapshot.findMany({
      where: {
        data: {
          path: ['tournamentId'],
          equals: tournamentId
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    if (snapshots.length < 2) {
      throw new Error('Insufficient snapshots for comparison');
    }

    const preMatchSnapshot = snapshots.find(s => (s.data as any)?.snapshotType === 'PRE_MATCH');
    const postMatchSnapshot = snapshots.find(s => (s.data as any)?.snapshotType === 'POST_MATCH');

    if (!preMatchSnapshot || !postMatchSnapshot) {
      throw new Error('Both pre-match and post-match snapshots are required');
    }

    const preData = preMatchSnapshot.data as any;
    const postData = postMatchSnapshot.data as any;

    // Create maps for efficient comparison
    const preHoldings = new Map(
      preData.allHoldings?.map((h: any) => [`${h.userId}-${h.playerId}`, h]) || []
    );
    const postHoldings = new Map(
      postData.allHoldings?.map((h: any) => [`${h.userId}-${h.playerId}`, h]) || []
    );

    const comparison = {
      tournamentId,
      preMatchSnapshotId: preMatchSnapshot.id,
      postMatchSnapshotId: postMatchSnapshot.id,
      preMatchBlock: preData.blockNumber,
      postMatchBlock: postData.blockNumber,
      timeSpan: new Date(postData.timestamp).getTime() - new Date(preData.timestamp).getTime(),
      
      summary: {
        totalUsers: new Set([...preData.allHoldings, ...postData.allHoldings].map((h: any) => h.userId)).size,
        preMatchHoldings: preData.allHoldings?.length || 0,
        postMatchHoldings: postData.allHoldings?.length || 0,
        newHoldings: 0,
        removedHoldings: 0,
        changedHoldings: 0,
        unchangedHoldings: 0
      },
      
      userChanges: [] as any[],
      playerChanges: new Map(),
      rewardEligibility: [] as any[]
    };

    // Track all unique users for reward eligibility
    const allUserIds = new Set([
      ...(preData.allHoldings || []).map((h: any) => h.userId),
      ...(postData.allHoldings || []).map((h: any) => h.userId)
    ]);

    // Analyze changes for each user
    for (const userId of allUserIds) {
      const userPreHoldings = (preData.allHoldings || []).filter((h: any) => h.userId === userId);
      const userPostHoldings = (postData.allHoldings || []).filter((h: any) => h.userId === userId);
      
      const userChange = {
        userId,
        walletAddress: userPreHoldings[0]?.walletAddress || userPostHoldings[0]?.walletAddress,
        displayName: userPreHoldings[0]?.displayName || userPostHoldings[0]?.displayName,
        
        preMatch: {
          totalHoldings: userPreHoldings.length,
          totalValue: userPreHoldings.reduce((sum: number, h: any) => sum + h.currentValue, 0),
          totalTokens: userPreHoldings.reduce((sum: number, h: any) => sum + Number(h.tokenAmount), 0),
          holdings: userPreHoldings
        },
        
        postMatch: {
          totalHoldings: userPostHoldings.length,
          totalValue: userPostHoldings.reduce((sum: number, h: any) => sum + h.currentValue, 0),
          totalTokens: userPostHoldings.reduce((sum: number, h: any) => sum + Number(h.tokenAmount), 0),
          holdings: userPostHoldings
        },
        
        changes: {
          valueChange: 0,
          tokenChange: 0,
          holdingsChange: 0,
          tradingActivity: 0 // Percentage of portfolio changed
        },
        
        eligibility: {
          isEligible: false,
          reasons: [] as string[],
          maintainedHoldings: 0,
          minimumHoldingMet: false
        }
      };

      // Calculate changes
      userChange.changes.valueChange = userChange.postMatch.totalValue - userChange.preMatch.totalValue;
      userChange.changes.tokenChange = userChange.postMatch.totalTokens - userChange.preMatch.totalTokens;
      userChange.changes.holdingsChange = userChange.postMatch.totalHoldings - userChange.preMatch.totalHoldings;
      
      // Calculate trading activity (percentage of portfolio that changed)
      if (userChange.preMatch.totalValue > 0) {
        userChange.changes.tradingActivity = Math.abs(userChange.changes.valueChange) / userChange.preMatch.totalValue;
      }

      // Determine reward eligibility
      const minimumHoldingValue = 100; // Minimum APT value required
      const maxTradingThreshold = 0.5; // 50% max portfolio change allowed
      
      // Check if user had holdings before match
      if (userChange.preMatch.totalHoldings === 0) {
        userChange.eligibility.reasons.push('No holdings before match');
      } else {
        userChange.eligibility.isEligible = true;
        
        // Check minimum holding requirement
        if (userChange.preMatch.totalValue >= minimumHoldingValue) {
          userChange.eligibility.minimumHoldingMet = true;
        } else {
          userChange.eligibility.reasons.push(`Insufficient pre-match holdings (${userChange.preMatch.totalValue} < ${minimumHoldingValue})`);
          userChange.eligibility.isEligible = false;
        }
        
        // Check for excessive trading
        if (userChange.changes.tradingActivity > maxTradingThreshold) {
          userChange.eligibility.reasons.push(`Excessive trading activity (${(userChange.changes.tradingActivity * 100).toFixed(1)}% portfolio change)`);
          userChange.eligibility.isEligible = false;
        }
        
        // Count maintained holdings (same or increased)
        const maintainedCount = userPreHoldings.filter((preH: any) => {
          const postH = userPostHoldings.find((ph: any) => 
            ph.playerId === preH.playerId && Number(ph.tokenAmount) >= Number(preH.tokenAmount)
          );
          return !!postH;
        }).length;
        
        userChange.eligibility.maintainedHoldings = maintainedCount;
      }

      comparison.userChanges.push(userChange);
      
      // Track player-specific changes
      for (const holding of [...userPreHoldings, ...userPostHoldings]) {
        const playerId = holding.playerId;
        if (!comparison.playerChanges.has(playerId)) {
          comparison.playerChanges.set(playerId, {
            playerId,
            playerName: holding.playerName,
            playerTeam: holding.playerTeam,
            totalPreHolders: 0,
            totalPostHolders: 0,
            netChange: 0
          });
        }
        
        const playerChange = comparison.playerChanges.get(playerId);
        if (userPreHoldings.some((h: any) => h.playerId === playerId)) {
          playerChange.totalPreHolders++;
        }
        if (userPostHoldings.some((h: any) => h.playerId === playerId)) {
          playerChange.totalPostHolders++;
        }
        playerChange.netChange = playerChange.totalPostHolders - playerChange.totalPreHolders;
      }
      
      // Add to reward eligibility list
      if (userChange.eligibility.isEligible) {
        comparison.rewardEligibility.push({
          userId: userChange.userId,
          walletAddress: userChange.walletAddress,
          displayName: userChange.displayName,
          preMatchValue: userChange.preMatch.totalValue,
          postMatchValue: userChange.postMatch.totalValue,
          maintainedHoldings: userChange.eligibility.maintainedHoldings,
          rewardMultiplier: calculateRewardMultiplier(userChange)
        });
      }
    }

    // Update summary
    comparison.summary.newHoldings = comparison.userChanges.filter(u => u.changes.holdingsChange > 0).length;
    comparison.summary.removedHoldings = comparison.userChanges.filter(u => u.changes.holdingsChange < 0).length;
    comparison.summary.changedHoldings = comparison.userChanges.filter(u => u.changes.tradingActivity > 0).length;
    comparison.summary.unchangedHoldings = comparison.userChanges.filter(u => u.changes.tradingActivity === 0).length;

    console.log(`Comparison completed: ${comparison.rewardEligibility.length} users eligible for rewards`);
    
    return comparison;
  } catch (error) {
    console.error('Error comparing pre/post match snapshots:', error);
    throw new Error(`Failed to compare pre/post match snapshots: ${error}`);
  }
}

/**
 * Calculate reward multiplier based on user's holding behavior
 */
function calculateRewardMultiplier(userChange: any): number {
  let multiplier = 1.0;
  
  // Bonus for maintaining all holdings
  if (userChange.eligibility.maintainedHoldings === userChange.preMatch.totalHoldings) {
    multiplier += 0.2; // 20% bonus
  }
  
  // Penalty for excessive trading
  if (userChange.changes.tradingActivity > 0.3) {
    multiplier -= 0.1; // 10% penalty
  }
  
  // Bonus for holding throughout entire match
  if (userChange.changes.valueChange >= 0) {
    multiplier += 0.1; // 10% bonus for not selling
  }
  
  return Math.max(0.5, Math.min(2.0, multiplier)); // Cap between 0.5x and 2.0x
}
