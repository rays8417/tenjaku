import express from 'express';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const router = express.Router();
// POST /api/rewards/create-pool - Create reward pool (Admin only)
router.post('/create-pool', async (req, res) => {
    try {
        const { tournamentId, name, totalAmount, distributionType, distributionRules } = req.body;
        if (!tournamentId || !name || !totalAmount || !distributionType || !distributionRules) {
            return res.status(400).json({ error: 'All fields are required' });
        }
        // Check if tournament exists
        const tournament = await prisma.tournament.findUnique({
            where: { id: tournamentId }
        });
        if (!tournament) {
            return res.status(404).json({ error: 'Tournament not found' });
        }
        // Create reward pool
        const rewardPool = await prisma.rewardPool.create({
            data: {
                tournamentId,
                name,
                totalAmount,
                distributionType,
                distributionRules: JSON.parse(distributionRules)
            }
        });
        res.json({
            success: true,
            rewardPool: {
                id: rewardPool.id,
                name: rewardPool.name,
                totalAmount: rewardPool.totalAmount,
                distributionType: rewardPool.distributionType,
                distributionRules: rewardPool.distributionRules,
                createdAt: rewardPool.createdAt
            }
        });
    }
    catch (error) {
        console.error('Reward pool creation error:', error);
        res.status(500).json({ error: 'Failed to create reward pool' });
    }
});
// GET /api/rewards/tournament/:tournamentId - Get reward pools for tournament
router.get('/tournament/:tournamentId', async (req, res) => {
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
                                        walletAddress: true
                                    }
                                }
                            }
                        }
                    },
                    orderBy: { rank: 'asc' }
                }
            }
        });
        res.json({
            success: true,
            rewardPools: rewardPools.map((pool) => ({
                id: pool.id,
                name: pool.name,
                totalAmount: pool.totalAmount,
                distributedAmount: pool.distributedAmount,
                distributionType: pool.distributionType,
                distributionRules: pool.distributionRules,
                rewards: pool.rewards.map((reward) => ({
                    id: reward.id,
                    rank: reward.rank,
                    amount: reward.amount,
                    percentage: reward.percentage,
                    status: reward.status,
                    user: reward.userTeam.user,
                    teamName: reward.userTeam.teamName
                }))
            }))
        });
    }
    catch (error) {
        console.error('Reward pools fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch reward pools' });
    }
});
// POST /api/rewards/distribute - Distribute rewards based on leaderboard
router.post('/distribute', async (req, res) => {
    try {
        const { tournamentId, rewardPoolId } = req.body;
        if (!tournamentId || !rewardPoolId) {
            return res.status(400).json({ error: 'Tournament ID and Reward Pool ID are required' });
        }
        // Get reward pool
        const rewardPool = await prisma.rewardPool.findUnique({
            where: { id: rewardPoolId }
        });
        if (!rewardPool) {
            return res.status(404).json({ error: 'Reward pool not found' });
        }
        // Get leaderboard
        const leaderboard = await prisma.leaderboardEntry.findMany({
            where: { tournamentId },
            include: {
                userTeam: {
                    include: {
                        user: true
                    }
                }
            },
            orderBy: { rank: 'asc' }
        });
        if (leaderboard.length === 0) {
            return res.status(400).json({ error: 'No participants found for reward distribution' });
        }
        // Parse distribution rules
        const distributionRules = rewardPool.distributionRules;
        const totalAmount = Number(rewardPool.totalAmount);
        const distributedRewards = [];
        // Distribute rewards based on rules
        for (const rule of distributionRules.rules) {
            const { rank, percentage } = rule;
            const rewardAmount = (totalAmount * percentage) / 100;
            if (typeof rank === 'number') {
                // Single rank
                const leaderboardEntry = leaderboard.find(entry => entry.rank === rank);
                if (leaderboardEntry) {
                    const userReward = await prisma.userReward.create({
                        data: {
                            userTeamId: leaderboardEntry.userTeamId,
                            rewardPoolId,
                            rank,
                            amount: rewardAmount,
                            percentage,
                            status: 'PENDING'
                        }
                    });
                    distributedRewards.push({
                        rank,
                        amount: rewardAmount,
                        percentage,
                        user: leaderboardEntry.userTeam.user,
                        teamName: leaderboardEntry.userTeam.teamName
                    });
                }
            }
            else if (typeof rank === 'string' && rank.includes('-')) {
                // Rank range (e.g., "4-10")
                const [startRank, endRank] = rank.split('-').map(Number);
                const eligibleEntries = leaderboard.filter((entry) => entry.rank >= startRank && entry.rank <= endRank);
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
                                status: 'PENDING'
                            }
                        });
                        distributedRewards.push({
                            rank: entry.rank,
                            amount: amountPerUser,
                            percentage: percentage / eligibleEntries.length,
                            user: entry.userTeam.user,
                            teamName: entry.userTeam.teamName
                        });
                    }
                }
            }
        }
        // Update reward pool distributed amount
        const totalDistributed = distributedRewards.reduce((sum, reward) => sum + reward.amount, 0);
        await prisma.rewardPool.update({
            where: { id: rewardPoolId },
            data: {
                distributedAmount: totalDistributed
            }
        });
        res.json({
            success: true,
            message: 'Rewards distributed successfully',
            totalDistributed,
            rewards: distributedRewards
        });
    }
    catch (error) {
        console.error('Reward distribution error:', error);
        res.status(500).json({ error: 'Failed to distribute rewards' });
    }
});
// POST /api/rewards/process/:rewardId - Process individual reward (Admin only)
router.post('/process/:rewardId', async (req, res) => {
    try {
        const { rewardId } = req.params;
        const { aptosTransactionId } = req.body;
        const reward = await prisma.userReward.findUnique({
            where: { id: rewardId },
            include: {
                userTeam: {
                    include: {
                        user: true
                    }
                },
                rewardPool: true
            }
        });
        if (!reward) {
            return res.status(404).json({ error: 'Reward not found' });
        }
        if (reward.status !== 'PENDING') {
            return res.status(400).json({ error: 'Reward is not pending' });
        }
        // Update reward status
        const updatedReward = await prisma.$transaction(async (tx) => {
            // Update reward
            const updatedReward = await tx.userReward.update({
                where: { id: rewardId },
                data: {
                    status: 'PROCESSING',
                    aptosTransactionId: aptosTransactionId || null
                }
            });
            // Update user total earnings
            await tx.user.update({
                where: { id: reward.userTeam.user.id },
                data: {
                    totalEarnings: {
                        increment: reward.amount
                    }
                }
            });
            return updatedReward;
        });
        res.json({
            success: true,
            message: 'Reward processing initiated',
            reward: {
                id: updatedReward.id,
                amount: updatedReward.amount,
                status: updatedReward.status,
                aptosTransactionId: updatedReward.aptosTransactionId
            }
        });
    }
    catch (error) {
        console.error('Reward processing error:', error);
        res.status(500).json({ error: 'Failed to process reward' });
    }
});
// PUT /api/rewards/:rewardId/status - Update reward status
router.put('/:rewardId/status', async (req, res) => {
    try {
        const { rewardId } = req.params;
        const { status, aptosTransactionId } = req.body;
        if (!status || !['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }
        const reward = await prisma.userReward.update({
            where: { id: rewardId },
            data: {
                status,
                aptosTransactionId: aptosTransactionId || undefined
            }
        });
        res.json({
            success: true,
            message: 'Reward status updated',
            reward: {
                id: reward.id,
                status: reward.status,
                aptosTransactionId: reward.aptosTransactionId
            }
        });
    }
    catch (error) {
        console.error('Reward status update error:', error);
        res.status(500).json({ error: 'Failed to update reward status' });
    }
});
// GET /api/rewards/user/:walletAddress - Get user's rewards
router.get('/user/:walletAddress', async (req, res) => {
    try {
        const { walletAddress } = req.params;
        const { status } = req.query;
        const whereClause = {
            userTeam: {
                user: {
                    walletAddress
                }
            }
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
                                team2: true
                            }
                        }
                    }
                },
                rewardPool: {
                    select: {
                        name: true,
                        distributionType: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json({
            success: true,
            rewards: rewards.map((reward) => ({
                id: reward.id,
                rank: reward.rank,
                amount: reward.amount,
                percentage: reward.percentage,
                status: reward.status,
                aptosTransactionId: reward.aptosTransactionId,
                tournament: reward.userTeam.tournament,
                rewardPool: reward.rewardPool,
                createdAt: reward.createdAt
            }))
        });
    }
    catch (error) {
        console.error('User rewards fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch user rewards' });
    }
});
export default router;
//# sourceMappingURL=rewards.js.map