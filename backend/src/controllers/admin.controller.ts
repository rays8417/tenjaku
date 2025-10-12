import { Request, Response } from "express";
import { prisma } from "../prisma";

/**
 * Admin Controller
 * Handles all admin-related operations for tournaments, players, and statistics
 */

// Helper function to format tournament response
const formatTournamentResponse = (tournament: any) => ({
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
  currentParticipants: tournament.currentParticipants,
  rewardPools: tournament.rewardPools,
  createdAt: tournament.createdAt,
  updatedAt: tournament.updatedAt,
});

// Helper function to format player response
const formatPlayerResponse = (player: any) => ({
  id: player.id,
  name: player.name,
  team: player.team,
  role: player.role,
  isActive: player.isActive,
});

/**
 * POST /api/admin/tournaments
 * Create a new tournament
 */
export const createTournament = async (req: Request, res: Response) => {
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

    // Validation
    if (!name || !matchDate || !team1 || !team2) {
      return res.status(400).json({ 
        error: "Name, match date, team1, and team2 are required" 
      });
    }

    // Create tournament
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
      tournament: formatTournamentResponse(tournament),
    });
  } catch (error) {
    console.error("Tournament creation error:", error);
    res.status(500).json({ error: "Failed to create tournament" });
  }
};

/**
 * PUT /api/admin/tournaments/:id
 * Update an existing tournament
 */
export const updateTournament = async (req: Request, res: Response) => {
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

    // Update tournament
    const tournament = await prisma.tournament.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description && { description }),
        ...(matchDate && { matchDate: new Date(matchDate) }),
        ...(team1 && { team1 }),
        ...(team2 && { team2 }),
        ...(venue && { venue }),
        ...(entryFee !== undefined && { entryFee }),
        ...(maxParticipants !== undefined && { maxParticipants }),
        ...(status && { status }),
      },
    });

    res.json({
      success: true,
      tournament: formatTournamentResponse(tournament),
    });
  } catch (error) {
    console.error("Tournament update error:", error);
    res.status(500).json({ error: "Failed to update tournament" });
  }
};

/**
 * DELETE /api/admin/tournaments/:id
 * Delete a tournament
 */
export const deleteTournament = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if tournament exists
    const tournament = await prisma.tournament.findUnique({
      where: { id },
    });

    if (!tournament) {
      return res.status(404).json({ error: "Tournament not found" });
    }

    // Delete tournament
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
};


/**
 * POST /api/admin/players
 * Create a new player
 */
export const createPlayer = async (req: Request, res: Response) => {
  try {
    const { name, team, role, creditValue } = req.body;

    // Validation
    if (!name || !team || !role || creditValue === undefined) {
      return res.status(400).json({ 
        error: "Name, team, role, and credit value are required" 
      });
    }

    // Create player
    const player = await prisma.player.create({
      data: { name, team, role },
    });

    res.json({
      success: true,
      player: formatPlayerResponse(player),
    });
  } catch (error) {
    console.error("Player creation error:", error);
    res.status(500).json({ error: "Failed to create player" });
  }
};

/**
 * PUT /api/admin/players/:id
 * Update an existing player
 */
export const updatePlayer = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, team, role, isActive } = req.body;

    // Update player with only provided fields
    const player = await prisma.player.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(team && { team }),
        ...(role && { role }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    res.json({
      success: true,
      player: formatPlayerResponse(player),
    });
  } catch (error) {
    console.error("Player update error:", error);
    res.status(500).json({ error: "Failed to update player" });
  }
};

/**
 * GET /api/admin/stats
 * Get admin statistics
 */
export const getStats = async (req: Request, res: Response) => {
  try {
    const [
      totalTournaments,
      totalRewards,
      activeTournaments,
      completedTournaments,
    ] = await Promise.all([
      prisma.tournament.count(),
      prisma.userReward.count(),
      prisma.tournament.count({ where: { status: "ONGOING" } }),
      prisma.tournament.count({ where: { status: "COMPLETED" } }),
    ]);

    res.json({
      success: true,
      stats: {
        tournaments: {
          total: totalTournaments,
          active: activeTournaments,
          completed: completedTournaments,
        },
        rewards: {
          total: totalRewards,
        },
      },
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    res.status(500).json({ error: "Failed to fetch admin stats" });
  }
};
