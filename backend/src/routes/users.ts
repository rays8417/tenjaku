import express from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const router = express.Router();

// POST /api/users/login - Login/Register with Petra wallet
router.post("/login", async (req, res) => {
  try {
    const { walletAddress, displayName, avatar } = req.body;

    if (!walletAddress) {
      return res.status(400).json({ error: "Wallet address is required" });
    }

    // Check if user exists
    let user = await prisma.user.findUnique({
      where: { walletAddress },
    });

    if (!user) {
      // Create new user
      user = await prisma.user.create({
        data: {
          walletAddress,
          displayName: displayName || `Player ${walletAddress.slice(-4)}`,
          avatar: avatar || null,
          joinDate: new Date(),
          lastActive: new Date(),
        },
      });
    } else {
      // Update last active
      user = await prisma.user.update({
        where: { walletAddress },
        data: {
          lastActive: new Date(),
          displayName: displayName || user.displayName,
          avatar: avatar || user.avatar,
        },
      });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        walletAddress: user.walletAddress,
        displayName: user.displayName,
        avatar: user.avatar,
        totalEarnings: user.totalEarnings,
        totalSpent: user.totalSpent,
        joinDate: user.joinDate,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Login failed" });
  }
});

// GET /api/users/profile/:walletAddress - Get user profile
router.get("/profile/:walletAddress", async (req, res) => {
  try {
    const { walletAddress } = req.params;

    const user = await prisma.user.findUnique({
      where: { walletAddress },
      include: {
        teams: {
          include: {
            tournament: true,
            scores: true,
            rewards: {
              include: {
                rewardPool: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        walletAddress: user.walletAddress,
        displayName: user.displayName,
        avatar: user.avatar,
        totalEarnings: user.totalEarnings,
        totalSpent: user.totalSpent,
        joinDate: user.joinDate,
        lastActive: user.lastActive,
        teams: user.teams.map((team: any) => ({
          id: team.id,
          teamName: team.teamName,
          tournament: team.tournament,
          totalScore: team.scores.reduce(
            (sum: number, score: any) => sum + Number(score.totalScore),
            0
          ),
          rewards: team.rewards,
        })),
      },
    });
  } catch (error) {
    console.error("Profile error:", error);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

// PUT /api/users/profile/:walletAddress - Update user profile
router.put("/profile/:walletAddress", async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const { displayName, avatar } = req.body;

    const user = await prisma.user.update({
      where: { walletAddress },
      data: {
        displayName: displayName || undefined,
        avatar: avatar || undefined,
        updatedAt: new Date(),
      },
    });

    res.json({
      success: true,
      user: {
        id: user.id,
        walletAddress: user.walletAddress,
        displayName: user.displayName,
        avatar: user.avatar,
        totalEarnings: user.totalEarnings,
        totalSpent: user.totalSpent,
      },
    });
  } catch (error) {
    console.error("Profile update error:", error);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

// GET /api/users/stats/:walletAddress - Get user statistics
router.get("/stats/:walletAddress", async (req, res) => {
  try {
    const { walletAddress } = req.params;

    const user = await prisma.user.findUnique({
      where: { walletAddress },
      include: {
        teams: {
          include: {
            tournament: true,
            scores: true,
            rewards: {
              where: { status: "COMPLETED" },
            },
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const stats = {
      totalTournaments: user.teams.length,
      totalEarnings: user.totalEarnings,
      totalSpent: user.totalSpent,
      averageScore:
        user.teams.length > 0
          ? user.teams.reduce(
              (sum: number, team: any) =>
                sum +
                team.scores.reduce(
                  (scoreSum: number, score: any) =>
                    scoreSum + Number(score.totalScore),
                  0
                ),
              0
            ) / user.teams.length
          : 0,
      bestRank:
        user.teams.length > 0
          ? Math.min(
              ...user.teams.map((team: any) => team.rewards[0]?.rank || 999)
            )
          : null,
      totalRewards: user.teams.reduce(
        (sum: number, team: any) =>
          sum +
          team.rewards.reduce(
            (rewardSum: number, reward: any) =>
              rewardSum + Number(reward.amount),
            0
          ),
        0
      ),
    };

    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error("Stats error:", error);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

export default router;
