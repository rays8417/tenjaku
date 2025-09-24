# 🏏 Cricket Fantasy Backend API

A comprehensive backend API for cricket fantasy sports application on Aptos blockchain, featuring centralized tournament and reward management.

## 🚀 Features

- **User Management**: Petra wallet authentication with auto-registration
- **Tournament System**: One-match-per-tournament with centralized management
- **Team Creation**: Fantasy team creation with captain/vice-captain system
- **Scoring System**: Real-time fantasy point calculation with cricket-specific metrics
- **Reward Distribution**: Flexible reward pool management with multiple distribution types
- **Admin Panel**: Complete admin controls for tournaments, players, and rewards
- **Leaderboards**: Real-time tournament rankings and statistics

## 📋 Prerequisites

- Node.js 18+
- PostgreSQL database
- npm or yarn

## 🛠️ Installation

1. **Clone and install dependencies:**
```bash
npm install
```

2. **Set up environment variables:**
Create a `.env` file in the root directory:
```env
DATABASE_URL="postgresql://username:password@localhost:5432/cricket_fantasy_db"
PORT=3000
```

3. **Set up database:**
```bash
# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# (Optional) Open Prisma Studio
npm run prisma:studio
```

4. **Start the development server:**
```bash
npm run dev
```

## 📚 API Documentation

### Base URL
```
http://localhost:3000/api
```

### Authentication
All user authentication is handled via Petra wallet. Users are automatically created on first login.

---

## 👤 User Routes (`/api/users`)

### POST `/login`
Login/Register with Petra wallet
```json
{
  "walletAddress": "0x1234...",
  "displayName": "Player Name",
  "avatar": "https://..."
}
```

### GET `/profile/:walletAddress`
Get user profile with teams and rewards

### PUT `/profile/:walletAddress`
Update user profile
```json
{
  "displayName": "New Name",
  "avatar": "https://..."
}
```

### GET `/stats/:walletAddress`
Get user statistics (tournaments, earnings, etc.)

---

## 🏆 Tournament Routes (`/api/tournaments`)

### GET `/`
Get all tournaments with filters
- Query params: `status`, `limit`, `offset`

### GET `/:id`
Get tournament details with teams, leaderboard, and player scores

### GET `/:id/leaderboard`
Get tournament leaderboard
- Query params: `limit`

### GET `/:id/players`
Get available players for tournament

---

## ⚾ Team Routes (`/api/teams`)

### POST `/`
Create fantasy team
```json
{
  "userId": "user-id",
  "tournamentId": "tournament-id",
  "teamName": "My Team",
  "captainId": "player-id",
  "viceCaptainId": "player-id",
  "playerIds": ["player1", "player2", ...]
}
```

### GET `/user/:userId`
Get user's teams
- Query params: `tournamentId`

### GET `/:id`
Get specific team details

### PUT `/:id`
Update team (only if tournament is upcoming)

### DELETE `/:id`
Delete team (only if tournament is upcoming)

---

## 🎯 Scoring Routes (`/api/scoring`)

### POST `/player-scores`
Update player scores (Admin only)
```json
{
  "tournamentId": "tournament-id",
  "playerScores": [
    {
      "playerId": "player-id",
      "runs": 50,
      "ballsFaced": 30,
      "wickets": 2,
      "oversBowled": 4.0,
      "runsConceded": 20,
      "catches": 1,
      "stumpings": 0,
      "runOuts": 1
    }
  ]
}
```

### POST `/calculate-user-scores`
Calculate user team scores based on player performance

### POST `/update-leaderboard`
Update tournament leaderboard rankings

### GET `/tournament/:tournamentId/scores`
Get all scores for a tournament

---

## 💰 Reward Routes (`/api/rewards`)

### POST `/create-pool`
Create reward pool (Admin only)
```json
{
  "tournamentId": "tournament-id",
  "name": "Main Prize Pool",
  "totalAmount": 1000.0,
  "distributionType": "PERCENTAGE",
  "distributionRules": "{\"rules\":[{\"rank\":1,\"percentage\":50},{\"rank\":2,\"percentage\":25},{\"rank\":3,\"percentage\":15},{\"rank\":\"4-10\",\"percentage\":10}]}"
}
```

### GET `/tournament/:tournamentId`
Get reward pools for tournament

### POST `/distribute`
Distribute rewards based on leaderboard

### POST `/process/:rewardId`
Process individual reward (Admin only)

### PUT `/:rewardId/status`
Update reward status

### GET `/user/:walletAddress`
Get user's rewards

---

## 🔧 Admin Routes (`/api/admin`)

### POST `/tournaments`
Create tournament
```json
{
  "name": "India vs Australia - T20 World Cup",
  "description": "High-stakes T20 match",
  "matchDate": "2024-01-15T19:00:00Z",
  "team1": "India",
  "team2": "Australia",
  "venue": "Melbourne Cricket Ground",
  "entryFee": 10.0,
  "maxParticipants": 1000
}
```

### PUT `/tournaments/:id`
Update tournament

### DELETE `/tournaments/:id`
Delete tournament (only if no participants)

### POST `/players`
Create player
```json
{
  "name": "Virat Kohli",
  "team": "India",
  "role": "BATSMAN",
  "creditValue": 10.5
}
```

### PUT `/players/:id`
Update player

### GET `/stats`
Get admin statistics

### GET `/tournaments`
Get all tournaments with detailed info

### GET `/users`
Get all users

---

## 🎮 Fantasy Scoring System

### Batting Points
- **Runs**: 1 point per run
- **Bonus**: 1 point per 2 balls faced (staying bonus)

### Bowling Points
- **Wickets**: 25 points per wicket
- **Overs**: 1 point per 2 balls bowled
- **Economy Bonus**: 
  - < 4 runs/over: +6 points
  - 4-6 runs/over: +4 points
  - 6-8 runs/over: +2 points

### Fielding Points
- **Catches**: 8 points per catch
- **Stumpings**: 10 points per stumping
- **Run Outs**: 6 points per run out

### Multipliers
- **Captain**: 1.5x points
- **Vice-Captain**: 1.25x points

---

## 🏗️ Database Schema

The application uses a simplified one-match-per-tournament schema:

- **Users**: Wallet-based authentication with profile data
- **Tournaments**: Single match tournaments with team info
- **Players**: Cricket players with roles and credit values
- **UserTeams**: Fantasy teams with captain/vice-captain
- **PlayerScores**: Match performance data
- **UserScores**: Calculated fantasy points
- **RewardPools**: Flexible reward distribution
- **UserRewards**: Individual reward tracking
- **LeaderboardEntries**: Tournament rankings

---

## 🚀 Getting Started

1. **Create a tournament:**
```bash
curl -X POST http://localhost:3000/api/admin/tournaments \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Match",
    "matchDate": "2024-01-15T19:00:00Z",
    "team1": "India",
    "team2": "Australia",
    "entryFee": 5.0
  }'
```

2. **User login:**
```bash
curl -X POST http://localhost:3000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "0x1234...",
    "displayName": "Test Player"
  }'
```

3. **Create fantasy team:**
```bash
curl -X POST http://localhost:3000/api/teams \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-id",
    "tournamentId": "tournament-id",
    "teamName": "My Fantasy Team",
    "captainId": "player-id",
    "viceCaptainId": "player-id",
    "playerIds": ["player1", "player2", ...]
  }'
```

---

## 🔮 Future Enhancements

- Aptos blockchain integration for reward distribution
- Real-time WebSocket updates
- Advanced analytics and statistics
- Social features (friends, leagues)
- Mobile app integration
- Automated player score updates from external APIs

---

## 📝 License

ISC License
