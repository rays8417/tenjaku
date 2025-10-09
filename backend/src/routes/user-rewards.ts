import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

/**
 * GET /api/user-rewards/:address
 * Get all rewards for a specific wallet address
 */
router.get('/:address', async (req, res) => {
  try {
    const { address } = req.params;

    if (!address) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }

    // Get all rewards for this address
    const rewards = await prisma.userReward.findMany({
      where: { address },
      include: {
        rewardPool: {
          include: {
            tournament: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Calculate total earnings
    const totalEarnings = rewards.reduce((sum, reward) => {
      return sum + Number(reward.amount);
    }, 0);

    // Group by tournament
    const tournamentRewards = rewards.map(reward => ({
      id: reward.id,
      tournamentId: reward.rewardPool.tournamentId,
      tournamentName: reward.rewardPool.tournament.name,
      team1: reward.rewardPool.tournament.team1,
      team2: reward.rewardPool.tournament.team2,
      matchDate: reward.rewardPool.tournament.matchDate,
      amount: Number(reward.amount),
      percentage: reward.percentage ? Number(reward.percentage) : null,
      status: reward.status,
      transactionId: reward.aptosTransactionId,
      rank: reward.rank,
      createdAt: reward.createdAt,
      metadata: reward.metadata
    }));

    res.json({
      success: true,
      address,
      totalEarnings,
      totalRewards: rewards.length,
      rewards: tournamentRewards
    });

  } catch (error) {
    console.error('Error fetching user rewards:', error);
    res.status(500).json({ 
      error: 'Failed to fetch user rewards',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/user-rewards/tournament/:tournamentId
 * Get all rewards for a specific tournament
 */
router.get('/tournament/:tournamentId', async (req, res) => {
  try {
    const { tournamentId } = req.params;

    if (!tournamentId) {
      return res.status(400).json({ error: 'Tournament ID is required' });
    }

    // Get tournament details
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId }
    });

    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    // Get reward pool for this tournament
    const rewardPool = await prisma.rewardPool.findFirst({
      where: { tournamentId },
      orderBy: { createdAt: 'desc' }
    });

    if (!rewardPool) {
      return res.json({
        success: true,
        tournament: {
          id: tournament.id,
          name: tournament.name,
          team1: tournament.team1,
          team2: tournament.team2,
          matchDate: tournament.matchDate,
          status: tournament.status
        },
        totalRewards: 0,
        rewards: []
      });
    }

    // Get all rewards for this pool
    const rewards = await prisma.userReward.findMany({
      where: { rewardPoolId: rewardPool.id },
      orderBy: { amount: 'desc' }
    });

    // Calculate total distributed
    const totalDistributed = rewards.reduce((sum, reward) => {
      return sum + Number(reward.amount);
    }, 0);

    // Format rewards
    const formattedRewards = rewards.map((reward, index) => ({
      rank: index + 1,
      address: reward.address,
      amount: Number(reward.amount),
      percentage: reward.percentage ? Number(reward.percentage) : null,
      status: reward.status,
      transactionId: reward.aptosTransactionId,
      metadata: reward.metadata
    }));

    res.json({
      success: true,
      tournament: {
        id: tournament.id,
        name: tournament.name,
        team1: tournament.team1,
        team2: tournament.team2,
        matchDate: tournament.matchDate,
        status: tournament.status
      },
      rewardPool: {
        id: rewardPool.id,
        totalAmount: Number(rewardPool.totalAmount),
        distributedAmount: Number(rewardPool.distributedAmount),
        distributionType: rewardPool.distributionType
      },
      totalRewards: rewards.length,
      totalDistributed,
      rewards: formattedRewards
    });

  } catch (error) {
    console.error('Error fetching tournament rewards:', error);
    res.status(500).json({ 
      error: 'Failed to fetch tournament rewards',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/user-rewards/address/:address/tournament/:tournamentId
 * Get rewards for a specific address in a specific tournament
 */
router.get('/address/:address/tournament/:tournamentId', async (req, res) => {
  try {
    const { address, tournamentId } = req.params;

    if (!address || !tournamentId) {
      return res.status(400).json({ error: 'Address and Tournament ID are required' });
    }

    // Get reward pool for this tournament
    const rewardPool = await prisma.rewardPool.findFirst({
      where: { tournamentId },
      include: {
        tournament: true
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!rewardPool) {
      return res.status(404).json({ error: 'No rewards found for this tournament' });
    }

    // Get reward for this address
    const reward = await prisma.userReward.findFirst({
      where: {
        address,
        rewardPoolId: rewardPool.id
      }
    });

    if (!reward) {
      return res.json({
        success: true,
        message: 'No reward found for this address in this tournament',
        address,
        tournament: {
          id: rewardPool.tournament.id,
          name: rewardPool.tournament.name
        },
        hasReward: false
      });
    }

    res.json({
      success: true,
      hasReward: true,
      address,
      tournament: {
        id: rewardPool.tournament.id,
        name: rewardPool.tournament.name,
        team1: rewardPool.tournament.team1,
        team2: rewardPool.tournament.team2,
        matchDate: rewardPool.tournament.matchDate,
        status: rewardPool.tournament.status
      },
      reward: {
        id: reward.id,
        amount: Number(reward.amount),
        percentage: reward.percentage ? Number(reward.percentage) : null,
        status: reward.status,
        transactionId: reward.aptosTransactionId,
        rank: reward.rank,
        createdAt: reward.createdAt,
        metadata: reward.metadata
      }
    });

  } catch (error) {
    console.error('Error fetching user reward for tournament:', error);
    res.status(500).json({ 
      error: 'Failed to fetch user reward',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/user-rewards/leaderboard/universal
 * Get universal leaderboard - top earners across all tournaments
 */
router.get('/leaderboard/universal', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;

    // Get all rewards grouped by address
    const rewards = await prisma.userReward.findMany({
      select: {
        address: true,
        amount: true
      }
    });

    // Aggregate rewards by address
    const addressTotals = new Map<string, number>();
    
    rewards.forEach(reward => {
      const currentTotal = addressTotals.get(reward.address) || 0;
      addressTotals.set(reward.address, currentTotal + Number(reward.amount));
    });

    // Convert to array and sort by total amount
    const leaderboard = Array.from(addressTotals.entries())
      .map(([address, amount]) => ({
        address,
        amount
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, limit)
      .map((entry, index) => ({
        rank: index + 1,
        address: entry.address,
        amount: entry.amount
      }));

    res.json({
      success: true,
      leaderboard,
      totalAddresses: addressTotals.size
    });

  } catch (error) {
    console.error('Error fetching universal leaderboard:', error);
    res.status(500).json({ 
      error: 'Failed to fetch universal leaderboard',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/user-rewards/leaderboard/:tournamentId
 * Get top earners for a tournament
 */
router.get('/leaderboard/:tournamentId', async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const limit = parseInt(req.query.limit as string) || 10;

    if (!tournamentId) {
      return res.status(400).json({ error: 'Tournament ID is required' });
    }

    // Get tournament details
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId }
    });

    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    // Get reward pool for this tournament
    const rewardPool = await prisma.rewardPool.findFirst({
      where: { tournamentId },
      orderBy: { createdAt: 'desc' }
    });

    if (!rewardPool) {
      return res.json({
        success: true,
        tournament,
        leaderboard: []
      });
    }

    // Get top rewards
    const topRewards = await prisma.userReward.findMany({
      where: { rewardPoolId: rewardPool.id },
      orderBy: { amount: 'desc' },
      take: limit
    });

    const leaderboard = topRewards.map((reward, index) => ({
      rank: index + 1,
      address: reward.address,
      amount: Number(reward.amount),
      percentage: reward.percentage ? Number(reward.percentage) : null,
      status: reward.status
    }));

    res.json({
      success: true,
      tournament: {
        id: tournament.id,
        name: tournament.name,
        team1: tournament.team1,
        team2: tournament.team2,
        matchDate: tournament.matchDate
      },
      rewardPool: {
        totalAmount: Number(rewardPool.totalAmount),
        totalDistributed: Number(rewardPool.distributedAmount)
      },
      leaderboard
    });

  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ 
      error: 'Failed to fetch leaderboard',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
