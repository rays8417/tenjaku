import request from 'supertest';
import express from 'express';
import usersRouter from '../../routes/users';
import { mockPrisma } from '../setup';

// Create Express app for testing
const app = express();
app.use(express.json());
app.use('/api/users', usersRouter);

describe('Users Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/users/login', () => {
    it('should create new user successfully', async () => {
      const loginData = {
        walletAddress: '0x123...',
        displayName: 'Test User',
        avatar: 'avatar.jpg'
      };

      const mockUser = {
        id: 'user-1',
        walletAddress: loginData.walletAddress,
        displayName: loginData.displayName,
        avatar: loginData.avatar,
        totalEarnings: 0,
        totalSpent: 0,
        joinDate: new Date()
      };

      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/api/users/login')
        .send(loginData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user).toMatchObject({
        id: 'user-1',
        walletAddress: loginData.walletAddress,
        displayName: loginData.displayName,
        avatar: loginData.avatar,
        totalEarnings: 0,
        totalSpent: 0
      });

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { walletAddress: loginData.walletAddress }
      });
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          walletAddress: loginData.walletAddress,
          displayName: loginData.displayName,
          avatar: loginData.avatar,
          joinDate: expect.any(Date),
          lastActive: expect.any(Date)
        }
      });
    });

    it('should login existing user successfully', async () => {
      const loginData = {
        walletAddress: '0x123...',
        displayName: 'Updated Name',
        avatar: 'new-avatar.jpg'
      };

      const mockExistingUser = {
        id: 'user-1',
        walletAddress: loginData.walletAddress,
        displayName: 'Old Name',
        avatar: 'old-avatar.jpg',
        totalEarnings: 100,
        totalSpent: 50,
        joinDate: new Date('2024-01-01')
      };

      const mockUpdatedUser = {
        ...mockExistingUser,
        displayName: loginData.displayName,
        avatar: loginData.avatar,
        lastActive: new Date()
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockExistingUser);
      mockPrisma.user.update.mockResolvedValue(mockUpdatedUser);

      const response = await request(app)
        .post('/api/users/login')
        .send(loginData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user).toMatchObject({
        id: 'user-1',
        walletAddress: loginData.walletAddress,
        displayName: loginData.displayName,
        avatar: loginData.avatar,
        totalEarnings: 100,
        totalSpent: 50
      });

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { walletAddress: loginData.walletAddress },
        data: {
          lastActive: expect.any(Date),
          displayName: loginData.displayName,
          avatar: loginData.avatar
        }
      });
    });

    it('should create user with default display name when not provided', async () => {
      const loginData = {
        walletAddress: '0x1234567890abcdef'
      };

      const mockUser = {
        id: 'user-1',
        walletAddress: loginData.walletAddress,
        displayName: 'Player cdef',
        avatar: null,
        totalEarnings: 0,
        totalSpent: 0,
        joinDate: new Date()
      };

      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/api/users/login')
        .send(loginData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user.displayName).toBe('Player cdef');

      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          walletAddress: loginData.walletAddress,
          displayName: 'Player cdef',
          avatar: null,
          joinDate: expect.any(Date),
          lastActive: expect.any(Date)
        }
      });
    });

    it('should return 400 for missing wallet address', async () => {
      const invalidData = {
        displayName: 'Test User'
        // Missing walletAddress
      };

      const response = await request(app)
        .post('/api/users/login')
        .send(invalidData)
        .expect(400);

      expect(response.body.error).toBe('Wallet address is required');
      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      const loginData = {
        walletAddress: '0x123...',
        displayName: 'Test User'
      };

      mockPrisma.user.findUnique.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/api/users/login')
        .send(loginData)
        .expect(500);

      expect(response.body.error).toBe('Login failed');
    });
  });

  describe('GET /api/users/profile/:walletAddress', () => {
    it('should return user profile successfully', async () => {
      const walletAddress = '0x123...';
      const mockUser = {
        id: 'user-1',
        walletAddress,
        displayName: 'Test User',
        avatar: 'avatar.jpg',
        totalEarnings: 100,
        totalSpent: 50,
        joinDate: new Date('2024-01-01'),
        lastActive: new Date(),
        teams: [
          {
            id: 'team-1',
            teamName: 'Test Team',
            tournament: {
              id: 'tournament-1',
              name: 'Test Tournament',
              matchDate: new Date(),
              team1: 'Team A',
              team2: 'Team B',
              status: 'UPCOMING'
            },
            scores: [
              {
                totalScore: 150
              }
            ],
            rewards: [
              {
                id: 'reward-1',
                amount: 100,
                status: 'COMPLETED',
                rewardPool: {
                  name: 'Winner Pool'
                }
              }
            ]
          }
        ]
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const response = await request(app)
        .get(`/api/users/profile/${walletAddress}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user).toMatchObject({
        id: 'user-1',
        walletAddress,
        displayName: 'Test User',
        avatar: 'avatar.jpg',
        totalEarnings: 100,
        totalSpent: 50
      });
      expect(response.body.user.teams).toHaveLength(1);
      expect(response.body.user.teams[0]).toMatchObject({
        id: 'team-1',
        teamName: 'Test Team',
        totalScore: 150
      });

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { walletAddress },
        include: {
          teams: {
            include: {
              tournament: true,
              scores: true,
              rewards: {
                include: {
                  rewardPool: true
                }
              }
            }
          }
        }
      });
    });

    it('should return 404 for non-existent user', async () => {
      const walletAddress = '0x123...';

      mockPrisma.user.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .get(`/api/users/profile/${walletAddress}`)
        .expect(404);

      expect(response.body.error).toBe('User not found');
    });

    it('should handle database errors', async () => {
      const walletAddress = '0x123...';

      mockPrisma.user.findUnique.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get(`/api/users/profile/${walletAddress}`)
        .expect(500);

      expect(response.body.error).toBe('Failed to fetch profile');
    });
  });

  describe('PUT /api/users/profile/:walletAddress', () => {
    it('should update user profile successfully', async () => {
      const walletAddress = '0x123...';
      const updateData = {
        displayName: 'Updated Name',
        avatar: 'new-avatar.jpg'
      };

      const mockUpdatedUser = {
        id: 'user-1',
        walletAddress,
        displayName: updateData.displayName,
        avatar: updateData.avatar,
        totalEarnings: 100,
        totalSpent: 50
      };

      mockPrisma.user.update.mockResolvedValue(mockUpdatedUser);

      const response = await request(app)
        .put(`/api/users/profile/${walletAddress}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user).toMatchObject({
        id: 'user-1',
        walletAddress,
        displayName: updateData.displayName,
        avatar: updateData.avatar,
        totalEarnings: 100,
        totalSpent: 50
      });

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { walletAddress },
        data: {
          displayName: updateData.displayName,
          avatar: updateData.avatar,
          updatedAt: expect.any(Date)
        }
      });
    });

    it('should handle partial updates', async () => {
      const walletAddress = '0x123...';
      const updateData = {
        displayName: 'Updated Name'
        // No avatar update
      };

      const mockUpdatedUser = {
        id: 'user-1',
        walletAddress,
        displayName: updateData.displayName,
        avatar: 'old-avatar.jpg',
        totalEarnings: 100,
        totalSpent: 50
      };

      mockPrisma.user.update.mockResolvedValue(mockUpdatedUser);

      const response = await request(app)
        .put(`/api/users/profile/${walletAddress}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user.displayName).toBe(updateData.displayName);

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { walletAddress },
        data: {
          displayName: updateData.displayName,
          avatar: undefined,
          updatedAt: expect.any(Date)
        }
      });
    });

    it('should handle database errors', async () => {
      const walletAddress = '0x123...';
      const updateData = {
        displayName: 'Updated Name'
      };

      mockPrisma.user.update.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .put(`/api/users/profile/${walletAddress}`)
        .send(updateData)
        .expect(500);

      expect(response.body.error).toBe('Failed to update profile');
    });
  });

  describe('GET /api/users/stats/:walletAddress', () => {
    it('should return user statistics successfully', async () => {
      const walletAddress = '0x123...';
      const mockUser = {
        id: 'user-1',
        walletAddress,
        totalEarnings: 200,
        totalSpent: 100,
        teams: [
          {
            id: 'team-1',
            tournament: {
              id: 'tournament-1',
              name: 'Tournament 1'
            },
            scores: [
              {
                totalScore: 150
              }
            ],
            rewards: [
              {
                amount: 100,
                status: 'COMPLETED',
                rank: 1
              }
            ]
          },
          {
            id: 'team-2',
            tournament: {
              id: 'tournament-2',
              name: 'Tournament 2'
            },
            scores: [
              {
                totalScore: 200
              }
            ],
            rewards: [
              {
                amount: 50,
                status: 'COMPLETED',
                rank: 3
              }
            ]
          }
        ]
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const response = await request(app)
        .get(`/api/users/stats/${walletAddress}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.stats).toMatchObject({
        totalTournaments: 2,
        totalEarnings: 200,
        totalSpent: 100,
        averageScore: 175, // (150 + 200) / 2
        bestRank: 1,
        totalRewards: 150 // 100 + 50
      });

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { walletAddress },
        include: {
          teams: {
            include: {
              tournament: true,
              scores: true,
              rewards: {
                where: { status: 'COMPLETED' }
              }
            }
          }
        }
      });
    });

    it('should handle user with no teams', async () => {
      const walletAddress = '0x123...';
      const mockUser = {
        id: 'user-1',
        walletAddress,
        totalEarnings: 0,
        totalSpent: 0,
        teams: []
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const response = await request(app)
        .get(`/api/users/stats/${walletAddress}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.stats).toMatchObject({
        totalTournaments: 0,
        totalEarnings: 0,
        totalSpent: 0,
        averageScore: 0,
        bestRank: null,
        totalRewards: 0
      });
    });

    it('should return 404 for non-existent user', async () => {
      const walletAddress = '0x123...';

      mockPrisma.user.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .get(`/api/users/stats/${walletAddress}`)
        .expect(404);

      expect(response.body.error).toBe('User not found');
    });

    it('should handle database errors', async () => {
      const walletAddress = '0x123...';

      mockPrisma.user.findUnique.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get(`/api/users/stats/${walletAddress}`)
        .expect(500);

      expect(response.body.error).toBe('Failed to fetch stats');
    });
  });
});
