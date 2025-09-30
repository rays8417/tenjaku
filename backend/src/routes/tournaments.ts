import express from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const router = express.Router();

// GET /api/tournaments - Get all tournaments
router.get("/", async (req, res) => {
  try {
    const { status, limit = 20, offset = 0 } = req.query;

    const whereClause = status ? { status: status as any } : {};

    const tournaments = await prisma.tournament.findMany({
      where: whereClause,
      include: {
       
        rewardPools: {
          select: {
            id: true,
            name: true,
            totalAmount: true,
            distributedAmount: true,
          },
        },
      
      },
      orderBy: { matchDate: "desc" },
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
        rewardPools: tournament.rewardPools,
        createdAt: tournament.createdAt,
      })),
    });
  } catch (error) {
    console.error("Tournaments fetch error:", error);
    res.status(500).json({ error: "Failed to fetch tournaments" });
  }
});

// GET /api/tournaments/:id - Get tournament details
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const tournament = await prisma.tournament.findUnique({
      where: { id },
      include: {
       
        rewardPools: {
          include: {
            rewards: true,
          },
        },
       
        playerScores: {
          include: {
            player: true,
          },
        },
      },
    });

    if (!tournament) {
      return res.status(404).json({ error: "Tournament not found" });
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
        createdAt: tournament.createdAt,
      },
    });
  } catch (error) {
    console.error("Tournament fetch error:", error);
    res.status(500).json({ error: "Failed to fetch tournament" });
  }
});



// GET /api/tournaments/:id/players - Get available players for tournament
router.get("/:id/players", async (req, res) => {
  try {
    const { id } = req.params;

    const tournament = await prisma.tournament.findUnique({
      where: { id },
      select: { team1: true, team2: true },
    });

    if (!tournament) {
      return res.status(404).json({ error: "Tournament not found" });
    }

    const players = await prisma.player.findMany({
      where: {
        team: {
          in: [tournament.team1, tournament.team2],
        },
        isActive: true,
      },
      orderBy: [{ team: "asc" }, { role: "asc" }, { tokenPrice: "desc" }],
    });

    res.json({
      success: true,
      players: players.map((player: any) => ({
        id: player.id,
        name: player.name,
        team: player.team,
        role: player.role,
        tokenPrice: player.tokenPrice,
      })),
    });
  } catch (error) {
    console.error("Players fetch error:", error);
    res.status(500).json({ error: "Failed to fetch players" });
  }
});


export default router;
