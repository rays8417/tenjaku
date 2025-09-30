import { PrismaClient } from '@prisma/client';
import { 
  getContractSnapshot, 
  comparePrePostMatchSnapshots,
  calculateRewardEligibility,
  ContractSnapshotData,
  ContractHolder
} from './contractSnapshotService';

const prisma = new PrismaClient();

// New interfaces for contract-based reward calculation
export interface PlayerScoreData {
  moduleName: string;
  fantasyPoints: number;
  playerId?: string;
}

export interface RewardCalculation {
  address: string;
  totalTokens: string;
  totalScore: number;
  rewardAmount: number;
  eligibility: {
    eligible: boolean;
    maintainedHoldings: number;
    totalHoldings: number;
    eligibilityPercentage: number;
  };
  holdings: {
    moduleName: string;
    balance: string;
    playerScore: number;
    points: number;
  }[];
}

export interface RewardDistributionResult {
  totalRewardAmount: number;
  totalEligibleHolders: number;
  totalTokens: string;
  rewardCalculations: RewardCalculation[];
  summary: {
    successfulCalculations: number;
    failedCalculations: number;
    totalRewardsDistributed: number;
  };
}

/**
 * Get player scores for a tournament
 */
async function getPlayerScores(tournamentId: string): Promise<PlayerScoreData[]> {
  try {
    const playerScores = await prisma.playerScore.findMany({
      where: { tournamentId },
      select: {
        moduleName: true,
        fantasyPoints: true,
        playerId: true
      }
    });

    return playerScores.map(score => ({
      moduleName: score.moduleName || 'Unknown',
      fantasyPoints: Number(score.fantasyPoints),
      playerId: score.playerId || undefined
    }));
  } catch (error) {
    console.error('[REWARD_CALC] Error getting player scores:', error);
    throw new Error(`Failed to get player scores: ${error}`);
  }
}

/**
 * Calculate user score based on token holdings and player performance
 */
function calculateUserScore(
  holdings: ContractHolder['holdings'],
  playerScores: PlayerScoreData[]
): { totalScore: number; detailedScores: any[] } {
  let totalScore = 0;
  const detailedScores = [];

  for (const holding of holdings) {
    const playerScore = playerScores.find(ps => ps.moduleName === holding.moduleName);
    
    if (playerScore) {
      // Calculate points based on token amount (proportional to holdings)
      const tokenAmount = BigInt(holding.balance);
      const tokenRatio = Number(tokenAmount) / 1000000; // Normalize token amount
      const weightedPoints = playerScore.fantasyPoints * tokenRatio;
      
      totalScore += weightedPoints;
      
      detailedScores.push({
        moduleName: holding.moduleName,
        balance: holding.balance,
        playerScore: playerScore.fantasyPoints,
        points: weightedPoints
      });
    }
  }

  return { totalScore, detailedScores };
}

/**
 * Calculate rewards based on snapshot data and player scores
 */
export async function calculateRewardsFromSnapshots(
  tournamentId: string,
  totalRewardAmount: number
): Promise<RewardDistributionResult> {
  try {
    console.log(`[REWARD_CALC] Calculating rewards for tournament ${tournamentId}...`);
    console.log(`[REWARD_CALC] Total reward amount: ${totalRewardAmount} APT`);

    // Step 1: Get player scores
    console.log('[REWARD_CALC] Getting player scores...');
    const playerScores = await getPlayerScores(tournamentId);
    
    if (playerScores.length === 0) {
      throw new Error('No player scores found for tournament');
    }

    console.log(`[REWARD_CALC] Found ${playerScores.length} player scores`);

    // Step 2: Get pre-match snapshot
    console.log('[REWARD_CALC] Getting pre-match snapshot...');
    const preMatchSnapshot = await getContractSnapshot(tournamentId, 'PRE_MATCH');
    
    if (!preMatchSnapshot) {
      throw new Error('Pre-match snapshot not found');
    }

    console.log(`[REWARD_CALC] Pre-match snapshot: ${preMatchSnapshot.uniqueAddresses} addresses, ${preMatchSnapshot.totalHolders} holdings`);

    // Step 3: Calculate rewards for each holder
    console.log('[REWARD_CALC] Calculating rewards for each holder...');
    const rewardCalculations: RewardCalculation[] = [];
    let totalScore = 0;

    for (const holder of preMatchSnapshot.holders) {
      try {
        // Calculate user score based on holdings
        const { totalScore: userScore, detailedScores } = calculateUserScore(
          holder.holdings,
          playerScores
        );

        // Calculate total tokens held
        const totalTokens = holder.holdings.reduce((sum, h) => {
          return sum + BigInt(h.balance);
        }, BigInt(0)).toString();

        // Check reward eligibility
        const eligibility = await calculateRewardEligibility(tournamentId, holder.address);

        // Only include eligible holders in reward calculation
        if (eligibility.eligible) {
          totalScore += userScore;
          
          rewardCalculations.push({
            address: holder.address,
            totalTokens,
            totalScore: userScore,
            rewardAmount: 0, // Will be calculated after we know total score
            eligibility,
            holdings: detailedScores
          });
        } else {
          console.log(`[REWARD_CALC] Address ${holder.address} not eligible: ${eligibility.eligibilityPercentage}% maintained`);
        }
      } catch (error) {
        console.error(`[REWARD_CALC] Error calculating reward for ${holder.address}:`, error);
      }
    }

    if (totalScore === 0) {
      throw new Error('Total score is zero - no eligible holders found');
    }

    console.log(`[REWARD_CALC] Found ${rewardCalculations.length} eligible holders`);
    console.log(`[REWARD_CALC] Total score: ${totalScore}`);

    // Step 4: Calculate proportional rewards
    console.log('[REWARD_CALC] Calculating proportional rewards...');
    const finalRewardCalculations = rewardCalculations.map(calculation => {
      const scorePercentage = calculation.totalScore / totalScore;
      const rewardAmount = totalRewardAmount * scorePercentage;
      
      return {
        ...calculation,
        rewardAmount
      };
    });

    // Step 5: Calculate summary statistics
    const totalTokens = finalRewardCalculations.reduce((sum, calc) => {
      return sum + BigInt(calc.totalTokens);
    }, BigInt(0)).toString();

    const totalRewardsDistributed = finalRewardCalculations.reduce((sum, calc) => {
      return sum + calc.rewardAmount;
    }, 0);

    const summary = {
      successfulCalculations: finalRewardCalculations.length,
      failedCalculations: 0, // Could track failed calculations if needed
      totalRewardsDistributed
    };

    console.log(`[REWARD_CALC] Reward calculation completed:`, summary);

    return {
      totalRewardAmount,
      totalEligibleHolders: finalRewardCalculations.length,
      totalTokens,
      rewardCalculations: finalRewardCalculations,
      summary
    };

  } catch (error) {
    console.error('[REWARD_CALC] Error calculating rewards from snapshots:', error);
    throw new Error(`Failed to calculate rewards from snapshots: ${error}`);
  }
}

/**
 * Get reward eligibility for a specific address
 */
export async function getRewardEligibility(
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
    return await calculateRewardEligibility(tournamentId, address);
  } catch (error) {
    console.error('[REWARD_CALC] Error getting reward eligibility:', error);
    throw new Error(`Failed to get reward eligibility: ${error}`);
  }
}

/**
 * Get reward summary for a tournament
 */
export async function getRewardSummary(tournamentId: string): Promise<{
  tournamentId: string;
  preMatchSnapshot: ContractSnapshotData | null;
  postMatchSnapshot: ContractSnapshotData | null;
  playerScores: PlayerScoreData[];
  comparison: any;
  totalEligibleHolders: number;
  totalTokens: string;
}> {
  try {
    console.log(`[REWARD_CALC] Getting reward summary for tournament ${tournamentId}...`);

    const [preMatchSnapshot, postMatchSnapshot, playerScores, comparison] = await Promise.all([
      getContractSnapshot(tournamentId, 'PRE_MATCH'),
      getContractSnapshot(tournamentId, 'POST_MATCH'),
      getPlayerScores(tournamentId),
      comparePrePostMatchSnapshots(tournamentId)
    ]);

    const totalEligibleHolders = preMatchSnapshot?.uniqueAddresses || 0;
    const totalTokens = preMatchSnapshot?.totalTokens || '0';

    return {
      tournamentId,
      preMatchSnapshot,
      postMatchSnapshot,
      playerScores,
      comparison,
      totalEligibleHolders,
      totalTokens
    };
  } catch (error) {
    console.error('[REWARD_CALC] Error getting reward summary:', error);
    throw new Error(`Failed to get reward summary: ${error}`);
  }
}
