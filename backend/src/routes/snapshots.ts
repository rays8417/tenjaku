import express from 'express';
import { PrismaClient } from '@prisma/client';
import { 
  createContractSnapshot, 
  getContractSnapshot, 
  getTournamentSnapshots,
  comparePrePostMatchSnapshots,
  getUserHoldingsFromSnapshot,
  calculateRewardEligibility
} from '../services/contractSnapshotService';
import { getTokenHoldersWithBalances } from '../services/aptosService';

const prisma = new PrismaClient();

const router = express.Router();

// POST /api/snapshots/create - Create snapshot for tournament (Admin only)
router.post('/create', async (req, res) => {
  try {
    const { tournamentId, snapshotType, contractAddress, useAptosData = true } = req.body;

    if (!tournamentId || !snapshotType) {
      return res.status(400).json({ error: 'Tournament ID and snapshot type are required' });
    }

    // Validate snapshot type
    if (!['PRE_MATCH', 'POST_MATCH'].includes(snapshotType)) {
      return res.status(400).json({ error: 'Snapshot type must be PRE_MATCH or POST_MATCH' });
    }

    // Create contract-only snapshot
    const result = await createContractSnapshot(
      tournamentId,
      snapshotType as 'PRE_MATCH' | 'POST_MATCH',
      contractAddress
    );

    res.json({
      success: true,
      message: `${snapshotType} snapshot created successfully`,
      snapshot: result
    });
  } catch (error) {
    console.error('Snapshot creation error:', error);
    res.status(500).json({ 
      error: 'Failed to create snapshot',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/snapshots/tournament/:tournamentId - Get snapshots for tournament
router.get('/tournament/:tournamentId', async (req, res) => {
  try {
    const { tournamentId } = req.params;

    const snapshots = await getTournamentSnapshots(tournamentId);

    res.json({
      success: true,
      snapshots: snapshots.map(snapshot => ({
        tournamentId: snapshot.tournamentId,
        snapshotType: snapshot.snapshotType,
        timestamp: snapshot.timestamp,
        blockNumber: snapshot.blockNumber,
        contractAddress: snapshot.contractAddress,
        totalHolders: snapshot.totalHolders,
        totalTokens: snapshot.totalTokens,
        uniqueAddresses: snapshot.uniqueAddresses
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

    const preMatchSnapshot = snapshots.find(s => (s.data as any)?.snapshotType === 'PRE_MATCH');
    const postMatchSnapshot = snapshots.find(s => (s.data as any)?.snapshotType === 'POST_MATCH');

    if (!preMatchSnapshot || !postMatchSnapshot) {
      return res.status(400).json({ error: 'Both pre-match and post-match snapshots are required' });
    }

    // Find user holdings in both snapshots
    const preMatchHoldings = (preMatchSnapshot.data as any)?.holdings?.filter((h: any) => h.userId === userId) || [];
    const postMatchHoldings = (postMatchSnapshot.data as any)?.holdings?.filter((h: any) => h.userId === userId) || [];

    // Check eligibility criteria
    const eligibility = {
      userId,
      isEligible: true,
      reasons: [] as string[],
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

// POST /api/snapshots/compare-pre-post - Compare pre and post match snapshots
router.post('/compare-pre-post', async (req, res) => {
  try {
    const { tournamentId } = req.body;

    if (!tournamentId) {
      return res.status(400).json({ error: 'Tournament ID is required' });
    }

    const comparison = await comparePrePostMatchSnapshots(tournamentId);

    res.json({
      success: true,
      comparison
    });
  } catch (error) {
    console.error('Snapshot comparison error:', error);
    res.status(500).json({ error: 'Failed to compare snapshots' });
  }
});

// GET /api/snapshots/user/:address/holdings/:tournamentId - Get user holdings from snapshot
router.get('/user/:address/holdings/:tournamentId', async (req, res) => {
  try {
    const { address, tournamentId } = req.params;
    const { snapshotType = 'PRE_MATCH' } = req.query;

    const holdings = await getUserHoldingsFromSnapshot(
      tournamentId,
      snapshotType as 'PRE_MATCH' | 'POST_MATCH',
      address
    );

    res.json({
      success: true,
      holdings
    });
  } catch (error) {
    console.error('User holdings error:', error);
    res.status(500).json({ error: 'Failed to fetch user holdings' });
  }
});

// POST /api/snapshots/validate-eligibility - Validate reward eligibility
router.post('/validate-eligibility', async (req, res) => {
  try {
    const { tournamentId, address } = req.body;

    if (!tournamentId || !address) {
      return res.status(400).json({ error: 'Tournament ID and address are required' });
    }

    const eligibility = await calculateRewardEligibility(tournamentId, address);

    res.json({
      success: true,
      eligibility
    });
  } catch (error) {
    console.error('Eligibility validation error:', error);
    res.status(500).json({ error: 'Failed to validate eligibility' });
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
      newHoldings: [] as any[],
      removedHoldings: [] as any[],
      changedHoldings: [] as any[],
      unchangedHoldings: [] as any[]
    };

    // Find new holdings
    for (const [key, holding2] of holdings2) {
      if (!holdings1.has(key)) {
        changes.newHoldings.push(holding2 as any);
      }
    }

    // Find removed holdings
    for (const [key, holding1] of holdings1) {
      if (!holdings2.has(key)) {
        changes.removedHoldings.push(holding1 as any);
      }
    }

    // Find changed holdings
    for (const [key, holding1] of holdings1) {
      if (holdings2.has(key)) {
        const holding2 = holdings2.get(key);
        const h1 = holding1 as any;
        const h2 = holding2 as any;
        
        if (Number(h1.tokenAmount) !== Number(h2.tokenAmount)) {
          changes.changedHoldings.push({
            userId: h1.userId,
            playerId: h1.playerId,
            playerName: h1.playerName,
            before: {
              tokenAmount: h1.tokenAmount,
              value: h1.currentValue
            },
            after: {
              tokenAmount: h2.tokenAmount,
              value: h2.currentValue
            },
            change: {
              tokenAmount: Number(h2.tokenAmount) - Number(h1.tokenAmount),
              value: h2.currentValue - h1.currentValue
            }
          });
        } else {
          changes.unchangedHoldings.push(h1);
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

// POST /api/snapshots/compare-aptos - Compare Aptos contract data with database
router.post('/compare-aptos', async (req, res) => {
  try {
    console.log('Comparing Aptos contract data with database...');
    
    // Get Aptos token holders
    const aptosHolders = await getTokenHoldersWithBalances();
    
    res.json({
      success: true,
      comparison: {
        summary: {
          totalAptosHolders: aptosHolders.length,
          message: 'Contract-only approach - no database comparison needed'
        },
        details: {
          holders: aptosHolders.map(h => ({
            address: h.address,
            balance: h.balance.toString(),
            moduleName: h.moduleName
          }))
        }
      }
    });
  } catch (error) {
    console.error('Aptos comparison error:', error);
    res.status(500).json({ 
      error: 'Failed to compare Aptos data with database',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/snapshots/sync-aptos - Sync Aptos holders to database (creates new users if needed)
router.post('/sync-aptos', async (req, res) => {
  try {
    const { createMissingUsers = false } = req.body;
    
    console.log('Syncing Aptos holders with database...');
    
    // Get Aptos token holders
    const aptosHolders = await getTokenHoldersWithBalances();
    
    // Get existing users
    const walletAddresses = aptosHolders.map(holder => holder.address);
    const existingUsers = await prisma.user.findMany({
      where: {
        walletAddress: {
          in: walletAddresses
        }
      }
    });

    const existingWallets = new Set(existingUsers.map(user => user.walletAddress));
    const missingWallets = walletAddresses.filter(addr => !existingWallets.has(addr));

    let createdUsers: any[] = [];
    
    if (createMissingUsers && missingWallets.length > 0) {
      console.log(`Creating ${missingWallets.length} new users...`);
      
      const newUsers = await Promise.all(
        missingWallets.map(async (walletAddress) => {
          return await prisma.user.create({
            data: {
              walletAddress,
              displayName: `User_${walletAddress.slice(-6)}`, // Temporary display name
              isActive: true
            }
          });
        })
      );
      
      createdUsers = newUsers;
    }

    const syncResult = {
      totalAptosHolders: aptosHolders.length,
      existingUsers: existingUsers.length,
      missingWallets: missingWallets.length,
      createdUsers: createdUsers.length,
      createdUserDetails: createdUsers.map(user => ({
        id: user.id,
        walletAddress: user.walletAddress,
        displayName: user.displayName
      }))
    };

    res.json({
      success: true,
      sync: syncResult,
      message: `Sync completed. ${createdUsers.length} users created.`
    });
  } catch (error) {
    console.error('Aptos sync error:', error);
    res.status(500).json({ 
      error: 'Failed to sync Aptos holders with database',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/snapshots/aptos-holders - Get current Aptos token holders
router.get('/aptos-holders', async (req, res) => {
  try {
    const aptosHolders = await getTokenHoldersWithBalances();
    
    res.json({
      success: true,
      holders: aptosHolders.map(holder => ({
        address: holder.address,
        balance: holder.formattedBalance,
        balanceBigInt: holder.balance.toString(),
        playerId: holder.playerId,
        moduleName: holder.moduleName
      })),
      totalHolders: aptosHolders.length,
      totalTokens: aptosHolders.reduce((sum, holder) => sum + holder.balance, BigInt(0)).toString()
    });
  } catch (error) {
    console.error('Error fetching Aptos holders:', error);
    res.status(500).json({ 
      error: 'Failed to fetch Aptos token holders',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/snapshots/aptos-holders/:moduleName - Get Aptos token holders for specific player module
router.get('/aptos-holders/:moduleName', async (req, res) => {
  try {
    const { moduleName } = req.params;
    
    const { getTokenHoldersWithBalancesForPlayer } = await import('../services/aptosService');
    const aptosHolders = await getTokenHoldersWithBalancesForPlayer(moduleName);
    
    res.json({
      success: true,
      moduleName,
      holders: aptosHolders.map(holder => ({
        address: holder.address,
        balance: holder.formattedBalance,
        balanceBigInt: holder.balance.toString(),
        playerId: holder.playerId
      })),
      totalHolders: aptosHolders.length,
      totalTokens: aptosHolders.reduce((sum, holder) => sum + holder.balance, BigInt(0)).toString()
    });
  } catch (error) {
    console.error(`Error fetching Aptos holders for ${req.params.moduleName}:`, error);
    res.status(500).json({ 
      error: `Failed to fetch Aptos token holders for ${req.params.moduleName}`,
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/snapshots/compare-pre-post - Compare pre-match and post-match snapshots for tournament
router.post('/compare-pre-post', async (req, res) => {
  try {
    const { tournamentId } = req.body;
    
    if (!tournamentId) {
      return res.status(400).json({ error: 'Tournament ID is required' });
    }
    
    console.log(`Comparing pre/post match snapshots for tournament ${tournamentId}...`);
    
    const comparison = await comparePrePostMatchSnapshots(tournamentId);
    
    res.json({
      success: true,
      comparison: {
        preMatch: comparison.preMatch,
        postMatch: comparison.postMatch,
        comparison: comparison.comparison
      }
    });
  } catch (error) {
    console.error('Pre/post match comparison error:', error);
    res.status(500).json({ 
      error: 'Failed to compare pre/post match snapshots',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
