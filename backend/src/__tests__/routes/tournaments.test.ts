import request from 'supertest';
import express from 'express';
import tournamentsRouter from '../../routes/tournaments';
import { mockPrisma } from '../setup';

// Create Express app for testing
const app = express();
app.use(express.json());
app.use('/api/tournaments', tournamentsRouter);

describe('Tournaments Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/tournaments', () => {
    it('should return tournaments successfully', async () => {
      const mockTournaments = [
        {
          id: 'tournament-1',
          name: 'Test Tournament 1',
          description: 'Description 1',
          matchDate: new Date('2024-12-25T10:00:00Z'),
          team1: 'Team A',
          team2: 'Team B',
          venue: 'Stadium 1',
          status: 'UPCOMING',
          entryFee: 10,
          maxParticipants: 100,
          currentParticipants: 5,
          createdAt: new Date(),
          teams: [
            {
              id: 'team-1',
              teamName: 'User Team 1',
              user: {
                displayName: 'User 1',
                walletAddress: '0x123...'
              }
            }
          ],
          rewardPools: [
            {
              id: 'pool-1',
              name: 'Winner Pool',
              totalAmount: 1000,
              distributedAmount: 0
            }
          ],
          _count: {
            teams: 5
          }
        }
      ];

      mockPrisma.tournament.findMany.mockResolvedValue(mockTournaments);

      const response = await request(app)
        .get('/api/tournaments')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.tournaments).toHaveLength(1);
      expect(response.body.tournaments[0]).toMatchObject({
        id: 'tournament-1',
        name: 'Test Tournament 1',
        team1: 'Team A',
        team2: 'Team B',
        status: 'UPCOMING',
        participantCount: 5
      });

      expect(mockPrisma.tournament.findMany).toHaveBeenCalledWith({
        where: {},
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
        take: 20,
        skip: 0
      });
    });

    it('should filter tournaments by status', async () => {
      mockPrisma.tournament.findMany.mockResolvedValue([]);

      await request(app)
        .get('/api/tournaments?status=UPCOMING')
        .expect(200);

      expect(mockPrisma.tournament.findMany).toHaveBeenCalledWith({
        where: { status: 'UPCOMING' },
        include: expect.any(Object),
        orderBy: { matchDate: 'desc' },
        take: 20,
        skip: 0
      });
    });

    it('should handle pagination parameters', async () => {
      mockPrisma.tournament.findMany.mockResolvedValue([]);

      await request(app)
        .get('/api/tournaments?limit=10&offset=20')
        .expect(200);

      expect(mockPrisma.tournament.findMany).toHaveBeenCalledWith({
        where: {},
        include: expect.any(Object),
        orderBy: { matchDate: 'desc' },
        take: 10,
        skip: 20
      });
    });

    it('should handle database errors', async () => {
      mockPrisma.tournament.findMany.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/tournaments')
        .expect(500);

      expect(response.body.error).toBe('Failed to fetch tournaments');
    });
  });

  describe('GET /api/tournaments/:id', () => {
    it('should return tournament details successfully', async () => {
      const tournamentId = 'tournament-1';
      const mockTournament = {
        id: tournamentId,
        name: 'Test Tournament',
        description: 'Test Description',
        matchDate: new Date('2024-12-25T10:00:00Z'),
        team1: 'Team A',
        team2: 'Team B',
        venue: 'Test Stadium',
        status: 'UPCOMING',
        entryFee: 10,
        maxParticipants: 100,
        currentParticipants: 5,
        createdAt: new Date(),
        teams: [
          {
            id: 'team-1',
            teamName: 'User Team 1',
            user: {
              displayName: 'User 1',
              walletAddress: '0x123...'
            },
            scores: [
              {
                totalScore: 150
              }
            ],
            players: [
              {
                player: {
                  id: 'player-1',
                  name: 'Player 1',
                  team: 'Team A',
                  role: 'BATSMAN',
                  creditValue: 8
                }
              }
            ]
          }
        ],
        rewardPools: [
          {
            id: 'pool-1',
            name: 'Winner Pool',
            totalAmount: 1000,
            distributedAmount: 0,
            rewards: [
              {
                id: 'reward-1',
                amount: 500,
                status: 'COMPLETED',
                userTeam: {
                  user: {
                    displayName: 'Winner',
                    walletAddress: '0x456...'
                  }
                }
              }
            ]
          }
        ],
        leaderboard: [
          {
            rank: 1,
            totalScore: 200,
            userTeam: {
              teamName: 'Winner Team',
              user: {
                displayName: 'Winner',
                walletAddress: '0x456...'
              }
            }
          }
        ],
        playerScores: [
          {
            player: {
              id: 'player-1',
              name: 'Player 1',
              team: 'Team A',
              role: 'BATSMAN'
            },
            runs: 50,
            ballsFaced: 30,
            wickets: 0,
            oversBowled: 0,
            runsConceded: 0,
            catches: 1,
            stumpings: 0,
            runOuts: 0,
            fantasyPoints: 100
          }
        ]
      };

      mockPrisma.tournament.findUnique.mockResolvedValue(mockTournament);

      const response = await request(app)
        .get(`/api/tournaments/${tournamentId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.tournament).toMatchObject({
        id: tournamentId,
        name: 'Test Tournament',
        team1: 'Team A',
        team2: 'Team B',
        status: 'UPCOMING'
      });
      expect(response.body.tournament.teams).toHaveLength(1);
      expect(response.body.tournament.rewardPools).toHaveLength(1);
      expect(response.body.tournament.leaderboard).toHaveLength(1);
      expect(response.body.tournament.playerScores).toHaveLength(1);

      expect(mockPrisma.tournament.findUnique).toHaveBeenCalledWith({
        where: { id: tournamentId },
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
    });

    it('should return 404 for non-existent tournament', async () => {
      const tournamentId = 'non-existent';

      mockPrisma.tournament.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .get(`/api/tournaments/${tournamentId}`)
        .expect(404);

      expect(response.body.error).toBe('Tournament not found');
    });

    it('should handle database errors', async () => {
      const tournamentId = 'tournament-1';

      mockPrisma.tournament.findUnique.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get(`/api/tournaments/${tournamentId}`)
        .expect(500);

      expect(response.body.error).toBe('Failed to fetch tournament');
    });
  });

  describe('GET /api/tournaments/:id/leaderboard', () => {
    it('should return tournament leaderboard successfully', async () => {
      const tournamentId = 'tournament-1';
      const mockLeaderboard = [
        {
          rank: 1,
          totalScore: 200,
          matchesPlayed: 1,
          userTeam: {
            teamName: 'Winner Team',
            user: {
              displayName: 'Winner',
              walletAddress: '0x456...'
            }
          }
        },
        {
          rank: 2,
          totalScore: 150,
          matchesPlayed: 1,
          userTeam: {
            teamName: 'Second Team',
            user: {
              displayName: 'Second',
              walletAddress: '0x789...'
            }
          }
        }
      ];

      mockPrisma.leaderboardEntry.findMany.mockResolvedValue(mockLeaderboard);

      const response = await request(app)
        .get(`/api/tournaments/${tournamentId}/leaderboard`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.leaderboard).toHaveLength(2);
      expect(response.body.leaderboard[0]).toMatchObject({
        rank: 1,
        totalScore: 200,
        matchesPlayed: 1,
        teamName: 'Winner Team'
      });

      expect(mockPrisma.leaderboardEntry.findMany).toHaveBeenCalledWith({
        where: { tournamentId },
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
        take: 50
      });
    });

    it('should handle custom limit parameter', async () => {
      const tournamentId = 'tournament-1';
      const limit = 10;

      mockPrisma.leaderboardEntry.findMany.mockResolvedValue([]);

      await request(app)
        .get(`/api/tournaments/${tournamentId}/leaderboard?limit=${limit}`)
        .expect(200);

      expect(mockPrisma.leaderboardEntry.findMany).toHaveBeenCalledWith({
        where: { tournamentId },
        include: expect.any(Object),
        orderBy: { rank: 'asc' },
        take: 10
      });
    });

    it('should handle database errors', async () => {
      const tournamentId = 'tournament-1';

      mockPrisma.leaderboardEntry.findMany.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get(`/api/tournaments/${tournamentId}/leaderboard`)
        .expect(500);

      expect(response.body.error).toBe('Failed to fetch leaderboard');
    });
  });

  describe('GET /api/tournaments/:id/players', () => {
    it('should return available players for tournament successfully', async () => {
      const tournamentId = 'tournament-1';
      const mockTournament = {
        team1: 'Team A',
        team2: 'Team B'
      };

      const mockPlayers = [
        {
          id: 'player-1',
          name: 'Player 1',
          team: 'Team A',
          role: 'BATSMAN',
          creditValue: 8
        },
        {
          id: 'player-2',
          name: 'Player 2',
          team: 'Team B',
          role: 'BOWLER',
          creditValue: 9
        }
      ];

      mockPrisma.tournament.findUnique.mockResolvedValue(mockTournament);
      mockPrisma.player.findMany.mockResolvedValue(mockPlayers);

      const response = await request(app)
        .get(`/api/tournaments/${tournamentId}/players`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.players).toHaveLength(2);
      expect(response.body.players[0]).toMatchObject({
        id: 'player-1',
        name: 'Player 1',
        team: 'Team A',
        role: 'BATSMAN',
        creditValue: 8
      });

      expect(mockPrisma.tournament.findUnique).toHaveBeenCalledWith({
        where: { id: tournamentId },
        select: { team1: true, team2: true }
      });
      expect(mockPrisma.player.findMany).toHaveBeenCalledWith({
        where: {
          team: {
            in: ['Team A', 'Team B']
          },
          isActive: true
        },
        orderBy: [
          { team: 'asc' },
          { role: 'asc' },
          { creditValue: 'desc' }
        ]
      });
    });

    it('should return 404 for non-existent tournament', async () => {
      const tournamentId = 'non-existent';

      mockPrisma.tournament.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .get(`/api/tournaments/${tournamentId}/players`)
        .expect(404);

      expect(response.body.error).toBe('Tournament not found');
    });

    it('should handle database errors', async () => {
      const tournamentId = 'tournament-1';

      mockPrisma.tournament.findUnique.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get(`/api/tournaments/${tournamentId}/players`)
        .expect(500);

      expect(response.body.error).toBe('Failed to fetch players');
    });
  });
});
