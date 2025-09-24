import express from 'express';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const router = express.Router();
// POST /api/scoring/player-scores - Update player scores (Admin only)
router.post('/player-scores', async (req, res) => {
    try {
        const { tournamentId, playerScores } = req.body;
        if (!tournamentId || !playerScores || !Array.isArray(playerScores)) {
            return res.status(400).json({ error: 'Tournament ID and player scores array are required' });
        }
        // Check if tournament exists
        const tournament = await prisma.tournament.findUnique({
            where: { id: tournamentId }
        });
        if (!tournament) {
            return res.status(404).json({ error: 'Tournament not found' });
        }
        // Update player scores in transaction
        const result = await prisma.$transaction(async (tx) => {
            const updatedScores = [];
            for (const scoreData of playerScores) {
                const { playerId, runs, ballsFaced, wickets, oversBowled, runsConceded, catches, stumpings, runOuts } = scoreData;
                // Calculate fantasy points based on cricket scoring system
                let fantasyPoints = 0;
                // Batting points
                fantasyPoints += runs * 1; // 1 point per run
                fantasyPoints += Math.floor(ballsFaced / 2) * 1; // 1 point per 2 balls faced (bonus for staying)
                // Bowling points
                fantasyPoints += wickets * 25; // 25 points per wicket
                fantasyPoints += Math.floor(oversBowled * 2) * 1; // 1 point per 2 balls bowled
                if (oversBowled >= 2) {
                    const economy = runsConceded / oversBowled;
                    if (economy < 4)
                        fantasyPoints += 6; // Bonus for good economy
                    else if (economy < 6)
                        fantasyPoints += 4;
                    else if (economy < 8)
                        fantasyPoints += 2;
                }
                // Fielding points
                fantasyPoints += catches * 8; // 8 points per catch
                fantasyPoints += stumpings * 10; // 10 points per stumping
                fantasyPoints += runOuts * 6; // 6 points per run out
                // Update or create player score
                const playerScore = await tx.playerScore.upsert({
                    where: {
                        tournamentId_playerId: {
                            tournamentId,
                            playerId
                        }
                    },
                    update: {
                        runs,
                        ballsFaced,
                        wickets,
                        oversBowled,
                        runsConceded,
                        catches,
                        stumpings,
                        runOuts,
                        fantasyPoints
                    },
                    create: {
                        tournamentId,
                        playerId,
                        runs,
                        ballsFaced,
                        wickets,
                        oversBowled,
                        runsConceded,
                        catches,
                        stumpings,
                        runOuts,
                        fantasyPoints
                    }
                });
                updatedScores.push(playerScore);
            }
            return updatedScores;
        });
        res.json({
            success: true,
            message: 'Player scores updated successfully',
            scores: result
        });
    }
    catch (error) {
        console.error('Player scores update error:', error);
        res.status(500).json({ error: 'Failed to update player scores' });
    }
});
// POST /api/scoring/calculate-user-scores - Calculate user team scores
router.post('/calculate-user-scores', async (req, res) => {
    try {
        const { tournamentId } = req.body;
        if (!tournamentId) {
            return res.status(400).json({ error: 'Tournament ID is required' });
        }
        // Get all user teams for this tournament
        const userTeams = await prisma.userTeam.findMany({
            where: { tournamentId },
            include: {
                players: {
                    include: {
                        player: true
                    }
                }
            }
        });
        // Calculate scores for each team
        const userScores = [];
        for (const team of userTeams) {
            let totalScore = 0;
            let captainPoints = 0;
            let viceCaptainPoints = 0;
            for (const teamPlayer of team.players) {
                // Get player score for this tournament
                const playerScore = await prisma.playerScore.findUnique({
                    where: {
                        tournamentId_playerId: {
                            tournamentId,
                            playerId: teamPlayer.playerId
                        }
                    }
                });
                if (playerScore) {
                    const basePoints = Number(playerScore.fantasyPoints);
                    if (teamPlayer.playerId === team.captainId) {
                        captainPoints = basePoints * 1.5; // Captain gets 1.5x points
                        totalScore += captainPoints;
                    }
                    else if (teamPlayer.playerId === team.viceCaptainId) {
                        viceCaptainPoints = basePoints * 1.25; // Vice-captain gets 1.25x points
                        totalScore += viceCaptainPoints;
                    }
                    else {
                        totalScore += basePoints;
                    }
                }
            }
            // Update or create user score
            const userScore = await prisma.userScore.upsert({
                where: {
                    userTeamId_tournamentId: {
                        userTeamId: team.id,
                        tournamentId
                    }
                },
                update: {
                    totalScore,
                    captainMultiplier: 1.5,
                    viceCaptainMultiplier: 1.25
                },
                create: {
                    userTeamId: team.id,
                    tournamentId,
                    totalScore,
                    captainMultiplier: 1.5,
                    viceCaptainMultiplier: 1.25
                }
            });
            userScores.push({
                teamId: team.id,
                teamName: team.teamName,
                totalScore,
                captainPoints,
                viceCaptainPoints
            });
        }
        res.json({
            success: true,
            message: 'User scores calculated successfully',
            scores: userScores
        });
    }
    catch (error) {
        console.error('User scores calculation error:', error);
        res.status(500).json({ error: 'Failed to calculate user scores' });
    }
});
// POST /api/scoring/update-leaderboard - Update tournament leaderboard
router.post('/update-leaderboard', async (req, res) => {
    try {
        const { tournamentId } = req.body;
        if (!tournamentId) {
            return res.status(400).json({ error: 'Tournament ID is required' });
        }
        // Get all user scores for this tournament
        const userScores = await prisma.userScore.findMany({
            where: { tournamentId },
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
        // Update leaderboard entries
        const leaderboardEntries = [];
        for (let i = 0; i < userScores.length; i++) {
            const userScore = userScores[i];
            const rank = i + 1;
            const leaderboardEntry = await prisma.leaderboardEntry.upsert({
                where: {
                    tournamentId_userTeamId: {
                        tournamentId,
                        userTeamId: userScore.userTeamId
                    }
                },
                update: {
                    totalScore: userScore.totalScore,
                    rank,
                    matchesPlayed: 1 // Since it's one match per tournament
                },
                create: {
                    tournamentId,
                    userTeamId: userScore.userTeamId,
                    totalScore: userScore.totalScore,
                    rank,
                    matchesPlayed: 1
                }
            });
            leaderboardEntries.push({
                rank: leaderboardEntry.rank,
                teamName: userScore.userTeam.teamName,
                user: userScore.userTeam.user,
                totalScore: leaderboardEntry.totalScore
            });
        }
        res.json({
            success: true,
            message: 'Leaderboard updated successfully',
            leaderboard: leaderboardEntries
        });
    }
    catch (error) {
        console.error('Leaderboard update error:', error);
        res.status(500).json({ error: 'Failed to update leaderboard' });
    }
});
// GET /api/scoring/tournament/:tournamentId/scores - Get all scores for a tournament
router.get('/tournament/:tournamentId/scores', async (req, res) => {
    try {
        const { tournamentId } = req.params;
        const tournament = await prisma.tournament.findUnique({
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
        if (!tournament) {
            return res.status(404).json({ error: 'Tournament not found' });
        }
        res.json({
            success: true,
            tournament: {
                id: tournament.id,
                name: tournament.name,
                team1: tournament.team1,
                team2: tournament.team2,
                playerScores: tournament.playerScores.map((ps) => ({
                    player: ps.player,
                    runs: ps.runs,
                    ballsFaced: ps.ballsFaced,
                    wickets: ps.wickets,
                    oversBowled: ps.oversBowled,
                    runsConceded: ps.runsConceded,
                    catches: ps.catches,
                    stumpings: ps.stumpings,
                    runOuts: ps.runOuts,
                    fantasyPoints: ps.fantasyPoints
                })),
                userScores: tournament.userScores.map((us) => ({
                    teamName: us.userTeam.teamName,
                    user: us.userTeam.user,
                    totalScore: us.totalScore,
                    captainMultiplier: us.captainMultiplier,
                    viceCaptainMultiplier: us.viceCaptainMultiplier
                }))
            }
        });
    }
    catch (error) {
        console.error('Scores fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch scores' });
    }
});
export default router;
//# sourceMappingURL=scoring.js.map