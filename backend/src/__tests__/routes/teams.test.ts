import request from 'supertest';
import express from 'express';
import teamsRouter from '../../routes/teams';
import { mockPrisma } from '../setup';

// Create Express app for testing
const app = express();
app.use(express.json());
app.use('/api/teams', teamsRouter);

describe('Teams Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/teams', () => {
    it('should create a team successfully', async () => {
      const teamData = {
        userId: 'user-1',
        tournamentId: 'tournament-1',
        teamName: 'Test Team',
        captainId: 'player-1',
        viceCaptainId: 'player-2',
        playerIds: ['player-1', 'player-2', 'player-3', 'player-4', 'player-5', 'player-6', 'player-7', 'player-8', 'player-9', 'player-10', 'player-11']
      };

      const mockTournament = {
        id: 'tournament-1',
        name: 'Test Tournament',
        status: 'UPCOMING',
        team1: 'Team A',
        team2: 'Team B',
        maxParticipants: 100,
        currentParticipants: 0
      };

      const mockPlayers = Array.from({ length: 11 }, (_, i) => ({
        id: `player-${i + 1}`,
        name: `Player ${i + 1}`,
        team: i < 6 ? 'Team A' : 'Team B',
        role: 'BATSMAN',
        creditValue: 8
      }));

      const mockTeam = {
        id: 'team-1',
        teamName: teamData.teamName,
        captainId: teamData.captainId,
        viceCaptainId: teamData.viceCaptainId,
        totalCredits: 88,
        createdAt: new Date()
      };

      mockPrisma.tournament.findUnique.mockResolvedValue(mockTournament);
      mockPrisma.userTeam.findUnique.mockResolvedValue(null);
      mockPrisma.player.findMany.mockResolvedValue(mockPlayers);
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return await callback({
          userTeam: {
            create: jest.fn().mockResolvedValue(mockTeam)
          },
          userTeamPlayer: {
            createMany: jest.fn().mockResolvedValue({})
          },
          tournament: {
            update: jest.fn().mockResolvedValue({})
          }
        });
      });

      const response = await request(app)
        .post('/api/teams')
        .send(teamData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.team).toMatchObject({
        id: 'team-1',
        teamName: teamData.teamName,
        captainId: teamData.captainId,
        viceCaptainId: teamData.viceCaptainId,
        totalCredits: 88
      });

      expect(mockPrisma.tournament.findUnique).toHaveBeenCalledWith({
        where: { id: teamData.tournamentId }
      });
    });

    it('should return 400 for missing required fields', async () => {
      const invalidData = {
        userId: 'user-1',
        tournamentId: 'tournament-1',
        teamName: 'Test Team'
        // Missing captainId, viceCaptainId, playerIds
      };

      const response = await request(app)
        .post('/api/teams')
        .send(invalidData)
        .expect(400);

      expect(response.body.error).toBe('All fields are required');
      expect(mockPrisma.tournament.findUnique).not.toHaveBeenCalled();
    });

    it('should return 400 for incorrect number of players', async () => {
      const invalidData = {
        userId: 'user-1',
        tournamentId: 'tournament-1',
        teamName: 'Test Team',
        captainId: 'player-1',
        viceCaptainId: 'player-2',
        playerIds: ['player-1', 'player-2'] // Only 2 players, should be 11
      };

      const response = await request(app)
        .post('/api/teams')
        .send(invalidData)
        .expect(400);

      expect(response.body.error).toBe('Team must have exactly 11 players');
    });

    it('should return 400 when captain/vice-captain not in team', async () => {
      const invalidData = {
        userId: 'user-1',
        tournamentId: 'tournament-1',
        teamName: 'Test Team',
        captainId: 'player-1',
        viceCaptainId: 'player-2',
        playerIds: ['player-3', 'player-4', 'player-5', 'player-6', 'player-7', 'player-8', 'player-9', 'player-10', 'player-11', 'player-12', 'player-13'] // Captain and vice-captain not included
      };

      const response = await request(app)
        .post('/api/teams')
        .send(invalidData)
        .expect(400);

      expect(response.body.error).toBe('Captain and vice-captain must be in the team');
    });

    it('should return 404 for non-existent tournament', async () => {
      const teamData = {
        userId: 'user-1',
        tournamentId: 'non-existent',
        teamName: 'Test Team',
        captainId: 'player-1',
        viceCaptainId: 'player-2',
        playerIds: Array.from({ length: 11 }, (_, i) => `player-${i + 1}`)
      };

      mockPrisma.tournament.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/teams')
        .send(teamData)
        .expect(404);

      expect(response.body.error).toBe('Tournament not found');
    });

    it('should return 400 when tournament is not upcoming', async () => {
      const teamData = {
        userId: 'user-1',
        tournamentId: 'tournament-1',
        teamName: 'Test Team',
        captainId: 'player-1',
        viceCaptainId: 'player-2',
        playerIds: Array.from({ length: 11 }, (_, i) => `player-${i + 1}`)
      };

      const mockTournament = {
        id: 'tournament-1',
        status: 'ONGOING' // Not upcoming
      };

      mockPrisma.tournament.findUnique.mockResolvedValue(mockTournament);

      const response = await request(app)
        .post('/api/teams')
        .send(teamData)
        .expect(400);

      expect(response.body.error).toBe('Tournament is not open for team creation');
    });

    it('should return 400 when user already has a team', async () => {
      const teamData = {
        userId: 'user-1',
        tournamentId: 'tournament-1',
        teamName: 'Test Team',
        captainId: 'player-1',
        viceCaptainId: 'player-2',
        playerIds: Array.from({ length: 11 }, (_, i) => `player-${i + 1}`)
      };

      const mockTournament = {
        id: 'tournament-1',
        status: 'UPCOMING',
        team1: 'Team A',
        team2: 'Team B',
        maxParticipants: 100,
        currentParticipants: 0
      };

      const mockExistingTeam = {
        id: 'existing-team-1',
        userId: 'user-1',
        tournamentId: 'tournament-1'
      };

      mockPrisma.tournament.findUnique.mockResolvedValue(mockTournament);
      mockPrisma.userTeam.findUnique.mockResolvedValue(mockExistingTeam);

      const response = await request(app)
        .post('/api/teams')
        .send(teamData)
        .expect(400);

      expect(response.body.error).toBe('User already has a team in this tournament');
    });

    it('should return 400 when tournament is full', async () => {
      const teamData = {
        userId: 'user-1',
        tournamentId: 'tournament-1',
        teamName: 'Test Team',
        captainId: 'player-1',
        viceCaptainId: 'player-2',
        playerIds: Array.from({ length: 11 }, (_, i) => `player-${i + 1}`)
      };

      const mockTournament = {
        id: 'tournament-1',
        status: 'UPCOMING',
        team1: 'Team A',
        team2: 'Team B',
        maxParticipants: 10,
        currentParticipants: 10 // Tournament is full
      };

      mockPrisma.tournament.findUnique.mockResolvedValue(mockTournament);
      mockPrisma.userTeam.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/teams')
        .send(teamData)
        .expect(400);

      expect(response.body.error).toBe('Tournament is full');
    });

    it('should return 400 for invalid players', async () => {
      const teamData = {
        userId: 'user-1',
        tournamentId: 'tournament-1',
        teamName: 'Test Team',
        captainId: 'player-1',
        viceCaptainId: 'player-2',
        playerIds: Array.from({ length: 11 }, (_, i) => `player-${i + 1}`)
      };

      const mockTournament = {
        id: 'tournament-1',
        status: 'UPCOMING',
        team1: 'Team A',
        team2: 'Team B',
        maxParticipants: 100,
        currentParticipants: 0
      };

      const mockPlayers = Array.from({ length: 10 }, (_, i) => ({
        id: `player-${i + 1}`,
        name: `Player ${i + 1}`,
        team: 'Team A',
        role: 'BATSMAN',
        creditValue: 8
      })); // Only 10 players, should be 11

      mockPrisma.tournament.findUnique.mockResolvedValue(mockTournament);
      mockPrisma.userTeam.findUnique.mockResolvedValue(null);
      mockPrisma.player.findMany.mockResolvedValue(mockPlayers);

      const response = await request(app)
        .post('/api/teams')
        .send(teamData)
        .expect(400);

      expect(response.body.error).toBe('Invalid players selected');
    });

    it('should return 400 when team exceeds credit limit', async () => {
      const teamData = {
        userId: 'user-1',
        tournamentId: 'tournament-1',
        teamName: 'Test Team',
        captainId: 'player-1',
        viceCaptainId: 'player-2',
        playerIds: Array.from({ length: 11 }, (_, i) => `player-${i + 1}`)
      };

      const mockTournament = {
        id: 'tournament-1',
        status: 'UPCOMING',
        team1: 'Team A',
        team2: 'Team B',
        maxParticipants: 100,
        currentParticipants: 0
      };

      const mockPlayers = Array.from({ length: 11 }, (_, i) => ({
        id: `player-${i + 1}`,
        name: `Player ${i + 1}`,
        team: 'Team A',
        role: 'BATSMAN',
        creditValue: 10 // Each player costs 10 credits, total = 110 > 100
      }));

      mockPrisma.tournament.findUnique.mockResolvedValue(mockTournament);
      mockPrisma.userTeam.findUnique.mockResolvedValue(null);
      mockPrisma.player.findMany.mockResolvedValue(mockPlayers);

      const response = await request(app)
        .post('/api/teams')
        .send(teamData)
        .expect(400);

      expect(response.body.error).toBe('Team exceeds credit limit of 100');
    });

    it('should handle database errors', async () => {
      const teamData = {
        userId: 'user-1',
        tournamentId: 'tournament-1',
        teamName: 'Test Team',
        captainId: 'player-1',
        viceCaptainId: 'player-2',
        playerIds: Array.from({ length: 11 }, (_, i) => `player-${i + 1}`)
      };

      mockPrisma.tournament.findUnique.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/api/teams')
        .send(teamData)
        .expect(500);

      expect(response.body.error).toBe('Failed to create team');
    });
  });

  describe('GET /api/teams/user/:userId', () => {
    it('should return user teams successfully', async () => {
      const userId = 'user-1';
      const mockTeams = [
        {
          id: 'team-1',
          teamName: 'Test Team 1',
          captainId: 'player-1',
          viceCaptainId: 'player-2',
          totalCredits: 88,
          createdAt: new Date(),
          tournament: {
            id: 'tournament-1',
            name: 'Test Tournament',
            matchDate: new Date(),
            team1: 'Team A',
            team2: 'Team B',
            status: 'UPCOMING'
          },
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
          ],
          scores: [
            {
              totalScore: 150
            }
          ],
          rewards: [
            {
              id: 'reward-1',
              amount: 100,
              status: 'COMPLETED'
            }
          ]
        }
      ];

      mockPrisma.userTeam.findMany.mockResolvedValue(mockTeams);

      const response = await request(app)
        .get(`/api/teams/user/${userId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.teams).toHaveLength(1);
      expect(response.body.teams[0]).toMatchObject({
        id: 'team-1',
        teamName: 'Test Team 1',
        captainId: 'player-1',
        viceCaptainId: 'player-2',
        totalCredits: 88
      });

      expect(mockPrisma.userTeam.findMany).toHaveBeenCalledWith({
        where: { userId },
        include: {
          tournament: {
            select: {
              id: true,
              name: true,
              matchDate: true,
              team1: true,
              team2: true,
              status: true
            }
          },
          players: {
            include: {
              player: true
            }
          },
          scores: true,
          rewards: {
            include: {
              rewardPool: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
    });

    it('should filter teams by tournament ID', async () => {
      const userId = 'user-1';
      const tournamentId = 'tournament-1';

      mockPrisma.userTeam.findMany.mockResolvedValue([]);

      await request(app)
        .get(`/api/teams/user/${userId}?tournamentId=${tournamentId}`)
        .expect(200);

      expect(mockPrisma.userTeam.findMany).toHaveBeenCalledWith({
        where: { userId, tournamentId },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' }
      });
    });

    it('should handle database errors', async () => {
      const userId = 'user-1';

      mockPrisma.userTeam.findMany.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get(`/api/teams/user/${userId}`)
        .expect(500);

      expect(response.body.error).toBe('Failed to fetch teams');
    });
  });

  describe('GET /api/teams/:id', () => {
    it('should return team details successfully', async () => {
      const teamId = 'team-1';
      const mockTeam = {
        id: teamId,
        teamName: 'Test Team',
        captainId: 'player-1',
        viceCaptainId: 'player-2',
        totalCredits: 88,
        createdAt: new Date(),
        user: {
          displayName: 'Test User',
          walletAddress: '0x123...'
        },
        tournament: {
          id: 'tournament-1',
          name: 'Test Tournament'
        },
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
        ],
        scores: [
          {
            totalScore: 150
          }
        ],
        rewards: [
          {
            id: 'reward-1',
            amount: 100,
            status: 'COMPLETED'
          }
        ]
      };

      mockPrisma.userTeam.findUnique.mockResolvedValue(mockTeam);

      const response = await request(app)
        .get(`/api/teams/${teamId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.team).toMatchObject({
        id: teamId,
        teamName: 'Test Team',
        captainId: 'player-1',
        viceCaptainId: 'player-2',
        totalCredits: 88
      });

      expect(mockPrisma.userTeam.findUnique).toHaveBeenCalledWith({
        where: { id: teamId },
        include: {
          user: {
            select: {
              displayName: true,
              walletAddress: true
            }
          },
          tournament: true,
          players: {
            include: {
              player: true
            }
          },
          scores: true,
          rewards: {
            include: {
              rewardPool: true
            }
          }
        }
      });
    });

    it('should return 404 for non-existent team', async () => {
      const teamId = 'non-existent';

      mockPrisma.userTeam.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .get(`/api/teams/${teamId}`)
        .expect(404);

      expect(response.body.error).toBe('Team not found');
    });

    it('should handle database errors', async () => {
      const teamId = 'team-1';

      mockPrisma.userTeam.findUnique.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get(`/api/teams/${teamId}`)
        .expect(500);

      expect(response.body.error).toBe('Failed to fetch team');
    });
  });

  describe('PUT /api/teams/:id', () => {
    it('should update team successfully', async () => {
      const teamId = 'team-1';
      const updateData = {
        teamName: 'Updated Team',
        captainId: 'player-2',
        viceCaptainId: 'player-3'
      };

      const mockCurrentTeam = {
        id: teamId,
        teamName: 'Original Team',
        captainId: 'player-1',
        viceCaptainId: 'player-2',
        tournament: {
          status: 'UPCOMING',
          team1: 'Team A',
          team2: 'Team B'
        },
        players: [
          {
            player: {
              id: 'player-1',
              creditValue: 8
            }
          }
        ]
      };

      const mockUpdatedTeam = {
        id: teamId,
        teamName: 'Updated Team',
        captainId: 'player-2',
        viceCaptainId: 'player-3',
        totalCredits: 88
      };

      mockPrisma.userTeam.findUnique.mockResolvedValue(mockCurrentTeam);
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return await callback({
          userTeam: {
            update: jest.fn().mockResolvedValue(mockUpdatedTeam)
          }
        });
      });

      const response = await request(app)
        .put(`/api/teams/${teamId}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.team).toMatchObject({
        id: teamId,
        teamName: 'Updated Team',
        captainId: 'player-2',
        viceCaptainId: 'player-3'
      });

      expect(mockPrisma.userTeam.findUnique).toHaveBeenCalledWith({
        where: { id: teamId },
        include: {
          tournament: true,
          players: {
            include: {
              player: true
            }
          }
        }
      });
    });

    it('should return 404 for non-existent team', async () => {
      const teamId = 'non-existent';

      mockPrisma.userTeam.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .put(`/api/teams/${teamId}`)
        .send({ teamName: 'Updated Team' })
        .expect(404);

      expect(response.body.error).toBe('Team not found');
    });

    it('should return 400 when tournament is not upcoming', async () => {
      const teamId = 'team-1';
      const mockCurrentTeam = {
        id: teamId,
        tournament: {
          status: 'ONGOING' // Not upcoming
        }
      };

      mockPrisma.userTeam.findUnique.mockResolvedValue(mockCurrentTeam);

      const response = await request(app)
        .put(`/api/teams/${teamId}`)
        .send({ teamName: 'Updated Team' })
        .expect(400);

      expect(response.body.error).toBe('Cannot modify team after tournament starts');
    });

    it('should handle database errors', async () => {
      const teamId = 'team-1';

      mockPrisma.userTeam.findUnique.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .put(`/api/teams/${teamId}`)
        .send({ teamName: 'Updated Team' })
        .expect(500);

      expect(response.body.error).toBe('Database error');
    });
  });

  describe('DELETE /api/teams/:id', () => {
    it('should delete team successfully', async () => {
      const teamId = 'team-1';
      const mockTeam = {
        id: teamId,
        tournamentId: 'tournament-1',
        tournament: {
          status: 'UPCOMING'
        }
      };

      mockPrisma.userTeam.findUnique.mockResolvedValue(mockTeam);
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return await callback({
          userTeamPlayer: {
            deleteMany: jest.fn().mockResolvedValue({})
          },
          userTeam: {
            delete: jest.fn().mockResolvedValue({})
          },
          tournament: {
            update: jest.fn().mockResolvedValue({})
          }
        });
      });

      const response = await request(app)
        .delete(`/api/teams/${teamId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Team deleted successfully');

      expect(mockPrisma.userTeam.findUnique).toHaveBeenCalledWith({
        where: { id: teamId },
        include: { tournament: true }
      });
    });

    it('should return 404 for non-existent team', async () => {
      const teamId = 'non-existent';

      mockPrisma.userTeam.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .delete(`/api/teams/${teamId}`)
        .expect(404);

      expect(response.body.error).toBe('Team not found');
    });

    it('should return 400 when tournament is not upcoming', async () => {
      const teamId = 'team-1';
      const mockTeam = {
        id: teamId,
        tournament: {
          status: 'ONGOING' // Not upcoming
        }
      };

      mockPrisma.userTeam.findUnique.mockResolvedValue(mockTeam);

      const response = await request(app)
        .delete(`/api/teams/${teamId}`)
        .expect(400);

      expect(response.body.error).toBe('Cannot delete team after tournament starts');
    });

    it('should handle database errors', async () => {
      const teamId = 'team-1';

      mockPrisma.userTeam.findUnique.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .delete(`/api/teams/${teamId}`)
        .expect(500);

      expect(response.body.error).toBe('Failed to delete team');
    });
  });
});
