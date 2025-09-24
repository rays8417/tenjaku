import express from 'express';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const router = express.Router();
// POST /api/teams - Create user team
router.post('/', async (req, res) => {
    try {
        const { userId, tournamentId, teamName, captainId, viceCaptainId, playerIds } = req.body;
        // Validation
        if (!userId || !tournamentId || !teamName || !captainId || !viceCaptainId || !playerIds) {
            return res.status(400).json({ error: 'All fields are required' });
        }
        if (playerIds.length !== 11) {
            return res.status(400).json({ error: 'Team must have exactly 11 players' });
        }
        if (!playerIds.includes(captainId) || !playerIds.includes(viceCaptainId)) {
            return res.status(400).json({ error: 'Captain and vice-captain must be in the team' });
        }
        // Check if tournament exists and is open
        const tournament = await prisma.tournament.findUnique({
            where: { id: tournamentId }
        });
        if (!tournament) {
            return res.status(404).json({ error: 'Tournament not found' });
        }
        if (tournament.status !== 'UPCOMING') {
            return res.status(400).json({ error: 'Tournament is not open for team creation' });
        }
        // Check if user already has a team in this tournament
        const existingTeam = await prisma.userTeam.findUnique({
            where: {
                userId_tournamentId: {
                    userId,
                    tournamentId
                }
            }
        });
        if (existingTeam) {
            return res.status(400).json({ error: 'User already has a team in this tournament' });
        }
        // Check if tournament is full
        if (tournament.maxParticipants && tournament.currentParticipants >= tournament.maxParticipants) {
            return res.status(400).json({ error: 'Tournament is full' });
        }
        // Validate players exist and are from correct teams
        const players = await prisma.player.findMany({
            where: {
                id: { in: playerIds },
                team: { in: [tournament.team1, tournament.team2] },
                isActive: true
            }
        });
        if (players.length !== 11) {
            return res.status(400).json({ error: 'Invalid players selected' });
        }
        // Calculate total credits used
        const totalCredits = players.reduce((sum, player) => sum + Number(player.creditValue), 0);
        if (totalCredits > 100) {
            return res.status(400).json({ error: 'Team exceeds credit limit of 100' });
        }
        // Create team with players in transaction
        const result = await prisma.$transaction(async (tx) => {
            // Create the team
            const team = await tx.userTeam.create({
                data: {
                    userId,
                    tournamentId,
                    teamName,
                    captainId,
                    viceCaptainId,
                    totalCredits
                }
            });
            // Add players to team
            await tx.userTeamPlayer.createMany({
                data: playerIds.map((playerId) => ({
                    userTeamId: team.id,
                    playerId
                }))
            });
            // Update tournament participant count
            await tx.tournament.update({
                where: { id: tournamentId },
                data: {
                    currentParticipants: {
                        increment: 1
                    }
                }
            });
            return team;
        });
        res.json({
            success: true,
            team: {
                id: result.id,
                teamName: result.teamName,
                captainId: result.captainId,
                viceCaptainId: result.viceCaptainId,
                totalCredits: result.totalCredits,
                createdAt: result.createdAt
            }
        });
    }
    catch (error) {
        console.error('Team creation error:', error);
        res.status(500).json({ error: 'Failed to create team' });
    }
});
// GET /api/teams/user/:userId - Get user's teams
router.get('/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { tournamentId } = req.query;
        const whereClause = { userId };
        if (tournamentId) {
            whereClause.tournamentId = tournamentId;
        }
        const teams = await prisma.userTeam.findMany({
            where: whereClause,
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
        res.json({
            success: true,
            teams: teams.map((team) => ({
                id: team.id,
                teamName: team.teamName,
                captainId: team.captainId,
                viceCaptainId: team.viceCaptainId,
                totalCredits: team.totalCredits,
                tournament: team.tournament,
                players: team.players.map((tp) => ({
                    id: tp.player.id,
                    name: tp.player.name,
                    team: tp.player.team,
                    role: tp.player.role,
                    creditValue: tp.player.creditValue,
                    isCaptain: tp.player.id === team.captainId,
                    isViceCaptain: tp.player.id === team.viceCaptainId
                })),
                totalScore: team.scores.reduce((sum, score) => sum + Number(score.totalScore), 0),
                rewards: team.rewards,
                createdAt: team.createdAt
            }))
        });
    }
    catch (error) {
        console.error('Teams fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch teams' });
    }
});
// GET /api/teams/:id - Get specific team details
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const team = await prisma.userTeam.findUnique({
            where: { id },
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
        if (!team) {
            return res.status(404).json({ error: 'Team not found' });
        }
        res.json({
            success: true,
            team: {
                id: team.id,
                teamName: team.teamName,
                captainId: team.captainId,
                viceCaptainId: team.viceCaptainId,
                totalCredits: team.totalCredits,
                user: team.user,
                tournament: team.tournament,
                players: team.players.map((tp) => ({
                    id: tp.player.id,
                    name: tp.player.name,
                    team: tp.player.team,
                    role: tp.player.role,
                    creditValue: tp.player.creditValue,
                    isCaptain: tp.player.id === team.captainId,
                    isViceCaptain: tp.player.id === team.viceCaptainId
                })),
                scores: team.scores,
                rewards: team.rewards,
                createdAt: team.createdAt
            }
        });
    }
    catch (error) {
        console.error('Team fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch team' });
    }
});
// PUT /api/teams/:id - Update team (only if tournament is upcoming)
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { teamName, captainId, viceCaptainId, playerIds } = req.body;
        // Get current team
        const currentTeam = await prisma.userTeam.findUnique({
            where: { id },
            include: {
                tournament: true,
                players: {
                    include: {
                        player: true
                    }
                }
            }
        });
        if (!currentTeam) {
            return res.status(404).json({ error: 'Team not found' });
        }
        if (currentTeam.tournament.status !== 'UPCOMING') {
            return res.status(400).json({ error: 'Cannot modify team after tournament starts' });
        }
        // Validation
        if (playerIds && playerIds.length !== 11) {
            return res.status(400).json({ error: 'Team must have exactly 11 players' });
        }
        if (playerIds && (!playerIds.includes(captainId) || !playerIds.includes(viceCaptainId))) {
            return res.status(400).json({ error: 'Captain and vice-captain must be in the team' });
        }
        // Update team in transaction
        const result = await prisma.$transaction(async (tx) => {
            // Update team basic info
            const team = await tx.userTeam.update({
                where: { id },
                data: {
                    teamName: teamName || currentTeam.teamName,
                    captainId: captainId || currentTeam.captainId,
                    viceCaptainId: viceCaptainId || currentTeam.viceCaptainId
                }
            });
            // If players are being updated
            if (playerIds) {
                // Validate players
                const players = await tx.player.findMany({
                    where: {
                        id: { in: playerIds },
                        team: { in: [currentTeam.tournament.team1, currentTeam.tournament.team2] },
                        isActive: true
                    }
                });
                if (players.length !== 11) {
                    throw new Error('Invalid players selected');
                }
                // Calculate total credits
                const totalCredits = players.reduce((sum, player) => sum + Number(player.creditValue), 0);
                if (totalCredits > 100) {
                    throw new Error('Team exceeds credit limit of 100');
                }
                // Update team credits
                await tx.userTeam.update({
                    where: { id },
                    data: { totalCredits }
                });
                // Remove existing players
                await tx.userTeamPlayer.deleteMany({
                    where: { userTeamId: id }
                });
                // Add new players
                await tx.userTeamPlayer.createMany({
                    data: playerIds.map((playerId) => ({
                        userTeamId: id,
                        playerId
                    }))
                });
            }
            return team;
        });
        res.json({
            success: true,
            team: {
                id: result.id,
                teamName: result.teamName,
                captainId: result.captainId,
                viceCaptainId: result.viceCaptainId,
                totalCredits: result.totalCredits
            }
        });
    }
    catch (error) {
        console.error('Team update error:', error);
        res.status(500).json({ error: error.message || 'Failed to update team' });
    }
});
// DELETE /api/teams/:id - Delete team (only if tournament is upcoming)
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const team = await prisma.userTeam.findUnique({
            where: { id },
            include: { tournament: true }
        });
        if (!team) {
            return res.status(404).json({ error: 'Team not found' });
        }
        if (team.tournament.status !== 'UPCOMING') {
            return res.status(400).json({ error: 'Cannot delete team after tournament starts' });
        }
        // Delete team in transaction
        await prisma.$transaction(async (tx) => {
            // Delete team players
            await tx.userTeamPlayer.deleteMany({
                where: { userTeamId: id }
            });
            // Delete team
            await tx.userTeam.delete({
                where: { id }
            });
            // Update tournament participant count
            await tx.tournament.update({
                where: { id: team.tournamentId },
                data: {
                    currentParticipants: {
                        decrement: 1
                    }
                }
            });
        });
        res.json({
            success: true,
            message: 'Team deleted successfully'
        });
    }
    catch (error) {
        console.error('Team deletion error:', error);
        res.status(500).json({ error: 'Failed to delete team' });
    }
});
export default router;
//# sourceMappingURL=teams.js.map