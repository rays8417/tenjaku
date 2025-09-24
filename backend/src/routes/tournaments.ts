import express from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const router = express.Router();

// GET /api/tournaments - Get all tournaments
router.get('/', async (req, res) => {
  try {
    const { status, limit = 20, offset = 0 } = req.query;

    const whereClause = status ? { status: status as any } : {};

    const tournaments = await prisma.tournament.findMany({
      where: whereClause,
      include: {
        teams: {
          select: {
            id: true,
            teamName: true,
            user: {
              select: {
                displayName: true,
                walletAddress: true
              }
            }
          }
        },
        rewardPools: {
          select: {
            id: true,
            name: true,
            totalAmount: true,
            distributedAmount: true
          }
        },
        _count: {
          select: {
            teams: true
          }
        }
      },
      orderBy: { matchDate: 'desc' },
      take: Number(limit),
      skip: Number(offset)
    });

    res.json({
      success: true,
      tournaments: tournaments.map((tournament: any) => ({
        id: tournament.id,
        name: tournament.name,
        description: tournament.description,
        matchDate: tournament.matchDate,
        team1: tournament.team1,
        team2: tournament.team2,
        venue: tournament.venue,
        status: tournament.status,
        entryFee: tournament.entryFee,
        maxParticipants: tournament.maxParticipants,
        currentParticipants: tournament.currentParticipants,
        participantCount: tournament._count.teams,
        rewardPools: tournament.rewardPools,
        createdAt: tournament.createdAt
      }))
    });
  } catch (error) {
    console.error('Tournaments fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch tournaments' });
  }
});

// GET /api/tournaments/:id - Get tournament details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const tournament = await prisma.tournament.findUnique({
      where: { id },
      include: {
        teams: {
          include: {
            user: {
              select: {
                displayName: true,
                walletAddress: true
              }
            },
            scores: true,
            players: {
              include: {
                player: true
              }
            }
          }
        },
        rewardPools: {
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
              }
            }
          }
        },
        leaderboard: {
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
        },
        playerScores: {
          include: {
            player: true
          }
        }
      }
    });

    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    res.json({
      success: true,
      tournament: {
        id: tournament.id,
        name: tournament.name,
        description: tournament.description,
        matchDate: tournament.matchDate,
        team1: tournament.team1,
        team2: tournament.team2,
        venue: tournament.venue,
        status: tournament.status,
        entryFee: tournament.entryFee,
        maxParticipants: tournament.maxParticipants,
        currentParticipants: tournament.currentParticipants,
        teams: tournament.teams,
        rewardPools: tournament.rewardPools,
        leaderboard: tournament.leaderboard,
        playerScores: tournament.playerScores,
        createdAt: tournament.createdAt
      }
    });
  } catch (error) {
    console.error('Tournament fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch tournament' });
  }
});

// GET /api/tournaments/:id/leaderboard - Get tournament leaderboard
router.get('/:id/leaderboard', async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 50 } = req.query;

    const leaderboard = await prisma.leaderboardEntry.findMany({
      where: { tournamentId: id },
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
      orderBy: { rank: 'asc' },
      take: Number(limit)
    });

    res.json({
      success: true,
      leaderboard: leaderboard.map((entry: any) => ({
        rank: entry.rank,
        totalScore: entry.totalScore,
        matchesPlayed: entry.matchesPlayed,
        teamName: entry.userTeam.teamName,
        user: entry.userTeam.user
      }))
    });
  } catch (error) {
    console.error('Leaderboard fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// GET /api/tournaments/:id/players - Get available players for tournament
router.get('/:id/players', async (req, res) => {
  try {
    const { id } = req.params;

    const tournament = await prisma.tournament.findUnique({
      where: { id },
      select: { team1: true, team2: true }
    });

    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    const players = await prisma.player.findMany({
      where: {
        team: {
          in: [tournament.team1, tournament.team2]
        },
        isActive: true
      },
      orderBy: [
        { team: 'asc' },
        { role: 'asc' },
        { creditValue: 'desc' }
      ]
    });

    res.json({
      success: true,
      players: players.map((player: any) => ({
        id: player.id,
        name: player.name,
        team: player.team,
        role: player.role,
        creditValue: player.creditValue
      }))
    });
  } catch (error) {
    console.error('Players fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch players' });
  }
});





// POST /api/tournaments - Create a new tournament
router.post('/', async (req, res) => {
  try {
    const {
      name,
      description,
      matchDate,
      team1,
      team2,
      venue,
      entryFee = 0,
      maxParticipants
    } = req.body;

    // Input validation
    if (!name || !matchDate || !team1 || !team2) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, matchDate, team1, and team2 are required'
      });
    }

    // Validate matchDate is in the future
    const matchDateTime = new Date(matchDate);
    if (matchDateTime <= new Date()) {
      return res.status(400).json({
        success: false,
        error: 'Match date must be in the future'
      });
    }

    // Validate entryFee is non-negative
    if (entryFee < 0) {
      return res.status(400).json({
        success: false,
        error: 'Entry fee must be non-negative'
      });
    }

    // Validate maxParticipants if provided
    if (maxParticipants && maxParticipants <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Max participants must be a positive number'
      });
    }

    // Create the tournament
    const tournament = await prisma.tournament.create({
      data: {
        name,
        description,
        matchDate: matchDateTime,
        team1,
        team2,
        venue,
        entryFee: Number(entryFee),
        maxParticipants: maxParticipants ? Number(maxParticipants) : null,
        currentParticipants: 0,
        status: 'UPCOMING'
      },
      include: {
        _count: {
          select: {
            teams: true
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Tournament created successfully',
      tournament: {
        id: tournament.id,
        name: tournament.name,
        description: tournament.description,
        matchDate: tournament.matchDate,
        team1: tournament.team1,
        team2: tournament.team2,
        venue: tournament.venue,
        status: tournament.status,
        entryFee: tournament.entryFee,
        maxParticipants: tournament.maxParticipants,
        currentParticipants: tournament.currentParticipants,
        participantCount: tournament._count.teams,
        createdAt: tournament.createdAt
      }
    });
  } catch (error: any) {
    console.error('Tournament creation error:', error);
    
    // Handle specific Prisma errors
    if (error.code === 'P2002') {
      return res.status(400).json({
        success: false,
        error: 'A tournament with this configuration already exists'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to create tournament'
    });
  }
});

export default router;
