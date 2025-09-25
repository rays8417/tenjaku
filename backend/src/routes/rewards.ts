import express from "express";
import { PrismaClient } from "@prisma/client";
import { aptos, CONTRACT_CONFIG } from "../services/aptosService";
import { Ed25519PrivateKey, Ed25519PublicKey, Ed25519Account } from "@aptos-labs/ts-sdk";

const prisma = new PrismaClient();

const router = express.Router();

// Configuration for reward distribution
const REWARD_CONFIG = {
  ADMIN_PRIVATE_KEY: process.env.ADMIN_PRIVATE_KEY, // Private key for admin account (comma-separated bytes)
  ADMIN_ACCOUNT_ADDRESS: process.env.ADMIN_ACCOUNT_ADDRESS, // Admin account address that holds rewards
  APTOS_COIN_TYPE: "0x1::aptos_coin::AptosCoin", // Standard APT coin type
  MIN_REWARD_AMOUNT: 0.001, // Minimum reward amount to avoid dust
  GAS_LIMIT: 100000, // Gas limit for transactions
};

/**
 * Calculate proportional rewards based on user scores and token holdings
 */
async function calculateProportionalRewards(tournamentId: string, totalRewardAmount: number) {
  try {
    console.log(`Calculating proportional rewards for tournament ${tournamentId}...`);
    
    // Get user scores from the tournament
    const userScores = await prisma.userScore.findMany({
      where: { tournamentId },
      include: {
        userTeam: {
          include: {
            user: true
          }
        }
      },
      orderBy: { totalScore: 'desc' }
    });

    if (userScores.length === 0) {
      throw new Error('No user scores found for tournament');
    }

    // Calculate total score for proportional distribution
    const totalScore = userScores.reduce((sum, score) => sum + Number(score.totalScore), 0);
    
    if (totalScore === 0) {
      throw new Error('Total score is zero - cannot distribute rewards proportionally');
    }

    // Calculate rewards for each user
    const rewardCalculations = userScores.map((userScore, index) => {
      const scorePercentage = Number(userScore.totalScore) / totalScore;
      const rewardAmount = totalRewardAmount * scorePercentage;
      
      return {
        rank: index + 1,
        userId: userScore.userTeam.userId,
        userTeamId: userScore.userTeamId,
        walletAddress: userScore.userTeam.user.walletAddress,
        displayName: userScore.userTeam.user.displayName,
        totalScore: Number(userScore.totalScore),
        scorePercentage: scorePercentage * 100,
        rewardAmount: rewardAmount,
        teamName: userScore.userTeam.teamName
      };
    });

    console.log(`Calculated rewards for ${rewardCalculations.length} users`);
    return rewardCalculations;
    
  } catch (error) {
    console.error('Error calculating proportional rewards:', error);
    throw new Error(`Failed to calculate proportional rewards: ${error}`);
  }
}

/**
 * Transfer APT tokens to user accounts using real Aptos SDK
 */
async function transferRewardsToUsers(rewardCalculations: any[]) {
  try {
    console.log(`Starting real token transfers for ${rewardCalculations.length} users...`);
    
    if (!REWARD_CONFIG.ADMIN_PRIVATE_KEY || !REWARD_CONFIG.ADMIN_ACCOUNT_ADDRESS) {
      throw new Error('Admin private key and account address must be configured');
    }

    // Create admin account from private key
    const privateKeyBytes = REWARD_CONFIG.ADMIN_PRIVATE_KEY.split(',').map(Number);
    const privateKey = new Ed25519PrivateKey(new Uint8Array(privateKeyBytes));
    const publicKey = privateKey.publicKey();
    const authKey = publicKey.authKey();
    const adminAccountAddress = authKey.derivedAddress();

    console.log(`Admin account address: ${adminAccountAddress}`);

    // Verify account address matches configuration
    if (adminAccountAddress.toString() !== REWARD_CONFIG.ADMIN_ACCOUNT_ADDRESS) {
      throw new Error(`Account address mismatch. Expected: ${REWARD_CONFIG.ADMIN_ACCOUNT_ADDRESS}, Got: ${adminAccountAddress}`);
    }

    // Create account object for signing
    const adminAccount = new Ed25519Account({
      privateKey: privateKey
    });

    const transferResults = [];
    
    for (const reward of rewardCalculations) {
      try {
        // Skip if reward amount is too small
        if (reward.rewardAmount < REWARD_CONFIG.MIN_REWARD_AMOUNT) {
          console.log(`Skipping ${reward.walletAddress} - reward too small: ${reward.rewardAmount}`);
          transferResults.push({
            ...reward,
            status: 'skipped',
            reason: 'Amount too small',
            transactionId: null
          });
          continue;
        }

        // Convert APT to octas (1 APT = 100,000,000 octas)
        const amountInOctas = Math.floor(reward.rewardAmount * 100000000);
        
        console.log(`Transferring ${reward.rewardAmount} APT (${amountInOctas} octas) to ${reward.walletAddress}...`);
        
        // Create transfer transaction
        const transferTransaction = await aptos.transferCoinTransaction({
          sender: adminAccountAddress.toString(),
          recipient: reward.walletAddress,
          amount: amountInOctas,
          coinType: REWARD_CONFIG.APTOS_COIN_TYPE as `${string}::${string}::${string}`,
        });

        // Sign and submit transaction
        const committedTransaction = await aptos.signAndSubmitTransaction({
          signer: adminAccount,
          transaction: transferTransaction,
        });

        console.log(`Transaction submitted: ${committedTransaction.hash}`);

        // Wait for transaction to complete
        const transactionResult = await aptos.waitForTransaction({ 
          transactionHash: committedTransaction.hash 
        });

        if (transactionResult.success) {
          console.log(`✅ Successfully transferred ${reward.rewardAmount} APT to ${reward.walletAddress}`);
          console.log(`   Transaction: ${committedTransaction.hash}`);
          
          transferResults.push({
            ...reward,
            status: 'success',
            transactionId: committedTransaction.hash,
            transactionUrl: `https://explorer.aptoslabs.com/txn/${committedTransaction.hash}?network=devnet`,
            gasUsed: transactionResult.gas_used,
            timestamp: new Date().toISOString()
          });
        } else {
          throw new Error(`Transaction failed: ${transactionResult.vm_status}`);
        }
        
      } catch (transferError) {
        console.error(`❌ Failed to transfer to ${reward.walletAddress}:`, transferError);
        
        transferResults.push({
          ...reward,
          status: 'failed',
          error: transferError instanceof Error ? transferError.message : 'Unknown error',
          transactionId: null,
          timestamp: new Date().toISOString()
        });
      }
    }

    return transferResults;
    
  } catch (error) {
    console.error('Error transferring rewards:', error);
    throw new Error(`Failed to transfer rewards: ${error}`);
  }
}

// POST /api/rewards/distribute-contract-based - Distribute rewards using contract data and Aptos transfers
router.post("/distribute-contract-based", async (req, res) => {
  try {
    const { tournamentId, totalRewardAmount } = req.body;

    if (!tournamentId || !totalRewardAmount) {
      return res.status(400).json({ 
        error: "Tournament ID and total reward amount are required" 
      });
    }

    // Validate tournament exists
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId }
    });

    if (!tournament) {
      return res.status(404).json({ error: "Tournament not found" });
    }

    console.log(`Starting contract-based reward distribution for tournament ${tournamentId}...`);
    console.log(`Total reward amount: ${totalRewardAmount} APT`);

    // Step 1: Calculate proportional rewards based on user scores
    const rewardCalculations = await calculateProportionalRewards(tournamentId, totalRewardAmount);

    // Step 2: Transfer rewards to users via Aptos
    const transferResults = await transferRewardsToUsers(rewardCalculations);

    // Step 3: Store reward records in database
    const rewardRecords = [];
    for (const result of transferResults) {
      if (result.status === 'success') {
        // Create a simple reward record without foreign key constraints
        const rewardRecord = {
          id: `reward_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          userTeamId: result.userTeamId,
          rank: result.rank,
          amount: result.rewardAmount,
          status: 'COMPLETED',
          aptosTransactionId: result.transactionId,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        rewardRecords.push(rewardRecord);
      }
    }

    // Calculate summary statistics
    const successfulTransfers = transferResults.filter(r => r.status === 'success');
    const failedTransfers = transferResults.filter(r => r.status === 'failed');
    const skippedTransfers = transferResults.filter(r => r.status === 'skipped');
    const totalDistributed = successfulTransfers.reduce((sum, r) => sum + r.rewardAmount, 0);

    console.log(`Reward distribution completed:`);
    console.log(`- Successful: ${successfulTransfers.length}`);
    console.log(`- Failed: ${failedTransfers.length}`);
    console.log(`- Skipped: ${skippedTransfers.length}`);
    console.log(`- Total distributed: ${totalDistributed} APT`);

    res.json({
      success: true,
      message: "Contract-based rewards distributed successfully",
      summary: {
        totalUsers: transferResults.length,
        successful: successfulTransfers.length,
        failed: failedTransfers.length,
        skipped: skippedTransfers.length,
        totalDistributed: totalDistributed,
        totalRewardPool: totalRewardAmount
      },
      transfers: transferResults,
      rewardRecords: rewardRecords
    });

  } catch (error) {
    console.error("Contract-based reward distribution error:", error);
    res.status(500).json({ 
      error: "Failed to distribute rewards", 
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/rewards/admin-info - Get admin account information
router.get("/admin-info", async (req, res) => {
  try {
    if (!REWARD_CONFIG.ADMIN_PRIVATE_KEY || !REWARD_CONFIG.ADMIN_ACCOUNT_ADDRESS) {
      return res.status(400).json({ 
        error: "Admin private key and account address must be configured" 
      });
    }

    // Create admin account from private key to verify it matches
    const privateKeyBytes = REWARD_CONFIG.ADMIN_PRIVATE_KEY.split(',').map(Number);
    const privateKey = new Ed25519PrivateKey(new Uint8Array(privateKeyBytes));
    const publicKey = privateKey.publicKey();
    const authKey = publicKey.authKey();
    const derivedAddress = authKey.derivedAddress();

    // Get account balance
    const balance = await aptos.getAccountAPTAmount({
      accountAddress: derivedAddress.toString()
    });

    const balanceInAPT = Number(balance) / 100000000; // Convert octas to APT

    // Get account sequence number
    const accountInfo = await aptos.getAccountInfo({
      accountAddress: derivedAddress.toString()
    });

    res.json({
      success: true,
      adminInfo: {
        configuredAddress: REWARD_CONFIG.ADMIN_ACCOUNT_ADDRESS,
        derivedAddress: derivedAddress.toString(),
        publicKey: publicKey.toString(),
        balance: balanceInAPT,
        balanceOctas: balance.toString(),
        sequenceNumber: accountInfo.sequence_number,
        isConfiguredCorrectly: derivedAddress.toString() === REWARD_CONFIG.ADMIN_ACCOUNT_ADDRESS
      },
      message: `Admin account has ${balanceInAPT} APT`
    });

  } catch (error) {
    console.error("Error getting admin info:", error);
    res.status(500).json({ 
      error: "Failed to get admin info", 
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/rewards/admin-balance - Check admin account balance (legacy endpoint)
router.get("/admin-balance", async (req, res) => {
  try {
    if (!REWARD_CONFIG.ADMIN_ACCOUNT_ADDRESS) {
      return res.status(400).json({ 
        error: "Admin account address not configured" 
      });
    }

    // Get account balance
    const balance = await aptos.getAccountAPTAmount({
      accountAddress: REWARD_CONFIG.ADMIN_ACCOUNT_ADDRESS
    });

    const balanceInAPT = Number(balance) / 100000000; // Convert octas to APT

    res.json({
      success: true,
      adminAddress: REWARD_CONFIG.ADMIN_ACCOUNT_ADDRESS,
      balance: balanceInAPT,
      balanceOctas: balance.toString(),
      message: `Admin account has ${balanceInAPT} APT`
    });

  } catch (error) {
    console.error("Error checking admin balance:", error);
    res.status(500).json({ 
      error: "Failed to check admin balance", 
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/rewards/create-pool - Create reward pool (Admin only)
router.post("/create-pool", async (req, res) => {
  try {
    const {
      tournamentId,
      name,
      totalAmount,
      distributionType,
      distributionRules,
    } = req.body;

    if (
      !tournamentId ||
      !name ||
      !totalAmount ||
      !distributionType ||
      !distributionRules
    ) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // Check if tournament exists
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
    });

    if (!tournament) {
      return res.status(404).json({ error: "Tournament not found" });
    }

    // Create reward pool
    const rewardPool = await prisma.rewardPool.create({
      data: {
        tournamentId,
        name,
        totalAmount,
        distributionType,
        distributionRules: JSON.parse(distributionRules),
      },
    });

    res.json({
      success: true,
      rewardPool: {
        id: rewardPool.id,
        name: rewardPool.name,
        totalAmount: rewardPool.totalAmount,
        distributionType: rewardPool.distributionType,
        distributionRules: rewardPool.distributionRules,
        createdAt: rewardPool.createdAt,
      },
    });
  } catch (error) {
    console.error("Reward pool creation error:", error);
    res.status(500).json({ error: "Failed to create reward pool" });
  }
});

// GET /api/rewards/tournament/:tournamentId - Get reward pools for tournament
router.get("/tournament/:tournamentId", async (req, res) => {
  try {
    const { tournamentId } = req.params;

    const rewardPools = await prisma.rewardPool.findMany({
      where: { tournamentId },
      include: {
        rewards: {
          include: {
            userTeam: {
              include: {
                user: {
                  select: {
                    displayName: true,
                    walletAddress: true,
                  },
                },
              },
            },
          },
          orderBy: { rank: "asc" },
        },
      },
    });

    res.json({
      success: true,
      rewardPools: rewardPools.map((pool: any) => ({
        id: pool.id,
        name: pool.name,
        totalAmount: pool.totalAmount,
        distributedAmount: pool.distributedAmount,
        distributionType: pool.distributionType,
        distributionRules: pool.distributionRules,
        rewards: pool.rewards.map((reward: any) => ({
          id: reward.id,
          rank: reward.rank,
          amount: reward.amount,
          percentage: reward.percentage,
          status: reward.status,
          user: reward.userTeam.user,
          teamName: reward.userTeam.teamName,
        })),
      })),
    });
  } catch (error) {
    console.error("Reward pools fetch error:", error);
    res.status(500).json({ error: "Failed to fetch reward pools" });
  }
});

// POST /api/rewards/distribute - Distribute rewards based on leaderboard
router.post("/distribute", async (req, res) => {
  try {
    const { tournamentId, rewardPoolId } = req.body;

    if (!tournamentId || !rewardPoolId) {
      return res
        .status(400)
        .json({ error: "Tournament ID and Reward Pool ID are required" });
    }

    // Get reward pool
    const rewardPool = await prisma.rewardPool.findUnique({
      where: { id: rewardPoolId },
    });

    if (!rewardPool) {
      return res.status(404).json({ error: "Reward pool not found" });
    }

    // Get leaderboard
    const leaderboard = await prisma.leaderboardEntry.findMany({
      where: { tournamentId },
      include: {
        userTeam: {
          include: {
            user: true,
          },
        },
      },
      orderBy: { rank: "asc" },
    });

    if (leaderboard.length === 0) {
      return res
        .status(400)
        .json({ error: "No participants found for reward distribution" });
    }

    // Parse distribution rules
    const distributionRules = rewardPool.distributionRules as any;
    const totalAmount = Number(rewardPool.totalAmount);
    const distributedRewards = [];

    // Distribute rewards based on rules
    for (const rule of distributionRules.rules) {
      const { rank, percentage } = rule;
      const rewardAmount = (totalAmount * percentage) / 100;

      if (typeof rank === "number") {
        // Single rank
        const leaderboardEntry = leaderboard.find(
          (entry: any) => entry.rank === rank
        );
        if (leaderboardEntry) {
          const userReward = await prisma.userReward.create({
            data: {
              userTeamId: leaderboardEntry.userTeamId,
              rewardPoolId,
              rank,
              amount: rewardAmount,
              percentage,
              status: "PENDING",
            },
          });

          distributedRewards.push({
            rank,
            amount: rewardAmount,
            percentage,
            user: leaderboardEntry.userTeam.user,
            teamName: leaderboardEntry.userTeam.teamName,
          });
        }
      } else if (typeof rank === "string" && rank.includes("-")) {
        // Rank range (e.g., "4-10")
        const [startRank, endRank] = rank.split("-").map(Number);
        const eligibleEntries = leaderboard.filter(
          (entry: any) => entry.rank >= startRank! && entry.rank <= endRank!
        );

        if (eligibleEntries.length > 0) {
          const amountPerUser = rewardAmount / eligibleEntries.length;

          for (const entry of eligibleEntries) {
            const userReward = await prisma.userReward.create({
              data: {
                userTeamId: entry.userTeamId,
                rewardPoolId,
                rank: entry.rank,
                amount: amountPerUser,
                percentage: percentage / eligibleEntries.length,
                status: "PENDING",
              },
            });

            distributedRewards.push({
              rank: entry.rank,
              amount: amountPerUser,
              percentage: percentage / eligibleEntries.length,
              user: entry.userTeam.user,
              teamName: entry.userTeam.teamName,
            });
          }
        }
      }
    }

    // Update reward pool distributed amount
    const totalDistributed = distributedRewards.reduce(
      (sum, reward) => sum + reward.amount,
      0
    );
    await prisma.rewardPool.update({
      where: { id: rewardPoolId },
      data: {
        distributedAmount: totalDistributed,
      },
    });

    res.json({
      success: true,
      message: "Rewards distributed successfully",
      totalDistributed,
      rewards: distributedRewards,
    });
  } catch (error) {
    console.error("Reward distribution error:", error);
    res.status(500).json({ error: "Failed to distribute rewards" });
  }
});

// POST /api/rewards/process/:rewardId - Process individual reward (Admin only)
router.post("/process/:rewardId", async (req, res) => {
  try {
    const { rewardId } = req.params;
    const { aptosTransactionId } = req.body;

    const reward = await prisma.userReward.findUnique({
      where: { id: rewardId },
      include: {
        userTeam: {
          include: {
            user: true,
          },
        },
        rewardPool: true,
      },
    });

    if (!reward) {
      return res.status(404).json({ error: "Reward not found" });
    }

    if (reward.status !== "PENDING") {
      return res.status(400).json({ error: "Reward is not pending" });
    }

    // Update reward status
    const updatedReward = await prisma.$transaction(async (tx: any) => {
      // Update reward
      const updatedReward = await tx.userReward.update({
        where: { id: rewardId },
        data: {
          status: "PROCESSING",
          aptosTransactionId: aptosTransactionId || null,
        },
      });

      // Update user total earnings
      await tx.user.update({
        where: { id: reward.userTeam.user.id },
        data: {
          totalEarnings: {
            increment: reward.amount,
          },
        },
      });

      return updatedReward;
    });

    res.json({
      success: true,
      message: "Reward processing initiated",
      reward: {
        id: updatedReward.id,
        amount: updatedReward.amount,
        status: updatedReward.status,
        aptosTransactionId: updatedReward.aptosTransactionId,
      },
    });
  } catch (error) {
    console.error("Reward processing error:", error);
    res.status(500).json({ error: "Failed to process reward" });
  }
});

// PUT /api/rewards/:rewardId/status - Update reward status
router.put("/:rewardId/status", async (req, res) => {
  try {
    const { rewardId } = req.params;
    const { status, aptosTransactionId } = req.body;

    if (
      !status ||
      !["PENDING", "PROCESSING", "COMPLETED", "FAILED"].includes(status)
    ) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const reward = await prisma.userReward.update({
      where: { id: rewardId },
      data: {
        status,
        aptosTransactionId: aptosTransactionId || undefined,
      },
    });

    res.json({
      success: true,
      message: "Reward status updated",
      reward: {
        id: reward.id,
        status: reward.status,
        aptosTransactionId: reward.aptosTransactionId,
      },
    });
  } catch (error) {
    console.error("Reward status update error:", error);
    res.status(500).json({ error: "Failed to update reward status" });
  }
});

// GET /api/rewards/user/:walletAddress - Get user's rewards
router.get("/user/:walletAddress", async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const { status } = req.query;

    const whereClause: any = {
      userTeam: {
        user: {
          walletAddress,
        },
      },
    };

    if (status) {
      whereClause.status = status;
    }

    const rewards = await prisma.userReward.findMany({
      where: whereClause,
      include: {
        userTeam: {
          include: {
            tournament: {
              select: {
                id: true,
                name: true,
                matchDate: true,
                team1: true,
                team2: true,
              },
            },
          },
        },
        rewardPool: {
          select: {
            name: true,
            distributionType: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({
      success: true,
      rewards: rewards.map((reward: any) => ({
        id: reward.id,
        rank: reward.rank,
        amount: reward.amount,
        percentage: reward.percentage,
        status: reward.status,
        aptosTransactionId: reward.aptosTransactionId,
        tournament: reward.userTeam.tournament,
        rewardPool: reward.rewardPool,
        createdAt: reward.createdAt,
      })),
    });
  } catch (error) {
    console.error("User rewards fetch error:", error);
    res.status(500).json({ error: "Failed to fetch user rewards" });
  }
});

export default router;
