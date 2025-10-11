import express from "express";
import { PrismaClient } from "@prisma/client";
import { getTokenHoldersWithBalances } from "../services/aptosService";
import { calculateTotalFantasyPoints } from "../utils/fantasyPointsCalculator";

const prisma = new PrismaClient();

const router = express.Router();

// POST /api/scoring/player-scores - Update player scores (Admin only)
router.post("/player-scores", async (req, res) => {
  try {
    const { tournamentId, playerScores } = req.body;

    if (!tournamentId || !playerScores || !Array.isArray(playerScores)) {
      return res
        .status(400)
        .json({ error: "Tournament ID and player scores array are required" });
    }

    // Check if tournament exists
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
    });

    if (!tournament) {
      return res.status(404).json({ error: "Tournament not found" });
    }

    // Update player scores in transaction
    const result = await prisma.$transaction(async (tx: any) => {
      const updatedScores = [];

      for (const scoreData of playerScores) {
        const {
          moduleName: moduleName,
         // Use moduleName instead of playerId
          runs,
          ballsFaced,
          wickets,
          oversBowled,
          runsConceded,
          catches,
          stumpings,
          runOuts,
        } = scoreData;

        // Calculate fantasy points using shared calculator
        const fantasyPoints = calculateTotalFantasyPoints({
          runs,
          ballsFaced,
          wickets,
          oversBowled,
          runsConceded,
          catches,
          stumpings,
          runOuts,
        });

        // Store player score with moduleName (contract-based)
        const playerScore = await tx.playerScore.create({
          data: {
            tournamentId,
            moduleName: moduleName, // Store moduleName as playerId
            runs,
            ballsFaced,
            wickets,
            oversBowled,
            runsConceded,
            catches,
            stumpings,
            runOuts,
            fantasyPoints,
          },
        });

        updatedScores.push(playerScore);
      }

      return updatedScores;
    });

    res.json({
      success: true,
      message: "Player scores updated successfully",
      scores: result,
    });
  } catch (error) {
    console.error("Player scores update error:", error);
    res.status(500).json({ error: "Failed to update player scores" });
  }
});

// POST /api/scoring/calculate-user-scores - Calculate user team scores using contract data
router.post("/calculate-user-scores", async (req, res) => {
  try {
    const { tournamentId } = req.body;

    if (!tournamentId) {
      return res.status(400).json({ error: "Tournament ID is required" });
    }

    // Get player scores from contract data
    const playerScores = await prisma.playerScore.findMany({
      where: { tournamentId },
    });

    // Get current token holders from contract
    const tokenHolders = await getTokenHoldersWithBalances();

    // Group token holders by address
    const holdersByAddress = new Map();
    tokenHolders.forEach(holder => {
      if (!holdersByAddress.has(holder.address)) {
        holdersByAddress.set(holder.address, []);
      }
      holdersByAddress.get(holder.address).push(holder);
    });

    // Calculate scores for each token holder
    const userScores = [];

    for (const [address, holders] of holdersByAddress) {
      let totalScore = 0;
      const userPlayerScores = [];

      // Calculate score for each player token held
      for (const holder of holders) {
        const playerScoreData = playerScores.find(ps => ps.moduleName === holder.moduleName);
        if (playerScoreData) {
          // Calculate points based on token amount (proportional to holdings)
          const points = Number(playerScoreData.fantasyPoints);
          const tokenRatio = Number(holder.balance) / 100000000; // Normalize token amount
          const weightedPoints = points * tokenRatio;
          
          totalScore += weightedPoints;
          userPlayerScores.push({
            moduleName: holder.moduleName,
            tokens: holder.balance,
            points: weightedPoints
          });
        }
      }

      // Store user score
      userScores.push({
        walletAddress: address,
        totalScore,
        playerScores: userPlayerScores
      });
    }
    res.json({
      success: true,
      message: "User scores calculated successfully using contract data",
      totalUsers: userScores.length,
      userScores: userScores.sort((a, b) => b.totalScore - a.totalScore), // Sort by score descending
    });
  } catch (error) {
    console.error("User scores calculation error:", error);
    res.status(500).json({ error: "Failed to calculate user scores" });
  }
});



// GET /api/scoring/tournament/:tournamentId/scores - Get all scores for a tournament
router.get("/tournament/:tournamentId/scores", async (req, res) => {
  try {
    const { tournamentId } = req.params;

    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
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
        team1: tournament.team1,
        team2: tournament.team2,
        playerScores: tournament.playerScores.map((ps: any) => ({
          player: ps.player,
          runs: ps.runs,
          ballsFaced: ps.ballsFaced,
          wickets: ps.wickets,
          oversBowled: ps.oversBowled,
          runsConceded: ps.runsConceded,
          catches: ps.catches,
          stumpings: ps.stumpings,
          runOuts: ps.runOuts,
          fantasyPoints: ps.fantasyPoints,
        })),
       
      },
    });
  } catch (error) {
    console.error("Scores fetch error:", error);
    res.status(500).json({ error: "Failed to fetch scores" });
  }
});

export default router;
