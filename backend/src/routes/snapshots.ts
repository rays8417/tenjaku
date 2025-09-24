import express from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const router = express.Router();

// POST /api/snapshots/create - Create snapshot for tournament (Admin only)
router.post('/create', async (req, res) => {
  try {
    const { tournamentId, snapshotType, blockNumber, contractAddress } = req.body;

    if (!tournamentId || !snapshotType || !blockNumber) {
      return res.status(400).json({ error: 'Tournament ID, snapshot type, and block number are required' });
    }

    // Validate tournament exists
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId }
    });

    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    // Get all user holdings at the time of snapshot
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

    // Create snapshot data
    const snapshotData = {
      tournamentId,
      snapshotType,
      timestamp: new Date().toISOString(),
      totalUsers: userHoldings.length > 0 ? new Set(userHoldings.map(h => h.userId)).size : 0,
      totalHoldings: userHoldings.length,
      holdings: userHoldings.map(holding => ({
        userId: holding.user.id,
        walletAddress: holding.user.walletAddress,
        displayName: holding.user.displayName,
        playerId: holding.player.id,
        playerName: holding.player.name,
        playerTeam: holding.player.team,
        playerRole: holding.player.role,
        tokenAmount: holding.tokenAmount,
        avgBuyPrice: holding.avgBuyPrice,
        totalInvested: holding.totalInvested,
        currentPrice: holding.player.tokenPrice,
        currentValue: Number(holding.player.tokenPrice) * Number(holding.tokenAmount)
      }))
    };

    // Store snapshot in database
    const snapshot = await prisma.contractSnapshot.create({
      data: {
        contractType: 'AMM_CONTRACT',
        contractAddress: contractAddress || '0x0000000000000000000000000000000000000000',
        blockNumber: BigInt(blockNumber),
        data: snapshotData
      }
    });

    res.json({
      success: true,
      snapshot: {
        id: snapshot.id,
        tournamentId,
        snapshotType,
        blockNumber: snapshot.blockNumber.toString(),
        contractAddress,
        timestamp: snapshotData.timestamp,
        totalUsers: snapshotData.totalUsers,
        totalHoldings: snapshotData.totalHoldings,
        createdAt: snapshot.createdAt
      }
    });
  } catch (error) {
    console.error('Snapshot creation error:', error);
    res.status(500).json({ error: 'Failed to create snapshot' });
  }
});

// GET /api/snapshots/tournament/:tournamentId - Get snapshots for tournament
router.get('/tournament/:tournamentId', async (req, res) => {
  try {
    const { tournamentId } = req.params;

    const snapshots = await prisma.contractSnapshot.findMany({
      where: {
        data: {
          path: ['tournamentId'],
          equals: tournamentId
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    res.json({
      success: true,
      snapshots: snapshots.map((snapshot: any) => ({
        id: snapshot.id,
        tournamentId: snapshot.data.tournamentId,
        snapshotType: snapshot.data.snapshotType,
        blockNumber: snapshot.blockNumber.toString(),
        contractAddress: snapshot.contractAddress,
        timestamp: snapshot.data.timestamp,
        totalUsers: snapshot.data.totalUsers,
        totalHoldings: snapshot.data.totalHoldings,
        createdAt: snapshot.createdAt
      }))
    });
  } catch (error) {
    console.error('Snapshots fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch snapshots' });
  }
});

// GET /api/snapshots/:id - Get specific snapshot details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const snapshot = await prisma.contractSnapshot.findUnique({
      where: { id }
    });

    if (!snapshot) {
      return res.status(404).json({ error: 'Snapshot not found' });
    }

    res.json({
      success: true,
      snapshot: {
        id: snapshot.id,
        contractType: snapshot.contractType,
        contractAddress: snapshot.contractAddress,
        blockNumber: snapshot.blockNumber.toString(),
        data: snapshot.data,
        createdAt: snapshot.createdAt
      }
    });
  } catch (error) {
    console.error('Snapshot fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch snapshot' });
  }
});

// POST /api/snapshots/validate-eligibility - Validate reward eligibility based on snapshots
router.post('/validate-eligibility', async (req, res) => {
  try {
    const { tournamentId, userId } = req.body;

    if (!tournamentId || !userId) {
      return res.status(400).json({ error: 'Tournament ID and User ID are required' });
    }

    // Get tournament snapshots
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
      return res.status(400).json({ error: 'Insufficient snapshots for eligibility validation' });
    }

    const preMatchSnapshot = snapshots.find(s => s.data.snapshotType === 'PRE_MATCH');
    const postMatchSnapshot = snapshots.find(s => s.data.snapshotType === 'POST_MATCH');

    if (!preMatchSnapshot || !postMatchSnapshot) {
      return res.status(400).json({ error: 'Both pre-match and post-match snapshots are required' });
    }

    // Find user holdings in both snapshots
    const preMatchHoldings = preMatchSnapshot.data.holdings.filter((h: any) => h.userId === userId);
    const postMatchHoldings = postMatchSnapshot.data.holdings.filter((h: any) => h.userId === userId);

    // Check eligibility criteria
    const eligibility = {
      userId,
      isEligible: true,
      reasons: [],
      preMatchHoldings: preMatchHoldings.length,
      postMatchHoldings: postMatchHoldings.length,
      preMatchValue: preMatchHoldings.reduce((sum: number, h: any) => sum + h.currentValue, 0),
      postMatchValue: postMatchHoldings.reduce((sum: number, h: any) => sum + h.currentValue, 0)
    };

    // Check if user had holdings before match
    if (preMatchHoldings.length === 0) {
      eligibility.isEligible = false;
      eligibility.reasons.push('No holdings before match');
    }

    // Check if user maintained minimum holdings during match
    const minHoldingValue = 100; // Minimum APT value required
    if (eligibility.preMatchValue < minHoldingValue) {
      eligibility.isEligible = false;
      eligibility.reasons.push(`Insufficient pre-match holdings (${eligibility.preMatchValue} < ${minHoldingValue})`);
    }

    // Check for significant trading activity (optional - could disqualify)
    const tradingThreshold = 0.5; // 50% change in portfolio value
    const valueChangeRatio = Math.abs(eligibility.postMatchValue - eligibility.preMatchValue) / eligibility.preMatchValue;
    
    if (valueChangeRatio > tradingThreshold) {
      eligibility.reasons.push(`Significant trading activity detected (${(valueChangeRatio * 100).toFixed(1)}% change)`);
    }

    res.json({
      success: true,
      eligibility
    });
  } catch (error) {
    console.error('Eligibility validation error:', error);
    res.status(500).json({ error: 'Failed to validate eligibility' });
  }
});

// GET /api/snapshots/user/:userId/holdings - Get user holdings across all snapshots
router.get('/user/:userId/holdings', async (req, res) => {
  try {
    const { userId } = req.params;
    const { tournamentId } = req.query;

    const whereClause: any = {
      data: {
        path: ['holdings'],
        array_contains: [{ userId }]
      }
    };

    if (tournamentId) {
      whereClause.data.path = ['tournamentId'];
      whereClause.data.equals = tournamentId;
    }

    const snapshots = await prisma.contractSnapshot.findMany({
      where: whereClause,
      orderBy: { createdAt: 'asc' }
    });

    const userHoldingsHistory = snapshots.map((snapshot: any) => {
      const userHoldings = snapshot.data.holdings.filter((h: any) => h.userId === userId);
      return {
        snapshotId: snapshot.id,
        tournamentId: snapshot.data.tournamentId,
        snapshotType: snapshot.data.snapshotType,
        timestamp: snapshot.data.timestamp,
        holdings: userHoldings,
        totalValue: userHoldings.reduce((sum: number, h: any) => sum + h.currentValue, 0),
        totalTokens: userHoldings.reduce((sum: number, h: any) => sum + Number(h.tokenAmount), 0)
      };
    });

    res.json({
      success: true,
      userHoldingsHistory
    });
  } catch (error) {
    console.error('User holdings history error:', error);
    res.status(500).json({ error: 'Failed to fetch user holdings history' });
  }
});

// POST /api/snapshots/compare - Compare two snapshots
router.post('/compare', async (req, res) => {
  try {
    const { snapshotId1, snapshotId2 } = req.body;

    if (!snapshotId1 || !snapshotId2) {
      return res.status(400).json({ error: 'Both snapshot IDs are required' });
    }

    const [snapshot1, snapshot2] = await Promise.all([
      prisma.contractSnapshot.findUnique({ where: { id: snapshotId1 } }),
      prisma.contractSnapshot.findUnique({ where: { id: snapshotId2 } })
    ]);

    if (!snapshot1 || !snapshot2) {
      return res.status(404).json({ error: 'One or both snapshots not found' });
    }

    const data1 = snapshot1.data as any;
    const data2 = snapshot2.data as any;

    // Compare holdings
    const holdings1 = new Map(data1.holdings.map((h: any) => [`${h.userId}-${h.playerId}`, h]));
    const holdings2 = new Map(data2.holdings.map((h: any) => [`${h.userId}-${h.playerId}`, h]));

    const changes = {
      newHoldings: [],
      removedHoldings: [],
      changedHoldings: [],
      unchangedHoldings: []
    };

    // Find new holdings
    for (const [key, holding2] of holdings2) {
      if (!holdings1.has(key)) {
        changes.newHoldings.push(holding2);
      }
    }

    // Find removed holdings
    for (const [key, holding1] of holdings1) {
      if (!holdings2.has(key)) {
        changes.removedHoldings.push(holding1);
      }
    }

    // Find changed holdings
    for (const [key, holding1] of holdings1) {
      if (holdings2.has(key)) {
        const holding2 = holdings2.get(key);
        if (Number(holding1.tokenAmount) !== Number(holding2.tokenAmount)) {
          changes.changedHoldings.push({
            userId: holding1.userId,
            playerId: holding1.playerId,
            playerName: holding1.playerName,
            before: {
              tokenAmount: holding1.tokenAmount,
              value: holding1.currentValue
            },
            after: {
              tokenAmount: holding2.tokenAmount,
              value: holding2.currentValue
            },
            change: {
              tokenAmount: Number(holding2.tokenAmount) - Number(holding1.tokenAmount),
              value: holding2.currentValue - holding1.currentValue
            }
          });
        } else {
          changes.unchangedHoldings.push(holding1);
        }
      }
    }

    res.json({
      success: true,
      comparison: {
        snapshot1: {
          id: snapshot1.id,
          timestamp: data1.timestamp,
          snapshotType: data1.snapshotType,
          totalUsers: data1.totalUsers,
          totalHoldings: data1.totalHoldings
        },
        snapshot2: {
          id: snapshot2.id,
          timestamp: data2.timestamp,
          snapshotType: data2.snapshotType,
          totalUsers: data2.totalUsers,
          totalHoldings: data2.totalHoldings
        },
        changes: {
          summary: {
            newHoldings: changes.newHoldings.length,
            removedHoldings: changes.removedHoldings.length,
            changedHoldings: changes.changedHoldings.length,
            unchangedHoldings: changes.unchangedHoldings.length
          },
          details: changes
        }
      }
    });
  } catch (error) {
    console.error('Snapshot comparison error:', error);
    res.status(500).json({ error: 'Failed to compare snapshots' });
  }
});

export default router;
