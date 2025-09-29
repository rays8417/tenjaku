import { PrismaClient } from '@prisma/client';
import { getTokenHoldersWithBalances, getCurrentBlockNumber, TokenHolderBalance } from './aptosService';

const prisma = new PrismaClient();

// New simplified interfaces for contract-only approach
export interface ContractHolder {
  address: string;
  holdings: {
    moduleName: string;
    balance: string;
    playerId?: string;
  }[];
}

export interface ContractSnapshotData {
  tournamentId: string;
  snapshotType: 'PRE_MATCH' | 'POST_MATCH';
  timestamp: string;
  blockNumber: string;
  contractAddress: string;
  
  // Pure contract data
  holders: ContractHolder[];
  
  // Computed statistics
  totalHolders: number;
  totalTokens: string;
  uniqueAddresses: number;
}

export interface ContractSnapshotResult {
  snapshotId: string;
  tournamentId: string;
  snapshotType: string;
  blockNumber: string;
  contractAddress: string;
  timestamp: string;
  totalHolders: number;
  totalTokens: string;
  uniqueAddresses: number;
}

/**
 * Group token holders by address
 * This creates a clean structure where each address has all their holdings
 */
function groupHoldersByAddress(aptosHolders: TokenHolderBalance[]): ContractHolder[] {
  console.log(`[DEBUG] Grouping ${aptosHolders.length} holders by address...`);
  
  const holdersMap = new Map<string, ContractHolder>();
  
  for (const holder of aptosHolders) {
    const address = holder.address;
    
    if (!holdersMap.has(address)) {
      holdersMap.set(address, {
        address,
        holdings: []
      });
    }
    
    holdersMap.get(address)!.holdings.push({
      moduleName: holder.moduleName || 'Unknown',
      balance: holder.balance.toString(),
      playerId: holder.playerId
    });
  }
  
  const groupedHolders = Array.from(holdersMap.values());
  console.log(`[DEBUG] Grouped into ${groupedHolders.length} unique addresses`);
  
  return groupedHolders;
}

/**
 * Calculate statistics from grouped holders
 */
function calculateStatistics(holders: ContractHolder[]): {
  totalHolders: number;
  totalTokens: string;
  uniqueAddresses: number;
} {
  const totalHolders = holders.reduce((sum, holder) => sum + holder.holdings.length, 0);
  const totalTokens = holders.reduce((sum, holder) => {
    return sum + holder.holdings.reduce((holderSum, holding) => {
      return holderSum + BigInt(holding.balance);
    }, BigInt(0));
  }, BigInt(0)).toString();
  const uniqueAddresses = holders.length;
  
  return {
    totalHolders,
    totalTokens,
    uniqueAddresses
  };
}

/**
 * Create a contract-only snapshot
 * This is the simplified approach that uses only Aptos contract data
 */
export async function createContractSnapshot(
  tournamentId: string,
  snapshotType: 'PRE_MATCH' | 'POST_MATCH',
  contractAddress?: string
): Promise<ContractSnapshotResult> {
  try {
    console.log(`[CONTRACT_SNAPSHOT] Creating ${snapshotType} snapshot for tournament ${tournamentId}...`);
    
    // Validate tournament exists
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId }
    });

    if (!tournament) {
      throw new Error('Tournament not found');
    }

    // Step 1: Get Aptos contract data
    console.log('[CONTRACT_SNAPSHOT] Fetching data from Aptos contract...');
    const aptosHolders = await getTokenHoldersWithBalances();
    const currentBlockNumber = await getCurrentBlockNumber();

    console.log(`[CONTRACT_SNAPSHOT] Found ${aptosHolders.length} token holders from contract`);

    // Step 2: Group holders by address
    console.log('[CONTRACT_SNAPSHOT] Grouping holders by address...');
    const groupedHolders = groupHoldersByAddress(aptosHolders);

    // Step 3: Calculate statistics
    const statistics = calculateStatistics(groupedHolders);

    // Step 4: Create snapshot data
    const snapshotData: ContractSnapshotData = {
      tournamentId,
      snapshotType,
      timestamp: new Date().toISOString(),
      blockNumber: currentBlockNumber.toString(),
      contractAddress: contractAddress || process.env.APTOS_CONTRACT_ADDRESS || '0xaf230e3024e92da6a3a15f5a6a3f201c886891268717bf8a21157bb73a1c027b',
      
      // Pure contract data
      holders: groupedHolders,
      
      // Computed statistics
      totalHolders: statistics.totalHolders,
      totalTokens: statistics.totalTokens,
      uniqueAddresses: statistics.uniqueAddresses
    };

    console.log(`[CONTRACT_SNAPSHOT] Snapshot data created:`, {
      totalHolders: statistics.totalHolders,
      totalTokens: statistics.totalTokens,
      uniqueAddresses: statistics.uniqueAddresses
    });

    // Step 5: Store snapshot in database
    const snapshot = await prisma.contractSnapshot.create({
      data: {
        contractType: 'AMM_CONTRACT',
        contractAddress: snapshotData.contractAddress,
        blockNumber: currentBlockNumber,
        data: snapshotData as any // Type assertion for Prisma JSON field
      }
    });

    console.log(`[CONTRACT_SNAPSHOT] Snapshot created successfully: ${snapshot.id}`);

    return {
      snapshotId: snapshot.id,
      tournamentId,
      snapshotType,
      blockNumber: currentBlockNumber.toString(),
      contractAddress: snapshotData.contractAddress,
      timestamp: snapshotData.timestamp,
      totalHolders: statistics.totalHolders,
      totalTokens: statistics.totalTokens,
      uniqueAddresses: statistics.uniqueAddresses
    };

  } catch (error) {
    console.error('[CONTRACT_SNAPSHOT] Error creating contract snapshot:', error);
    throw new Error(`Failed to create contract snapshot: ${error}`);
  }
}

/**
 * Get snapshot by tournament and type
 */
export async function getContractSnapshot(
  tournamentId: string,
  snapshotType: 'PRE_MATCH' | 'POST_MATCH'
): Promise<ContractSnapshotData | null> {
  try {
    const snapshot = await prisma.contractSnapshot.findFirst({
      where: {
        data: {
          path: ['tournamentId'],
          equals: tournamentId
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!snapshot) {
      return null;
    }

    const snapshotData = snapshot.data as any;
    
    // Filter by snapshot type if specified
    if (snapshotData.snapshotType !== snapshotType) {
      return null;
    }

    return snapshotData as unknown as ContractSnapshotData;
  } catch (error) {
    console.error('[CONTRACT_SNAPSHOT] Error getting contract snapshot:', error);
    throw new Error(`Failed to get contract snapshot: ${error}`);
  }
}

/**
 * Get all snapshots for a tournament
 */
export async function getTournamentSnapshots(tournamentId: string): Promise<ContractSnapshotData[]> {
  try {
    const snapshots = await prisma.contractSnapshot.findMany({
      where: {
        data: {
          path: ['tournamentId'],
          equals: tournamentId
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    return snapshots.map(snapshot => snapshot.data as unknown as ContractSnapshotData);
  } catch (error) {
    console.error('[CONTRACT_SNAPSHOT] Error getting tournament snapshots:', error);
    throw new Error(`Failed to get tournament snapshots: ${error}`);
  }
}

/**
 * Compare pre and post match snapshots
 */
export async function comparePrePostMatchSnapshots(tournamentId: string): Promise<{
  preMatch: ContractSnapshotData | null;
  postMatch: ContractSnapshotData | null;
  comparison: {
    totalHoldersChange: number;
    totalTokensChange: string;
    uniqueAddressesChange: number;
    newHolders: string[];
    holdersWhoLeft: string[];
  } | null;
}> {
  try {
    console.log(`[CONTRACT_SNAPSHOT] Comparing snapshots for tournament ${tournamentId}...`);
    
    const preMatch = await getContractSnapshot(tournamentId, 'PRE_MATCH');
    const postMatch = await getContractSnapshot(tournamentId, 'POST_MATCH');

    if (!preMatch || !postMatch) {
      return {
        preMatch,
        postMatch,
        comparison: null
      };
    }

    // Compare snapshots
    const preAddresses = new Set(preMatch.holders.map(h => h.address));
    const postAddresses = new Set(postMatch.holders.map(h => h.address));

    const newHolders = Array.from(postAddresses).filter(addr => !preAddresses.has(addr));
    const holdersWhoLeft = Array.from(preAddresses).filter(addr => !postAddresses.has(addr));

    const comparison = {
      totalHoldersChange: postMatch.totalHolders - preMatch.totalHolders,
      totalTokensChange: (BigInt(postMatch.totalTokens) - BigInt(preMatch.totalTokens)).toString(),
      uniqueAddressesChange: postMatch.uniqueAddresses - preMatch.uniqueAddresses,
      newHolders,
      holdersWhoLeft
    };

    console.log(`[CONTRACT_SNAPSHOT] Comparison completed:`, comparison);

    return {
      preMatch,
      postMatch,
      comparison
    };
  } catch (error) {
    console.error('[CONTRACT_SNAPSHOT] Error comparing snapshots:', error);
    throw new Error(`Failed to compare snapshots: ${error}`);
  }
}

/**
 * Get user holdings from snapshot
 */
export async function getUserHoldingsFromSnapshot(
  tournamentId: string,
  snapshotType: 'PRE_MATCH' | 'POST_MATCH',
  address: string
): Promise<ContractHolder | null> {
  try {
    const snapshot = await getContractSnapshot(tournamentId, snapshotType);
    
    if (!snapshot) {
      return null;
    }

    const userHolder = snapshot.holders.find(h => h.address === address);
    return userHolder || null;
  } catch (error) {
    console.error('[CONTRACT_SNAPSHOT] Error getting user holdings:', error);
    throw new Error(`Failed to get user holdings: ${error}`);
  }
}

/**
 * Calculate reward eligibility based on snapshots
 */
export async function calculateRewardEligibility(
  tournamentId: string,
  address: string
): Promise<{
  eligible: boolean;
  preMatchHoldings: ContractHolder | null;
  postMatchHoldings: ContractHolder | null;
  maintainedHoldings: number;
  totalHoldings: number;
  eligibilityPercentage: number;
}> {
  try {
    const preMatch = await getUserHoldingsFromSnapshot(tournamentId, 'PRE_MATCH', address);
    const postMatch = await getUserHoldingsFromSnapshot(tournamentId, 'POST_MATCH', address);

    if (!preMatch || !postMatch) {
      return {
        eligible: false,
        preMatchHoldings: preMatch,
        postMatchHoldings: postMatch,
        maintainedHoldings: 0,
        totalHoldings: 0,
        eligibilityPercentage: 0
      };
    }

    // Calculate maintained holdings
    const preHoldings = new Map(preMatch.holdings.map(h => [h.moduleName, h.balance]));
    const postHoldings = new Map(postMatch.holdings.map(h => [h.moduleName, h.balance]));

    let maintainedHoldings = 0;
    let totalHoldings = preMatch.holdings.length;

    for (const [moduleName, preBalance] of preHoldings) {
      const postBalance = postHoldings.get(moduleName);
      if (postBalance && BigInt(postBalance) >= BigInt(preBalance)) {
        maintainedHoldings++;
      }
    }

    const eligibilityPercentage = totalHoldings > 0 ? (maintainedHoldings / totalHoldings) * 100 : 0;
    const eligible = eligibilityPercentage >= 50; // 50% threshold for eligibility

    return {
      eligible,
      preMatchHoldings: preMatch,
      postMatchHoldings: postMatch,
      maintainedHoldings,
      totalHoldings,
      eligibilityPercentage
    };
  } catch (error) {
    console.error('[CONTRACT_SNAPSHOT] Error calculating reward eligibility:', error);
    throw new Error(`Failed to calculate reward eligibility: ${error}`);
  }
}
