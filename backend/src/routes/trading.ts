import express from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const router = express.Router();

// GET /api/trading/players - Get all players with current prices
router.get('/players', async (req, res) => {
  try {
    const players = await prisma.player.findMany({
      where: { isActive: true },
      include: {
        userHoldings: {
          select: {
            tokenAmount: true
          }
        },
        _count: {
          select: {
            userHoldings: true
          }
        }
      },
      orderBy: [
        { team: 'asc' },
        { role: 'asc' },
        { tokenPrice: 'desc' }
      ]
    });

    res.json({
      success: true,
      players: players.map((player: any) => ({
        id: player.id,
        name: player.name,
        team: player.team,
        role: player.role,
        tokenSupply: player.tokenSupply,
        tokenPrice: player.tokenPrice,
        totalHolders: player._count.userHoldings,
        totalHeld: player.userHoldings.reduce((sum: any, holding: any) => 
          sum + Number(holding.tokenAmount), 0
        )
      }))
    });
  } catch (error) {
    console.error('Players fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch players' });
  }
});

// GET /api/trading/player/:playerId - Get specific player details
router.get('/player/:playerId', async (req, res) => {
  try {
    const { playerId } = req.params;

    const player = await prisma.player.findUnique({
      where: { id: playerId },
      include: {
        userHoldings: {
          include: {
            user: {
              select: {
                displayName: true,
                walletAddress: true
              }
            }
          },
          orderBy: { tokenAmount: 'desc' }
        },
        tokenTransactions: {
          include: {
            user: {
              select: {
                displayName: true,
                walletAddress: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });

    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    res.json({
      success: true,
      player: {
        id: player.id,
        name: player.name,
        team: player.team,
        role: player.role,
        tokenSupply: player.tokenSupply,
        tokenPrice: player.tokenPrice,
        topHolders: player.userHoldings.slice(0, 10).map((holding: any) => ({
          user: holding.user,
          tokenAmount: holding.tokenAmount,
          totalInvested: holding.totalInvested,
          avgBuyPrice: holding.avgBuyPrice
        })),
        recentTransactions: player.tokenTransactions.map((tx: any) => ({
          id: tx.id,
          type: tx.transactionType,
          tokenAmount: tx.tokenAmount,
          aptAmount: tx.aptAmount,
          price: tx.price,
          user: tx.user,
          createdAt: tx.createdAt
        }))
      }
    });
  } catch (error) {
    console.error('Player details error:', error);
    res.status(500).json({ error: 'Failed to fetch player details' });
  }
});

// POST /api/trading/buy - Buy player tokens
router.post('/buy', async (req, res) => {
  try {
    const { userId, playerId, tokenAmount, maxPrice } = req.body;

    if (!userId || !playerId || !tokenAmount) {
      return res.status(400).json({ error: 'User ID, Player ID, and token amount are required' });
    }

    // Get player current price
    const player = await prisma.player.findUnique({
      where: { id: playerId }
    });

    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const totalCost = Number(player.tokenPrice) * Number(tokenAmount);
    const finalPrice = Number(player.tokenPrice);

    // Check if user has enough balance (this would be checked against Aptos wallet)
    // For now, we'll assume the transaction is valid

    // Execute buy transaction
    const result = await prisma.$transaction(async (tx: any) => {
      // Get or create user holding
      let holding = await tx.userHolding.findUnique({
        where: {
          userId_playerId: {
            userId,
            playerId
          }
        }
      });

      if (holding) {
        // Update existing holding
        const newTotalAmount = Number(holding.tokenAmount) + Number(tokenAmount);
        const newTotalInvested = Number(holding.totalInvested) + totalCost;
        const newAvgPrice = newTotalInvested / newTotalAmount;

        holding = await tx.userHolding.update({
          where: { id: holding.id },
          data: {
            tokenAmount: newTotalAmount,
            totalInvested: newTotalInvested,
            avgBuyPrice: newAvgPrice
          }
        });
      } else {
        // Create new holding
        holding = await tx.userHolding.create({
          data: {
            userId,
            playerId,
            tokenAmount,
            totalInvested: totalCost,
            avgBuyPrice: finalPrice
          }
        });
      }

      // Record transaction
      const transaction = await tx.tokenTransaction.create({
        data: {
          userId,
          playerId,
          transactionType: 'BUY',
          tokenAmount,
          aptAmount: totalCost,
          price: finalPrice
        }
      });

      // Update user spending
      await tx.user.update({
        where: { id: userId },
        data: {
          totalSpent: {
            increment: totalCost
          }
        }
      });

      return { holding, transaction };
    });

    res.json({
      success: true,
      transaction: {
        id: result.transaction.id,
        type: 'BUY',
        tokenAmount,
        aptAmount: totalCost,
        price: finalPrice,
        playerName: player.name
      },
      holding: {
        totalTokens: result.holding.tokenAmount,
        totalInvested: result.holding.totalInvested,
        avgBuyPrice: result.holding.avgBuyPrice
      }
    });
  } catch (error) {
    console.error('Buy transaction error:', error);
    res.status(500).json({ error: 'Failed to execute buy transaction' });
  }
});

// POST /api/trading/sell - Sell player tokens
router.post('/sell', async (req, res) => {
  try {
    const { userId, playerId, tokenAmount, minPrice } = req.body;

    if (!userId || !playerId || !tokenAmount) {
      return res.status(400).json({ error: 'User ID, Player ID, and token amount are required' });
    }

    // Get player current price and user holding
    const [player, holding] = await Promise.all([
      prisma.player.findUnique({ where: { id: playerId } }),
      prisma.userHolding.findUnique({
        where: {
          userId_playerId: { userId, playerId }
        }
      })
    ]);

    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    if (!holding || Number(holding.tokenAmount) < Number(tokenAmount)) {
      return res.status(400).json({ error: 'Insufficient tokens to sell' });
    }

    const totalRevenue = Number(player.tokenPrice) * Number(tokenAmount);
    const finalPrice = Number(player.tokenPrice);

    // Execute sell transaction
    const result = await prisma.$transaction(async (tx: any) => {
      // Update holding
      const newTokenAmount = Number(holding.tokenAmount) - Number(tokenAmount);
      
      let updatedHolding;
      if (newTokenAmount === 0) {
        // Delete holding if all tokens sold
        await tx.userHolding.delete({
          where: { id: holding.id }
        });
        updatedHolding = { tokenAmount: 0, totalInvested: 0, avgBuyPrice: 0 };
      } else {
        // Update holding
        updatedHolding = await tx.userHolding.update({
          where: { id: holding.id },
          data: {
            tokenAmount: newTokenAmount,
            // Recalculate average buy price based on remaining tokens
            avgBuyPrice: (Number(holding.totalInvested) * (newTokenAmount / Number(holding.tokenAmount))) / newTokenAmount
          }
        });
      }

      // Record transaction
      const transaction = await tx.tokenTransaction.create({
        data: {
          userId,
          playerId,
          transactionType: 'SELL',
          tokenAmount,
          aptAmount: totalRevenue,
          price: finalPrice
        }
      });

      // Update user earnings
      await tx.user.update({
        where: { id: userId },
        data: {
          totalEarnings: {
            increment: totalRevenue
          }
        }
      });

      return { holding: updatedHolding, transaction };
    });

    res.json({
      success: true,
      transaction: {
        id: result.transaction.id,
        type: 'SELL',
        tokenAmount,
        aptAmount: totalRevenue,
        price: finalPrice,
        playerName: player.name
      },
      holding: {
        totalTokens: result.holding.tokenAmount,
        totalInvested: result.holding.totalInvested,
        avgBuyPrice: result.holding.avgBuyPrice
      }
    });
  } catch (error) {
    console.error('Sell transaction error:', error);
    res.status(500).json({ error: 'Failed to execute sell transaction' });
  }
});

// GET /api/trading/portfolio/:userId - Get user's portfolio
router.get('/portfolio/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const holdings = await prisma.userHolding.findMany({
      where: { userId },
      include: {
        player: {
          select: {
            id: true,
            name: true,
            team: true,
            role: true,
            tokenPrice: true
          }
        }
      },
      orderBy: { tokenAmount: 'desc' }
    });

    const transactions = await prisma.tokenTransaction.findMany({
      where: { userId },
      include: {
        player: {
          select: {
            name: true,
            team: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    // Calculate portfolio value
    const portfolioValue = holdings.reduce((sum, holding) => {
      const currentValue = Number(holding.player.tokenPrice) * Number(holding.tokenAmount);
      return sum + currentValue;
    }, 0);

    const totalInvested = holdings.reduce((sum, holding) => 
      sum + Number(holding.totalInvested), 0
    );

    const totalPnl = portfolioValue - totalInvested;

    res.json({
      success: true,
      portfolio: {
        totalValue: portfolioValue,
        totalInvested,
        totalPnl,
        holdings: holdings.map((holding: any) => ({
          player: holding.player,
          tokenAmount: holding.tokenAmount,
          totalInvested: holding.totalInvested,
          avgBuyPrice: holding.avgBuyPrice,
          currentPrice: holding.player.tokenPrice,
          currentValue: Number(holding.player.tokenPrice) * Number(holding.tokenAmount),
          pnl: (Number(holding.player.tokenPrice) * Number(holding.tokenAmount)) - Number(holding.totalInvested)
        })),
        recentTransactions: transactions.map((tx: any) => ({
          id: tx.id,
          type: tx.transactionType,
          tokenAmount: tx.tokenAmount,
          aptAmount: tx.aptAmount,
          price: tx.price,
          player: tx.player,
          createdAt: tx.createdAt
        }))
      }
    });
  } catch (error) {
    console.error('Portfolio fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch portfolio' });
  }
});

// GET /api/trading/transactions/:userId - Get user's transaction history
router.get('/transactions/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const transactions = await prisma.tokenTransaction.findMany({
      where: { userId },
      include: {
        player: {
          select: {
            name: true,
            team: true,
            role: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: Number(limit),
      skip: Number(offset)
    });

    res.json({
      success: true,
      transactions: transactions.map((tx: any) => ({
        id: tx.id,
        type: tx.transactionType,
        tokenAmount: tx.tokenAmount,
        aptAmount: tx.aptAmount,
        price: tx.price,
        player: tx.player,
        aptosTransactionId: tx.aptosTransactionId,
        createdAt: tx.createdAt
      }))
    });
  } catch (error) {
    console.error('Transactions fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

export default router;
