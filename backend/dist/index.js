import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
// Load environment variables
dotenv.config();
const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;
// Middleware
app.use(cors());
app.use(express.json());
// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});
// Import route modules
import userRoutes from './routes/users.js';
import tournamentRoutes from './routes/tournaments.js';
import teamRoutes from './routes/teams.js';
import scoringRoutes from './routes/scoring.js';
import rewardRoutes from './routes/rewards.js';
import adminRoutes from './routes/admin.js';
// Use routes
app.use('/api/users', userRoutes);
app.use('/api/tournaments', tournamentRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/scoring', scoringRoutes);
app.use('/api/rewards', rewardRoutes);
app.use('/api/admin', adminRoutes);
// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});
// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Route not found' });
});
// Start server
app.listen(PORT, () => {
    console.log(`🚀 Cricket Fantasy API running on port ${PORT}`);
});
export { prisma };
//# sourceMappingURL=index.js.map