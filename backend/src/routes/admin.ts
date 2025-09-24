import express from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const router = express.Router();

// POST /api/admin/tournaments - Create tournament (Admin only)
router.post("/tournaments", async (req, res) => {
  try {
    const {
      name,
      description,
      matchDate,
      team1,
      team2,
      venue,
      entryFee,
      maxParticipants,
    } = req.body;

    if (!name || !matchDate || !team1 || !team2) {
      return res
        .status(400)
        .json({ error: "Name, match date, team1, and team2 are required" });
    }

    const tournament = await prisma.tournament.create({
      data: {
        name,
        description: description || null,
        matchDate: new Date(matchDate),
        team1,
        team2,
        venue: venue || null,
        entryFee: entryFee || 0,
        maxParticipants: maxParticipants || null,
        status: "UPCOMING",
      },
    });

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
        entryFee: tournament.entryFee,
        maxParticipants: tournament.maxParticipants,
        status: tournament.status,
        createdAt: tournament.createdAt,
      },
    });
  } catch (error) {
    console.error("Tournament creation error:", error);
    res.status(500).json({ error: "Failed to create tournament" });
  }
});

// PUT /api/admin/tournaments/:id - Update tournament (Admin only)
router.put("/tournaments/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      matchDate,
      team1,
      team2,
      venue,
      entryFee,
      maxParticipants,
      status,
    } = req.body;

    const tournament = await prisma.tournament.update({
      where: { id },
      data: {
        name: name || undefined,
        description: description || undefined,
        matchDate: matchDate ? new Date(matchDate) : undefined,
        team1: team1 || undefined,
        team2: team2 || undefined,
        venue: venue || undefined,
        entryFee: entryFee || undefined,
        maxParticipants: maxParticipants || undefined,
        status: status || undefined,
      },
    });

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
        entryFee: tournament.entryFee,
        maxParticipants: tournament.maxParticipants,
        status: tournament.status,
        updatedAt: tournament.updatedAt,
      },
    });
  } catch (error) {
    console.error("Tournament update error:", error);
    res.status(500).json({ error: "Failed to update tournament" });
  }
});

// DELETE /api/admin/tournaments/:id - Delete tournament (Admin only)
router.delete("/tournaments/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Check if tournament has participants
    const tournament = await prisma.tournament.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            teams: true,
          },
        },
      },
    });

    if (!tournament) {
      return res.status(404).json({ error: "Tournament not found" });
    }

    if (tournament._count.teams > 0) {
      return res
        .status(400)
        .json({ error: "Cannot delete tournament with participants" });
    }

    await prisma.tournament.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: "Tournament deleted successfully",
    });
  } catch (error) {
    console.error("Tournament deletion error:", error);
    res.status(500).json({ error: "Failed to delete tournament" });
  }
});

// POST /api/admin/players - Create player (Admin only)
router.post("/players", async (req, res) => {
  try {
    const { name, team, role, creditValue } = req.body;

    if (!name || !team || !role || creditValue === undefined) {
      return res
        .status(400)
        .json({ error: "Name, team, role, and credit value are required" });
    }

    const player = await prisma.player.create({
      data: {
        name,
        team,
        role,
        creditValue,
      },
    });

    res.json({
      success: true,
      player: {
        id: player.id,
        name: player.name,
        team: player.team,
        role: player.role,
        creditValue: player.creditValue,
        isActive: player.isActive,
      },
    });
  } catch (error) {
    console.error("Player creation error:", error);
    res.status(500).json({ error: "Failed to create player" });
  }
});

// PUT /api/admin/players/:id - Update player (Admin only)
router.put("/players/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, team, role, creditValue, isActive } = req.body;

    const player = await prisma.player.update({
      where: { id },
      data: {
        name: name || undefined,
        team: team || undefined,
        role: role || undefined,
        creditValue: creditValue || undefined,
        isActive: isActive !== undefined ? isActive : undefined,
      },
    });

    res.json({
      success: true,
      player: {
        id: player.id,
        name: player.name,
        team: player.team,
        role: player.role,
        creditValue: player.creditValue,
        isActive: player.isActive,
      },
    });
  } catch (error) {
    console.error("Player update error:", error);
    res.status(500).json({ error: "Failed to update player" });
  }
});

// GET /api/admin/stats - Get admin statistics
router.get("/stats", async (req, res) => {
  try {
    const [
      totalUsers,
      totalTournaments,
      totalTeams,
      totalRewards,
      activeTournaments,
      completedTournaments,
      totalEarnings,
      totalSpent,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.tournament.count(),
      prisma.userTeam.count(),
      prisma.userReward.count(),
      prisma.tournament.count({ where: { status: "ONGOING" } }),
      prisma.tournament.count({ where: { status: "COMPLETED" } }),
      prisma.user.aggregate({ _sum: { totalEarnings: true } }),
      prisma.user.aggregate({ _sum: { totalSpent: true } }),
    ]);

    const stats = {
      users: {
        total: totalUsers,
        totalEarnings: totalEarnings._sum.totalEarnings || 0,
        totalSpent: totalSpent._sum.totalSpent || 0,
      },
      tournaments: {
        total: totalTournaments,
        active: activeTournaments,
        completed: completedTournaments,
      },
      teams: {
        total: totalTeams,
      },
      rewards: {
        total: totalRewards,
      },
    };

    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    res.status(500).json({ error: "Failed to fetch admin stats" });
  }
});

// GET /api/admin/tournaments - Get all tournaments with detailed info (Admin only)
router.get("/tournaments", async (req, res) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;

    const whereClause = status ? { status: status as any } : {};

    const tournaments = await prisma.tournament.findMany({
      where: whereClause,
      include: {
        _count: {
          select: {
            teams: true,
            rewardPools: true,
          },
        },
        rewardPools: {
          select: {
            id: true,
            name: true,
            totalAmount: true,
            distributedAmount: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: Number(limit),
      skip: Number(offset),
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
        rewardPoolCount: tournament._count.rewardPools,
        rewardPools: tournament.rewardPools,
        createdAt: tournament.createdAt,
        updatedAt: tournament.updatedAt,
      })),
    });
  } catch (error) {
    console.error("Admin tournaments fetch error:", error);
    res.status(500).json({ error: "Failed to fetch tournaments" });
  }
});

// GET /api/admin/users - Get all users (Admin only)
router.get("/users", async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;

    const users = await prisma.user.findMany({
      include: {
        _count: {
          select: {
            teams: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: Number(limit),
      skip: Number(offset),
    });

    res.json({
      success: true,
      users: users.map((user: any) => ({
        id: user.id,
        walletAddress: user.walletAddress,
        displayName: user.displayName,
        avatar: user.avatar,
        totalEarnings: user.totalEarnings,
        totalSpent: user.totalSpent,
        joinDate: user.joinDate,
        lastActive: user.lastActive,
        isActive: user.isActive,
        teamCount: user._count.teams,
      })),
    });
  } catch (error) {
    console.error("Admin users fetch error:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

export default router;
