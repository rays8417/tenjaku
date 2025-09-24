import request from 'supertest';
import express from 'express';
import adminRouter from '../../routes/admin';
import { mockPrisma } from '../setup';

// Create Express app for testing
const app = express();
app.use(express.json());
app.use('/api/admin', adminRouter);

describe('Admin Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/admin/tournaments', () => {
    it('should create a tournament successfully', async () => {
      const tournamentData = {
        name: 'Test Tournament',
        description: 'A test tournament',
        matchDate: '2024-12-25T10:00:00Z',
        team1: 'Team A',
        team2: 'Team B',
        venue: 'Test Stadium',
        entryFee: 10,
        maxParticipants: 100
      };

      const mockTournament = {
        id: 'tournament-1',
        ...tournamentData,
        matchDate: new Date(tournamentData.matchDate),
        status: 'UPCOMING',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockPrisma.tournament.create.mockResolvedValue(mockTournament);

      const response = await request(app)
        .post('/api/admin/tournaments')
        .send(tournamentData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.tournament).toMatchObject({
        id: mockTournament.id,
        name: tournamentData.name,
        description: tournamentData.description,
        team1: tournamentData.team1,
        team2: tournamentData.team2,
        venue: tournamentData.venue,
        entryFee: tournamentData.entryFee,
        maxParticipants: tournamentData.maxParticipants,
        status: 'UPCOMING'
      });

      expect(mockPrisma.tournament.create).toHaveBeenCalledWith({
        data: {
          name: tournamentData.name,
          description: tournamentData.description,
          matchDate: new Date(tournamentData.matchDate),
          team1: tournamentData.team1,
          team2: tournamentData.team2,
          venue: tournamentData.venue,
          entryFee: tournamentData.entryFee,
          maxParticipants: tournamentData.maxParticipants,
          status: 'UPCOMING'
        }
      });
    });

    it('should create tournament with minimal required fields', async () => {
      const tournamentData = {
        name: 'Minimal Tournament',
        matchDate: '2024-12-25T10:00:00Z',
        team1: 'Team A',
        team2: 'Team B'
      };

      const mockTournament = {
        id: 'tournament-2',
        ...tournamentData,
        matchDate: new Date(tournamentData.matchDate),
        description: null,
        venue: null,
        entryFee: 0,
        maxParticipants: null,
        status: 'UPCOMING',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockPrisma.tournament.create.mockResolvedValue(mockTournament);

      const response = await request(app)
        .post('/api/admin/tournaments')
        .send(tournamentData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockPrisma.tournament.create).toHaveBeenCalledWith({
        data: {
          name: tournamentData.name,
          description: null,
          matchDate: new Date(tournamentData.matchDate),
          team1: tournamentData.team1,
          team2: tournamentData.team2,
          venue: null,
          entryFee: 0,
          maxParticipants: null,
          status: 'UPCOMING'
        }
      });
    });

    it('should return 400 for missing required fields', async () => {
      const invalidData = {
        name: 'Test Tournament',
        // Missing matchDate, team1, team2
      };

      const response = await request(app)
        .post('/api/admin/tournaments')
        .send(invalidData)
        .expect(400);

      expect(response.body.error).toBe('Name, match date, team1, and team2 are required');
      expect(mockPrisma.tournament.create).not.toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      const tournamentData = {
        name: 'Test Tournament',
        matchDate: '2024-12-25T10:00:00Z',
        team1: 'Team A',
        team2: 'Team B'
      };

      mockPrisma.tournament.create.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/api/admin/tournaments')
        .send(tournamentData)
        .expect(500);

      expect(response.body.error).toBe('Failed to create tournament');
    });
  });

  describe('PUT /api/admin/tournaments/:id', () => {
    it('should update tournament successfully', async () => {
      const tournamentId = 'tournament-1';
      const updateData = {
        name: 'Updated Tournament',
        description: 'Updated description',
        status: 'ONGOING'
      };

      const mockUpdatedTournament = {
        id: tournamentId,
        name: updateData.name,
        description: updateData.description,
        matchDate: new Date('2024-12-25T10:00:00Z'),
        team1: 'Team A',
        team2: 'Team B',
        venue: 'Test Stadium',
        entryFee: 10,
        maxParticipants: 100,
        status: updateData.status,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockPrisma.tournament.update.mockResolvedValue(mockUpdatedTournament);

      const response = await request(app)
        .put(`/api/admin/tournaments/${tournamentId}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.tournament).toMatchObject({
        id: tournamentId,
        name: updateData.name,
        description: updateData.description,
        status: updateData.status
      });

      expect(mockPrisma.tournament.update).toHaveBeenCalledWith({
        where: { id: tournamentId },
        data: {
          name: updateData.name,
          description: updateData.description,
          matchDate: undefined,
          team1: undefined,
          team2: undefined,
          venue: undefined,
          entryFee: undefined,
          maxParticipants: undefined,
          status: updateData.status
        }
      });
    });

    it('should handle partial updates', async () => {
      const tournamentId = 'tournament-1';
      const updateData = {
        name: 'Partially Updated Tournament'
      };

      const mockUpdatedTournament = {
        id: tournamentId,
        name: updateData.name,
        description: 'Original description',
        matchDate: new Date('2024-12-25T10:00:00Z'),
        team1: 'Team A',
        team2: 'Team B',
        venue: 'Test Stadium',
        entryFee: 10,
        maxParticipants: 100,
        status: 'UPCOMING',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockPrisma.tournament.update.mockResolvedValue(mockUpdatedTournament);

      const response = await request(app)
        .put(`/api/admin/tournaments/${tournamentId}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockPrisma.tournament.update).toHaveBeenCalledWith({
        where: { id: tournamentId },
        data: {
          name: updateData.name,
          description: undefined,
          matchDate: undefined,
          team1: undefined,
          team2: undefined,
          venue: undefined,
          entryFee: undefined,
          maxParticipants: undefined,
          status: undefined
        }
      });
    });

    it('should handle database errors', async () => {
      const tournamentId = 'tournament-1';
      const updateData = { name: 'Updated Tournament' };

      mockPrisma.tournament.update.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .put(`/api/admin/tournaments/${tournamentId}`)
        .send(updateData)
        .expect(500);

      expect(response.body.error).toBe('Failed to update tournament');
    });
  });

  describe('DELETE /api/admin/tournaments/:id', () => {
    it('should delete tournament successfully when no participants', async () => {
      const tournamentId = 'tournament-1';
      const mockTournament = {
        id: tournamentId,
        name: 'Test Tournament',
        _count: { teams: 0 }
      };

      mockPrisma.tournament.findUnique.mockResolvedValue(mockTournament);
      mockPrisma.tournament.delete.mockResolvedValue({});

      const response = await request(app)
        .delete(`/api/admin/tournaments/${tournamentId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Tournament deleted successfully');

      expect(mockPrisma.tournament.findUnique).toHaveBeenCalledWith({
        where: { id: tournamentId },
        include: {
          _count: {
            select: {
              teams: true
            }
          }
        }
      });
      expect(mockPrisma.tournament.delete).toHaveBeenCalledWith({
        where: { id: tournamentId }
      });
    });

    it('should return 404 for non-existent tournament', async () => {
      const tournamentId = 'non-existent';

      mockPrisma.tournament.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .delete(`/api/admin/tournaments/${tournamentId}`)
        .expect(404);

      expect(response.body.error).toBe('Tournament not found');
      expect(mockPrisma.tournament.delete).not.toHaveBeenCalled();
    });

    it('should return 400 when tournament has participants', async () => {
      const tournamentId = 'tournament-1';
      const mockTournament = {
        id: tournamentId,
        name: 'Test Tournament',
        _count: { teams: 5 }
      };

      mockPrisma.tournament.findUnique.mockResolvedValue(mockTournament);

      const response = await request(app)
        .delete(`/api/admin/tournaments/${tournamentId}`)
        .expect(400);

      expect(response.body.error).toBe('Cannot delete tournament with participants');
      expect(mockPrisma.tournament.delete).not.toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      const tournamentId = 'tournament-1';

      mockPrisma.tournament.findUnique.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .delete(`/api/admin/tournaments/${tournamentId}`)
        .expect(500);

      expect(response.body.error).toBe('Failed to delete tournament');
    });
  });

  describe('POST /api/admin/players', () => {
    it('should create a player successfully', async () => {
      const playerData = {
        name: 'Test Player',
        team: 'Team A',
        role: 'BATSMAN',
        creditValue: 8.5
      };

      const mockPlayer = {
        id: 'player-1',
        ...playerData,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockPrisma.player.create.mockResolvedValue(mockPlayer);

      const response = await request(app)
        .post('/api/admin/players')
        .send(playerData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.player).toMatchObject({
        id: mockPlayer.id,
        name: playerData.name,
        team: playerData.team,
        role: playerData.role,
        creditValue: playerData.creditValue,
        isActive: true
      });

      expect(mockPrisma.player.create).toHaveBeenCalledWith({
        data: playerData
      });
    });

    it('should return 400 for missing required fields', async () => {
      const invalidData = {
        name: 'Test Player',
        team: 'Team A'
        // Missing role and creditValue
      };

      const response = await request(app)
        .post('/api/admin/players')
        .send(invalidData)
        .expect(400);

      expect(response.body.error).toBe('Name, team, role, and credit value are required');
      expect(mockPrisma.player.create).not.toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      const playerData = {
        name: 'Test Player',
        team: 'Team A',
        role: 'BATSMAN',
        creditValue: 8.5
      };

      mockPrisma.player.create.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/api/admin/players')
        .send(playerData)
        .expect(500);

      expect(response.body.error).toBe('Failed to create player');
    });
  });

  describe('PUT /api/admin/players/:id', () => {
    it('should update player successfully', async () => {
      const playerId = 'player-1';
      const updateData = {
        name: 'Updated Player',
        creditValue: 9.0,
        isActive: false
      };

      const mockUpdatedPlayer = {
        id: playerId,
        name: updateData.name,
        team: 'Team A',
        role: 'BATSMAN',
        creditValue: updateData.creditValue,
        isActive: updateData.isActive,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockPrisma.player.update.mockResolvedValue(mockUpdatedPlayer);

      const response = await request(app)
        .put(`/api/admin/players/${playerId}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.player).toMatchObject({
        id: playerId,
        name: updateData.name,
        creditValue: updateData.creditValue,
        isActive: updateData.isActive
      });

      expect(mockPrisma.player.update).toHaveBeenCalledWith({
        where: { id: playerId },
        data: {
          name: updateData.name,
          team: undefined,
          role: undefined,
          creditValue: updateData.creditValue,
          isActive: updateData.isActive
        }
      });
    });

    it('should handle database errors', async () => {
      const playerId = 'player-1';
      const updateData = { name: 'Updated Player' };

      mockPrisma.player.update.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .put(`/api/admin/players/${playerId}`)
        .send(updateData)
        .expect(500);

      expect(response.body.error).toBe('Failed to update player');
    });
  });

  describe('GET /api/admin/stats', () => {
    it('should return admin statistics successfully', async () => {
      const mockStats = {
        totalUsers: 100,
        totalTournaments: 25,
        totalTeams: 150,
        totalRewards: 50,
        activeTournaments: 5,
        completedTournaments: 20,
        totalEarnings: { _sum: { totalEarnings: 1000 } },
        totalSpent: { _sum: { totalSpent: 500 } }
      };

      mockPrisma.user.count.mockResolvedValue(mockStats.totalUsers);
      mockPrisma.tournament.count.mockResolvedValueOnce(mockStats.totalTournaments);
      mockPrisma.tournament.count.mockResolvedValueOnce(mockStats.activeTournaments);
      mockPrisma.tournament.count.mockResolvedValueOnce(mockStats.completedTournaments);
      mockPrisma.userTeam.count.mockResolvedValue(mockStats.totalTeams);
      mockPrisma.userReward.count.mockResolvedValue(mockStats.totalRewards);
      mockPrisma.user.aggregate.mockResolvedValueOnce(mockStats.totalEarnings);
      mockPrisma.user.aggregate.mockResolvedValueOnce(mockStats.totalSpent);

      const response = await request(app)
        .get('/api/admin/stats')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.stats).toEqual({
        users: {
          total: 100,
          totalEarnings: 1000,
          totalSpent: 500
        },
        tournaments: {
          total: 25,
          active: 5,
          completed: 20
        },
        teams: {
          total: 150
        },
        rewards: {
          total: 50
        }
      });
    });

    it('should handle null earnings and spent values', async () => {
      const mockStats = {
        totalUsers: 0,
        totalTournaments: 0,
        totalTeams: 0,
        totalRewards: 0,
        activeTournaments: 0,
        completedTournaments: 0,
        totalEarnings: { _sum: { totalEarnings: null } },
        totalSpent: { _sum: { totalSpent: null } }
      };

      mockPrisma.user.count.mockResolvedValue(mockStats.totalUsers);
      mockPrisma.tournament.count.mockResolvedValueOnce(mockStats.totalTournaments);
      mockPrisma.tournament.count.mockResolvedValueOnce(mockStats.activeTournaments);
      mockPrisma.tournament.count.mockResolvedValueOnce(mockStats.completedTournaments);
      mockPrisma.userTeam.count.mockResolvedValue(mockStats.totalTeams);
      mockPrisma.userReward.count.mockResolvedValue(mockStats.totalRewards);
      mockPrisma.user.aggregate.mockResolvedValueOnce(mockStats.totalEarnings);
      mockPrisma.user.aggregate.mockResolvedValueOnce(mockStats.totalSpent);

      const response = await request(app)
        .get('/api/admin/stats')
        .expect(200);

      expect(response.body.stats.users.totalEarnings).toBe(0);
      expect(response.body.stats.users.totalSpent).toBe(0);
    });

    it('should handle database errors', async () => {
      mockPrisma.user.count.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/admin/stats')
        .expect(500);

      expect(response.body.error).toBe('Failed to fetch admin stats');
    });
  });

  describe('GET /api/admin/tournaments', () => {
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
          currentParticipants: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
          _count: { teams: 5, rewardPools: 2 },
          rewardPools: [
            { id: 'pool-1', name: 'Pool 1', totalAmount: 100, distributedAmount: 0 }
          ]
        }
      ];

      mockPrisma.tournament.findMany.mockResolvedValue(mockTournaments);

      const response = await request(app)
        .get('/api/admin/tournaments')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.tournaments).toHaveLength(1);
      expect(response.body.tournaments[0]).toMatchObject({
        id: 'tournament-1',
        name: 'Test Tournament 1',
        participantCount: 5,
        rewardPoolCount: 2
      });

      expect(mockPrisma.tournament.findMany).toHaveBeenCalledWith({
        where: {},
        include: {
          _count: {
            select: {
              teams: true,
              rewardPools: true
            }
          },
          rewardPools: {
            select: {
              id: true,
              name: true,
              totalAmount: true,
              distributedAmount: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
        skip: 0
      });
    });

    it('should filter tournaments by status', async () => {
      mockPrisma.tournament.findMany.mockResolvedValue([]);

      await request(app)
        .get('/api/admin/tournaments?status=ONGOING')
        .expect(200);

      expect(mockPrisma.tournament.findMany).toHaveBeenCalledWith({
        where: { status: 'ONGOING' },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
        take: 50,
        skip: 0
      });
    });

    it('should handle pagination parameters', async () => {
      mockPrisma.tournament.findMany.mockResolvedValue([]);

      await request(app)
        .get('/api/admin/tournaments?limit=10&offset=20')
        .expect(200);

      expect(mockPrisma.tournament.findMany).toHaveBeenCalledWith({
        where: {},
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
        take: 10,
        skip: 20
      });
    });

    it('should handle database errors', async () => {
      mockPrisma.tournament.findMany.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/admin/tournaments')
        .expect(500);

      expect(response.body.error).toBe('Failed to fetch tournaments');
    });
  });

  describe('GET /api/admin/users', () => {
    it('should return users successfully', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          walletAddress: '0x123...',
          displayName: 'Test User',
          avatar: 'avatar.jpg',
          totalEarnings: 100,
          totalSpent: 50,
          joinDate: new Date(),
          lastActive: new Date(),
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          _count: { teams: 3 }
        }
      ];

      mockPrisma.user.findMany.mockResolvedValue(mockUsers);

      const response = await request(app)
        .get('/api/admin/users')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.users).toHaveLength(1);
      expect(response.body.users[0]).toMatchObject({
        id: 'user-1',
        walletAddress: '0x123...',
        displayName: 'Test User',
        teamCount: 3
      });

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        include: {
          _count: {
            select: {
              teams: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
        skip: 0
      });
    });

    it('should handle pagination parameters', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);

      await request(app)
        .get('/api/admin/users?limit=25&offset=10')
        .expect(200);

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
        take: 25,
        skip: 10
      });
    });

    it('should handle database errors', async () => {
      mockPrisma.user.findMany.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/admin/users')
        .expect(500);

      expect(response.body.error).toBe('Failed to fetch users');
    });
  });
});
