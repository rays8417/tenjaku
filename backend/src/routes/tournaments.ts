import express from "express";
import { PrismaClient } from "@prisma/client";
import { getEligiblePlayers } from "../services/cricketApiService";
import { getTokenBalanceFromAllModules } from "../services/aptosService";

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
       
        playerScores: true,
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
        rewardPools: tournament.rewardPools,
        createdAt: tournament.createdAt,
        playerScores: tournament.playerScores,
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

// GET /api/tournaments/:id/eligible-players - Get eligible players for tournament from Cricbuzz
router.get("/:id/eligible-players", async (req, res) => {
  try {
    const { id } = req.params;
    const { address } = req.query;

    // Get tournament details including matchId
    const tournament = await prisma.tournament.findUnique({
      where: { id },
      select: { 
        matchId: true,
        name: true,
        team1: true,
        team2: true,
        status: true
      },
    });

    if (!tournament) {
      return res.status(404).json({ error: "Tournament not found" });
    }

    if (!tournament.matchId) {
      return res.status(400).json({ 
        error: "Tournament does not have a match ID",
        message: "Cannot fetch players without a valid match ID"
      });
    }

    // Fetch eligible players from Cricbuzz API
    const eligiblePlayers = await getEligiblePlayers(Number(tournament.matchId));

    // If address is provided, fetch holdings for each eligible player
    let playersWithHoldings = eligiblePlayers;
    
    if (address && typeof address === 'string') {
      console.log(`🔍 Fetching holdings for address: ${address}`);
      
      try {
        // Fetch all holdings for this address
        const holdings = await getTokenBalanceFromAllModules(address);
        console.log(`📊 Found ${holdings.length} holdings for address`);
        
        // Create a map of moduleName to balance for quick lookup
        const holdingsMap = new Map(
          holdings.map(h => [h.moduleName, h.balance])
        );
        
        // Add holdings to each eligible player
        playersWithHoldings = eligiblePlayers.map(player => ({
          ...player,
          holdings: holdingsMap.get(player.moduleName) || BigInt(0),
          formattedHoldings: ((Number(holdingsMap.get(player.moduleName) || BigInt(0))) / 100000000).toFixed(2)
        }));
        
        console.log(`✅ Added holdings data to ${playersWithHoldings.length} players`);
      } catch (holdingsError) {
        console.error("Error fetching holdings:", holdingsError);
        // Continue without holdings data if there's an error
      }
    }

    res.json({
      success: true,
      tournament: {
        id: id,
        name: tournament.name,
        team1: tournament.team1,
        team2: tournament.team2,
        status: tournament.status
      },
      address: address || null,
      totalPlayers: playersWithHoldings.length,
      players: playersWithHoldings.map(player => ({
        id: player.id,
        name: player.name,
        moduleName: player.moduleName,
        role: player.role,
        teamName: player.teamName,
        teamId: player.teamId,
        holdings: player.holdings ? player.holdings.toString() : undefined,
        formattedHoldings: player.formattedHoldings || undefined
      }))
    });
  } catch (error: any) {
    console.error("Eligible players fetch error:", error);
    res.status(500).json({ 
      error: "Failed to fetch eligible players",
      details: error.message
    });
  }
});

export default router;
