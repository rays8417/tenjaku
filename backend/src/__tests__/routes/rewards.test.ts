import request from 'supertest';
import express from 'express';
import rewardsRouter from '../../routes/rewards';
import { mockPrisma } from '../setup';

// Create Express app for testing
const app = express();
app.use(express.json());
app.use('/api/rewards', rewardsRouter);

describe('Rewards Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/rewards/create-pool', () => {
    it('should create a reward pool successfully', async () => {
      const poolData = {
        tournamentId: 'tournament-1',
        name: 'Winner Pool',
        totalAmount: 1000,
        distributionType: 'PERCENTAGE',
        distributionRules: JSON.stringify({
          rules: [
            { rank: 1, percentage: 50 },
            { rank: 2, percentage: 30 },
            { rank: 3, percentage: 20 }
          ]
        })
      };

      const mockTournament = {
        id: 'tournament-1',
        name: 'Test Tournament',
        status: 'UPCOMING'
      };

      const mockRewardPool = {
        id: 'pool-1',
        name: poolData.name,
        totalAmount: poolData.totalAmount,
        distributionType: poolData.distributionType,
        distributionRules: JSON.parse(poolData.distributionRules),
        createdAt: new Date()
      };

      mockPrisma.tournament.findUnique.mockResolvedValue(mockTournament);
      mockPrisma.rewardPool.create.mockResolvedValue(mockRewardPool);

      const response = await request(app)
        .post('/api/rewards/create-pool')
        .send(poolData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.rewardPool).toMatchObject({
        id: mockRewardPool.id,
        name: poolData.name,
        totalAmount: poolData.totalAmount,
        distributionType: poolData.distributionType
      });

      expect(mockPrisma.tournament.findUnique).toHaveBeenCalledWith({
        where: { id: poolData.tournamentId }
      });
      expect(mockPrisma.rewardPool.create).toHaveBeenCalledWith({
        data: {
          tournamentId: poolData.tournamentId,
          name: poolData.name,
          totalAmount: poolData.totalAmount,
          distributionType: poolData.distributionType,
          distributionRules: JSON.parse(poolData.distributionRules)
        }
      });
    });

    it('should return 400 for missing required fields', async () => {
      const invalidData = {
        tournamentId: 'tournament-1',
        name: 'Winner Pool'
        // Missing totalAmount, distributionType, distributionRules
      };

      const response = await request(app)
        .post('/api/rewards/create-pool')
        .send(invalidData)
        .expect(400);

      expect(response.body.error).toBe('All fields are required');
      expect(mockPrisma.tournament.findUnique).not.toHaveBeenCalled();
    });

    it('should return 404 for non-existent tournament', async () => {
      const poolData = {
        tournamentId: 'non-existent',
        name: 'Winner Pool',
        totalAmount: 1000,
        distributionType: 'PERCENTAGE',
        distributionRules: JSON.stringify({ rules: [] })
      };

      mockPrisma.tournament.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/rewards/create-pool')
        .send(poolData)
        .expect(404);

      expect(response.body.error).toBe('Tournament not found');
    });

    it('should handle database errors', async () => {
      const poolData = {
        tournamentId: 'tournament-1',
        name: 'Winner Pool',
        totalAmount: 1000,
        distributionType: 'PERCENTAGE',
        distributionRules: JSON.stringify({ rules: [] })
      };

      mockPrisma.tournament.findUnique.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/api/rewards/create-pool')
        .send(poolData)
        .expect(500);

      expect(response.body.error).toBe('Failed to create reward pool');
    });
  });

  describe('GET /api/rewards/tournament/:tournamentId', () => {
    it('should return reward pools for tournament successfully', async () => {
      const tournamentId = 'tournament-1';
      const mockRewardPools = [
        {
          id: 'pool-1',
          name: 'Winner Pool',
          totalAmount: 1000,
          distributedAmount: 500,
          distributionType: 'PERCENTAGE',
          distributionRules: { rules: [] },
          rewards: [
            {
              id: 'reward-1',
              rank: 1,
              amount: 500,
              percentage: 50,
              status: 'COMPLETED',
              userTeam: {
                user: {
                  displayName: 'Test User',
                  walletAddress: '0x123...'
                },
                teamName: 'Test Team'
              }
            }
          ]
        }
      ];

      mockPrisma.rewardPool.findMany.mockResolvedValue(mockRewardPools);

      const response = await request(app)
        .get(`/api/rewards/tournament/${tournamentId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.rewardPools).toHaveLength(1);
      expect(response.body.rewardPools[0]).toMatchObject({
        id: 'pool-1',
        name: 'Winner Pool',
        totalAmount: 1000,
        distributedAmount: 500
      });

      expect(mockPrisma.rewardPool.findMany).toHaveBeenCalledWith({
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
    });

    it('should handle database errors', async () => {
      const tournamentId = 'tournament-1';

      mockPrisma.rewardPool.findMany.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get(`/api/rewards/tournament/${tournamentId}`)
        .expect(500);

      expect(response.body.error).toBe('Failed to fetch reward pools');
    });
  });

  describe('POST /api/rewards/distribute', () => {
    it('should distribute rewards successfully', async () => {
      const distributeData = {
        tournamentId: 'tournament-1',
        rewardPoolId: 'pool-1'
      };

      const mockRewardPool = {
        id: 'pool-1',
        totalAmount: 1000,
        distributionRules: {
          rules: [
            { rank: 1, percentage: 50 },
            { rank: 2, percentage: 30 }
          ]
        }
      };

      const mockLeaderboard = [
        {
          rank: 1,
          userTeamId: 'team-1',
          userTeam: {
            user: { id: 'user-1', displayName: 'User 1' },
            teamName: 'Team 1'
          }
        },
        {
          rank: 2,
          userTeamId: 'team-2',
          userTeam: {
            user: { id: 'user-2', displayName: 'User 2' },
            teamName: 'Team 2'
          }
        }
      ];

      const mockCreatedReward = {
        id: 'reward-1',
        amount: 500,
        percentage: 50,
        status: 'PENDING'
      };

      mockPrisma.rewardPool.findUnique.mockResolvedValue(mockRewardPool);
      mockPrisma.leaderboardEntry.findMany.mockResolvedValue(mockLeaderboard);
      mockPrisma.userReward.create.mockResolvedValue(mockCreatedReward);
      mockPrisma.rewardPool.update.mockResolvedValue({});

      const response = await request(app)
        .post('/api/rewards/distribute')
        .send(distributeData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Rewards distributed successfully');
      expect(response.body.totalDistributed).toBe(800); // 500 + 300

      expect(mockPrisma.rewardPool.findUnique).toHaveBeenCalledWith({
        where: { id: distributeData.rewardPoolId }
      });
      expect(mockPrisma.leaderboardEntry.findMany).toHaveBeenCalledWith({
        where: { tournamentId: distributeData.tournamentId },
        include: {
          userTeam: {
            include: {
              user: true
            }
          }
        },
        orderBy: { rank: 'asc' }
      });
    });

    it('should return 400 for missing required fields', async () => {
      const invalidData = {
        tournamentId: 'tournament-1'
        // Missing rewardPoolId
      };

      const response = await request(app)
        .post('/api/rewards/distribute')
        .send(invalidData)
        .expect(400);

      expect(response.body.error).toBe('Tournament ID and Reward Pool ID are required');
    });

    it('should return 404 for non-existent reward pool', async () => {
      const distributeData = {
        tournamentId: 'tournament-1',
        rewardPoolId: 'non-existent'
      };

      mockPrisma.rewardPool.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/rewards/distribute')
        .send(distributeData)
        .expect(404);

      expect(response.body.error).toBe('Reward pool not found');
    });

    it('should return 400 when no participants found', async () => {
      const distributeData = {
        tournamentId: 'tournament-1',
        rewardPoolId: 'pool-1'
      };

      const mockRewardPool = {
        id: 'pool-1',
        totalAmount: 1000,
        distributionRules: { rules: [] }
      };

      mockPrisma.rewardPool.findUnique.mockResolvedValue(mockRewardPool);
      mockPrisma.leaderboardEntry.findMany.mockResolvedValue([]);

      const response = await request(app)
        .post('/api/rewards/distribute')
        .send(distributeData)
        .expect(400);

      expect(response.body.error).toBe('No participants found for reward distribution');
    });

    it('should handle database errors', async () => {
      const distributeData = {
        tournamentId: 'tournament-1',
        rewardPoolId: 'pool-1'
      };

      mockPrisma.rewardPool.findUnique.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/api/rewards/distribute')
        .send(distributeData)
        .expect(500);

      expect(response.body.error).toBe('Failed to distribute rewards');
    });
  });

  describe('POST /api/rewards/process/:rewardId', () => {
    it('should process reward successfully', async () => {
      const rewardId = 'reward-1';
      const processData = {
        aptosTransactionId: 'tx-123'
      };

      const mockReward = {
        id: rewardId,
        amount: 500,
        status: 'PENDING',
        userTeam: {
          user: { id: 'user-1' }
        },
        rewardPool: { id: 'pool-1' }
      };

      const mockUpdatedReward = {
        id: rewardId,
        amount: 500,
        status: 'PROCESSING',
        aptosTransactionId: 'tx-123'
      };

      mockPrisma.userReward.findUnique.mockResolvedValue(mockReward);
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return await callback({
          userReward: {
            update: jest.fn().mockResolvedValue(mockUpdatedReward)
          },
          user: {
            update: jest.fn().mockResolvedValue({})
          }
        });
      });

      const response = await request(app)
        .post(`/api/rewards/process/${rewardId}`)
        .send(processData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Reward processing initiated');
      expect(response.body.reward).toMatchObject({
        id: rewardId,
        amount: 500,
        status: 'PROCESSING',
        aptosTransactionId: 'tx-123'
      });

      expect(mockPrisma.userReward.findUnique).toHaveBeenCalledWith({
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
    });

    it('should return 404 for non-existent reward', async () => {
      const rewardId = 'non-existent';

      mockPrisma.userReward.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post(`/api/rewards/process/${rewardId}`)
        .send({})
        .expect(404);

      expect(response.body.error).toBe('Reward not found');
    });

    it('should return 400 when reward is not pending', async () => {
      const rewardId = 'reward-1';
      const mockReward = {
        id: rewardId,
        amount: 500,
        status: 'COMPLETED',
        userTeam: { user: { id: 'user-1' } },
        rewardPool: { id: 'pool-1' }
      };

      mockPrisma.userReward.findUnique.mockResolvedValue(mockReward);

      const response = await request(app)
        .post(`/api/rewards/process/${rewardId}`)
        .send({})
        .expect(400);

      expect(response.body.error).toBe('Reward is not pending');
    });

    it('should handle database errors', async () => {
      const rewardId = 'reward-1';

      mockPrisma.userReward.findUnique.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post(`/api/rewards/process/${rewardId}`)
        .send({})
        .expect(500);

      expect(response.body.error).toBe('Failed to process reward');
    });
  });

  describe('PUT /api/rewards/:rewardId/status', () => {
    it('should update reward status successfully', async () => {
      const rewardId = 'reward-1';
      const updateData = {
        status: 'COMPLETED',
        aptosTransactionId: 'tx-123'
      };

      const mockUpdatedReward = {
        id: rewardId,
        status: 'COMPLETED',
        aptosTransactionId: 'tx-123'
      };

      mockPrisma.userReward.update.mockResolvedValue(mockUpdatedReward);

      const response = await request(app)
        .put(`/api/rewards/${rewardId}/status`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Reward status updated');
      expect(response.body.reward).toMatchObject({
        id: rewardId,
        status: 'COMPLETED',
        aptosTransactionId: 'tx-123'
      });

      expect(mockPrisma.userReward.update).toHaveBeenCalledWith({
        where: { id: rewardId },
        data: {
          status: 'COMPLETED',
          aptosTransactionId: 'tx-123'
        }
      });
    });

    it('should return 400 for invalid status', async () => {
      const rewardId = 'reward-1';
      const updateData = {
        status: 'INVALID_STATUS'
      };

      const response = await request(app)
        .put(`/api/rewards/${rewardId}/status`)
        .send(updateData)
        .expect(400);

      expect(response.body.error).toBe('Invalid status');
      expect(mockPrisma.userReward.update).not.toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      const rewardId = 'reward-1';
      const updateData = {
        status: 'COMPLETED'
      };

      mockPrisma.userReward.update.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .put(`/api/rewards/${rewardId}/status`)
        .send(updateData)
        .expect(500);

      expect(response.body.error).toBe('Failed to update reward status');
    });
  });

  describe('GET /api/rewards/user/:walletAddress', () => {
    it('should return user rewards successfully', async () => {
      const walletAddress = '0x123...';
      const mockRewards = [
        {
          id: 'reward-1',
          rank: 1,
          amount: 500,
          percentage: 50,
          status: 'COMPLETED',
          aptosTransactionId: 'tx-123',
          createdAt: new Date(),
          userTeam: {
            tournament: {
              id: 'tournament-1',
              name: 'Test Tournament',
              matchDate: new Date(),
              team1: 'Team A',
              team2: 'Team B'
            }
          },
          rewardPool: {
            name: 'Winner Pool',
            distributionType: 'PERCENTAGE'
          }
        }
      ];

      mockPrisma.userReward.findMany.mockResolvedValue(mockRewards);

      const response = await request(app)
        .get(`/api/rewards/user/${walletAddress}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.rewards).toHaveLength(1);
      expect(response.body.rewards[0]).toMatchObject({
        id: 'reward-1',
        rank: 1,
        amount: 500,
        status: 'COMPLETED'
      });

      expect(mockPrisma.userReward.findMany).toHaveBeenCalledWith({
        where: {
          userTeam: {
            user: {
              walletAddress
            }
          }
        },
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
    });

    it('should filter rewards by status', async () => {
      const walletAddress = '0x123...';
      const status = 'COMPLETED';

      mockPrisma.userReward.findMany.mockResolvedValue([]);

      await request(app)
        .get(`/api/rewards/user/${walletAddress}?status=${status}`)
        .expect(200);

      expect(mockPrisma.userReward.findMany).toHaveBeenCalledWith({
        where: {
          userTeam: {
            user: {
              walletAddress
            }
          },
          status: 'COMPLETED'
        },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' }
      });
    });

    it('should handle database errors', async () => {
      const walletAddress = '0x123...';

      mockPrisma.userReward.findMany.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get(`/api/rewards/user/${walletAddress}`)
        .expect(500);

      expect(response.body.error).toBe('Failed to fetch user rewards');
    });
  });
});
