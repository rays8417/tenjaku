import request from 'supertest';
import express from 'express';
import scoringRouter from '../../routes/scoring';
import { mockPrisma } from '../setup';

// Create Express app for testing
const app = express();
app.use(express.json());
app.use('/api/scoring', scoringRouter);

describe('Scoring Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/scoring/player-scores', () => {
    it('should update player scores successfully', async () => {
      const scoreData = {
        tournamentId: 'tournament-1',
        playerScores: [
          {
            playerId: 'player-1',
            runs: 50,
            ballsFaced: 30,
            wickets: 2,
            oversBowled: 4,
            runsConceded: 20,
            catches: 1,
            stumpings: 0,
            runOuts: 1
          }
        ]
      };

      const mockTournament = {
        id: 'tournament-1',
        name: 'Test Tournament',
        status: 'ONGOING'
      };

      const mockPlayerScore = {
        id: 'score-1',
        tournamentId: 'tournament-1',
        playerId: 'player-1',
        runs: 50,
        ballsFaced: 30,
        wickets: 2,
        oversBowled: 4,
        runsConceded: 20,
        catches: 1,
        stumpings: 0,
        runOuts: 1,
        fantasyPoints: 120 // Calculated points
      };

      mockPrisma.tournament.findUnique.mockResolvedValue(mockTournament);
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return await callback({
          playerScore: {
            upsert: jest.fn().mockResolvedValue(mockPlayerScore)
          }
        });
      });

      const response = await request(app)
        .post('/api/scoring/player-scores')
        .send(scoreData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Player scores updated successfully');
      expect(response.body.scores).toHaveLength(1);

      expect(mockPrisma.tournament.findUnique).toHaveBeenCalledWith({
        where: { id: scoreData.tournamentId }
      });
    });

    it('should return 400 for missing required fields', async () => {
      const invalidData = {
        tournamentId: 'tournament-1'
        // Missing playerScores
      };

      const response = await request(app)
        .post('/api/scoring/player-scores')
        .send(invalidData)
        .expect(400);

      expect(response.body.error).toBe('Tournament ID and player scores array are required');
      expect(mockPrisma.tournament.findUnique).not.toHaveBeenCalled();
    });

    it('should return 400 for invalid player scores array', async () => {
      const invalidData = {
        tournamentId: 'tournament-1',
        playerScores: 'not-an-array'
      };

      const response = await request(app)
        .post('/api/scoring/player-scores')
        .send(invalidData)
        .expect(400);

      expect(response.body.error).toBe('Tournament ID and player scores array are required');
    });

    it('should return 404 for non-existent tournament', async () => {
      const scoreData = {
        tournamentId: 'non-existent',
        playerScores: [
          {
            playerId: 'player-1',
            runs: 50,
            ballsFaced: 30,
            wickets: 2,
            oversBowled: 4,
            runsConceded: 20,
            catches: 1,
            stumpings: 0,
            runOuts: 1
          }
        ]
      };

      mockPrisma.tournament.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/scoring/player-scores')
        .send(scoreData)
        .expect(404);

      expect(response.body.error).toBe('Tournament not found');
    });

    it('should handle database errors', async () => {
      const scoreData = {
        tournamentId: 'tournament-1',
        playerScores: [
          {
            playerId: 'player-1',
            runs: 50,
            ballsFaced: 30,
            wickets: 2,
            oversBowled: 4,
            runsConceded: 20,
            catches: 1,
            stumpings: 0,
            runOuts: 1
          }
        ]
      };

      mockPrisma.tournament.findUnique.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/api/scoring/player-scores')
        .send(scoreData)
        .expect(500);

      expect(response.body.error).toBe('Failed to update player scores');
    });
  });

  describe('POST /api/scoring/calculate-user-scores', () => {
    it('should calculate user scores successfully', async () => {
      const calculateData = {
        tournamentId: 'tournament-1'
      };

      const mockUserTeams = [
        {
          id: 'team-1',
          teamName: 'Test Team',
          captainId: 'player-1',
          viceCaptainId: 'player-2',
          players: [
            {
              playerId: 'player-1',
              player: { id: 'player-1', name: 'Player 1' }
            },
            {
              playerId: 'player-2',
              player: { id: 'player-2', name: 'Player 2' }
            }
          ]
        }
      ];

      const mockPlayerScore = {
        fantasyPoints: 100
      };

      const mockUserScore = {
        id: 'user-score-1',
        userTeamId: 'team-1',
        tournamentId: 'tournament-1',
        totalScore: 150,
        captainMultiplier: 1.5,
        viceCaptainMultiplier: 1.25
      };

      mockPrisma.userTeam.findMany.mockResolvedValue(mockUserTeams);
      mockPrisma.playerScore.findUnique.mockResolvedValue(mockPlayerScore);
      mockPrisma.userScore.upsert.mockResolvedValue(mockUserScore);

      const response = await request(app)
        .post('/api/scoring/calculate-user-scores')
        .send(calculateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('User scores calculated successfully');
      expect(response.body.scores).toHaveLength(1);
      expect(response.body.scores[0]).toMatchObject({
        teamId: 'team-1',
        teamName: 'Test Team',
        totalScore: 275 // 100 (base) + 150 (captain 1.5x) + 125 (vice-captain 1.25x)
      });

      expect(mockPrisma.userTeam.findMany).toHaveBeenCalledWith({
        where: { tournamentId: calculateData.tournamentId },
        include: {
          players: {
            include: {
              player: true
            }
          }
        }
      });
    });

    it('should return 400 for missing tournament ID', async () => {
      const invalidData = {};

      const response = await request(app)
        .post('/api/scoring/calculate-user-scores')
        .send(invalidData)
        .expect(400);

      expect(response.body.error).toBe('Tournament ID is required');
      expect(mockPrisma.userTeam.findMany).not.toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      const calculateData = {
        tournamentId: 'tournament-1'
      };

      mockPrisma.userTeam.findMany.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/api/scoring/calculate-user-scores')
        .send(calculateData)
        .expect(500);

      expect(response.body.error).toBe('Failed to calculate user scores');
    });
  });

  describe('POST /api/scoring/update-leaderboard', () => {
    it('should update leaderboard successfully', async () => {
      const updateData = {
        tournamentId: 'tournament-1'
      };

      const mockUserScores = [
        {
          userTeamId: 'team-1',
          totalScore: 200,
          userTeam: {
            teamName: 'Team 1',
            user: {
              displayName: 'User 1',
              walletAddress: '0x123...'
            }
          }
        },
        {
          userTeamId: 'team-2',
          totalScore: 150,
          userTeam: {
            teamName: 'Team 2',
            user: {
              displayName: 'User 2',
              walletAddress: '0x456...'
            }
          }
        }
      ];

      const mockLeaderboardEntry = {
        id: 'entry-1',
        tournamentId: 'tournament-1',
        userTeamId: 'team-1',
        totalScore: 200,
        rank: 1,
        matchesPlayed: 1
      };

      mockPrisma.userScore.findMany.mockResolvedValue(mockUserScores);
      mockPrisma.leaderboardEntry.upsert.mockResolvedValue(mockLeaderboardEntry);

      const response = await request(app)
        .post('/api/scoring/update-leaderboard')
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Leaderboard updated successfully');
      expect(response.body.leaderboard).toHaveLength(2);
      expect(response.body.leaderboard[0]).toMatchObject({
        rank: 1,
        teamName: 'Team 1',
        totalScore: 200
      });

      expect(mockPrisma.userScore.findMany).toHaveBeenCalledWith({
        where: { tournamentId: updateData.tournamentId },
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
        orderBy: { totalScore: 'desc' }
      });
    });

    it('should return 400 for missing tournament ID', async () => {
      const invalidData = {};

      const response = await request(app)
        .post('/api/scoring/update-leaderboard')
        .send(invalidData)
        .expect(400);

      expect(response.body.error).toBe('Tournament ID is required');
      expect(mockPrisma.userScore.findMany).not.toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      const updateData = {
        tournamentId: 'tournament-1'
      };

      mockPrisma.userScore.findMany.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/api/scoring/update-leaderboard')
        .send(updateData)
        .expect(500);

      expect(response.body.error).toBe('Failed to update leaderboard');
    });
  });

  describe('GET /api/scoring/tournament/:tournamentId/scores', () => {
    it('should return tournament scores successfully', async () => {
      const tournamentId = 'tournament-1';
      const mockTournament = {
        id: tournamentId,
        name: 'Test Tournament',
        team1: 'Team A',
        team2: 'Team B',
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
        ],
        userScores: [
          {
            userTeam: {
              teamName: 'User Team 1',
              user: {
                displayName: 'User 1',
                walletAddress: '0x123...'
              }
            },
            totalScore: 150,
            captainMultiplier: 1.5,
            viceCaptainMultiplier: 1.25
          }
        ]
      };

      mockPrisma.tournament.findUnique.mockResolvedValue(mockTournament);

      const response = await request(app)
        .get(`/api/scoring/tournament/${tournamentId}/scores`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.tournament).toMatchObject({
        id: tournamentId,
        name: 'Test Tournament',
        team1: 'Team A',
        team2: 'Team B'
      });
      expect(response.body.tournament.playerScores).toHaveLength(1);
      expect(response.body.tournament.userScores).toHaveLength(1);

      expect(mockPrisma.tournament.findUnique).toHaveBeenCalledWith({
        where: { id: tournamentId },
        include: {
          playerScores: {
            include: {
              player: true
            }
          },
          userScores: {
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
            orderBy: { totalScore: 'desc' }
          }
        }
      });
    });

    it('should return 404 for non-existent tournament', async () => {
      const tournamentId = 'non-existent';

      mockPrisma.tournament.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .get(`/api/scoring/tournament/${tournamentId}/scores`)
        .expect(404);

      expect(response.body.error).toBe('Tournament not found');
    });

    it('should handle database errors', async () => {
      const tournamentId = 'tournament-1';

      mockPrisma.tournament.findUnique.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get(`/api/scoring/tournament/${tournamentId}/scores`)
        .expect(500);

      expect(response.body.error).toBe('Failed to fetch scores');
    });
  });
});
