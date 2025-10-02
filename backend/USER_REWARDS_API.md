# User Rewards API Documentation

## Overview
Simple API endpoints to fetch user rewards for the frontend dashboard.

## Base URL
```
http://localhost:3000/api/user-rewards
```

---

## Endpoints

### 1. Get All Rewards for a User
Get all tournament rewards earned by a specific wallet address.

**Endpoint:**
```
GET /api/user-rewards/:address
```

**Example:**
```bash
GET /api/user-rewards/0xaf230e3024e92da6a3a15f5a6a3f201c886891268717bf8a21157bb73a1c027b
```

**Response:**
```json
{
  "success": true,
  "address": "0xaf230e...",
  "totalEarnings": 150.5,
  "totalRewards": 3,
  "rewards": [
    {
      "id": "reward-uuid",
      "tournamentId": "tournament-123",
      "tournamentName": "World Cup Final",
      "team1": "India",
      "team2": "Australia",
      "matchDate": "2024-03-15T19:00:00Z",
      "amount": 50.25,
      "percentage": 33.5,
      "status": "COMPLETED",
      "transactionId": "0x123abc...",
      "rank": 1,
      "createdAt": "2024-03-16T10:00:00Z",
      "metadata": {
        "totalScore": 1526640000000,
        "totalTokens": "19837999000000000",
        "eligibility": {
          "eligible": true,
          "eligibilityPercentage": 90.0
        },
        "holdings": [...]
      }
    }
  ]
}
```

---

### 2. Get Rewards for a Tournament
Get all rewards distributed in a specific tournament.

**Endpoint:**
```
GET /api/user-rewards/tournament/:tournamentId
```

**Example:**
```bash
GET /api/user-rewards/tournament/2c177359-eb3d-4c76-adc0-d6cb80a42a45
```

**Response:**
```json
{
  "success": true,
  "tournament": {
    "id": "tournament-123",
    "name": "World Cup Final",
    "team1": "India",
    "team2": "Australia",
    "matchDate": "2024-03-15T19:00:00Z",
    "status": "COMPLETED"
  },
  "rewardPool": {
    "id": "pool-uuid",
    "totalAmount": 100,
    "distributedAmount": 99.95,
    "distributionType": "PERCENTAGE"
  },
  "totalRewards": 75,
  "totalDistributed": 99.95,
  "rewards": [
    {
      "rank": 1,
      "address": "0xaf230e...",
      "amount": 50.25,
      "percentage": 50.25,
      "status": "COMPLETED",
      "transactionId": "0x123abc...",
      "metadata": {...}
    },
    {
      "rank": 2,
      "address": "0x54aac0...",
      "amount": 25.10,
      "percentage": 25.1,
      "status": "COMPLETED",
      "transactionId": "0x456def...",
      "metadata": {...}
    }
  ]
}
```

---

### 3. Get User Reward for Specific Tournament
Check if a specific user earned reward in a specific tournament.

**Endpoint:**
```
GET /api/user-rewards/address/:address/tournament/:tournamentId
```

**Example:**
```bash
GET /api/user-rewards/address/0xaf230e.../tournament/tournament-123
```

**Response (Has Reward):**
```json
{
  "success": true,
  "hasReward": true,
  "address": "0xaf230e...",
  "tournament": {
    "id": "tournament-123",
    "name": "World Cup Final",
    "team1": "India",
    "team2": "Australia",
    "matchDate": "2024-03-15T19:00:00Z",
    "status": "COMPLETED"
  },
  "reward": {
    "id": "reward-uuid",
    "amount": 50.25,
    "percentage": 50.25,
    "status": "COMPLETED",
    "transactionId": "0x123abc...",
    "rank": 1,
    "createdAt": "2024-03-16T10:00:00Z",
    "metadata": {...}
  }
}
```

**Response (No Reward):**
```json
{
  "success": true,
  "message": "No reward found for this address in this tournament",
  "address": "0x123...",
  "tournament": {
    "id": "tournament-123",
    "name": "World Cup Final"
  },
  "hasReward": false
}
```

---

### 4. Get Tournament Leaderboard
Get top earners for a tournament.

**Endpoint:**
```
GET /api/user-rewards/leaderboard/:tournamentId?limit=10
```

**Query Parameters:**
- `limit` (optional): Number of top earners to return. Default: 10

**Example:**
```bash
GET /api/user-rewards/leaderboard/tournament-123?limit=5
```

**Response:**
```json
{
  "success": true,
  "tournament": {
    "id": "tournament-123",
    "name": "World Cup Final",
    "team1": "India",
    "team2": "Australia",
    "matchDate": "2024-03-15T19:00:00Z"
  },
  "rewardPool": {
    "totalAmount": 100,
    "totalDistributed": 99.95
  },
  "leaderboard": [
    {
      "rank": 1,
      "address": "0xaf230e...",
      "amount": 50.25,
      "percentage": 50.25,
      "status": "COMPLETED"
    },
    {
      "rank": 2,
      "address": "0x54aac0...",
      "amount": 25.10,
      "percentage": 25.1,
      "status": "COMPLETED"
    }
  ]
}
```

---

## Frontend Usage Examples

### React/Next.js Example

```typescript
// Fetch user's all rewards
const fetchUserRewards = async (address: string) => {
  const response = await fetch(
    `http://localhost:3000/api/user-rewards/${address}`
  );
  const data = await response.json();
  
  if (data.success) {
    console.log('Total Earnings:', data.totalEarnings);
    console.log('Rewards:', data.rewards);
  }
};

// Fetch tournament leaderboard
const fetchLeaderboard = async (tournamentId: string) => {
  const response = await fetch(
    `http://localhost:3000/api/user-rewards/leaderboard/${tournamentId}?limit=10`
  );
  const data = await response.json();
  
  if (data.success) {
    console.log('Leaderboard:', data.leaderboard);
  }
};

// Check if user earned reward in tournament
const checkUserReward = async (address: string, tournamentId: string) => {
  const response = await fetch(
    `http://localhost:3000/api/user-rewards/address/${address}/tournament/${tournamentId}`
  );
  const data = await response.json();
  
  if (data.success && data.hasReward) {
    console.log('Reward Amount:', data.reward.amount);
    console.log('Transaction:', data.reward.transactionId);
  }
};
```

---

## Dashboard Components Suggestions

### 1. User Dashboard - "My Earnings"
```typescript
// Show total earnings and list of tournaments
const UserEarnings = ({ userAddress }) => {
  const [rewards, setRewards] = useState(null);
  
  useEffect(() => {
    fetch(`/api/user-rewards/${userAddress}`)
      .then(res => res.json())
      .then(data => setRewards(data));
  }, [userAddress]);
  
  return (
    <div>
      <h2>Total Earnings: {rewards?.totalEarnings} BOSON</h2>
      <ul>
        {rewards?.rewards.map(reward => (
          <li key={reward.id}>
            {reward.tournamentName}: {reward.amount} BOSON
          </li>
        ))}
      </ul>
    </div>
  );
};
```

### 2. Tournament Page - "Leaderboard"
```typescript
// Show top earners for a tournament
const TournamentLeaderboard = ({ tournamentId }) => {
  const [leaderboard, setLeaderboard] = useState(null);
  
  useEffect(() => {
    fetch(`/api/user-rewards/leaderboard/${tournamentId}?limit=20`)
      .then(res => res.json())
      .then(data => setLeaderboard(data));
  }, [tournamentId]);
  
  return (
    <table>
      <thead>
        <tr>
          <th>Rank</th>
          <th>Address</th>
          <th>Reward</th>
          <th>%</th>
        </tr>
      </thead>
      <tbody>
        {leaderboard?.leaderboard.map(entry => (
          <tr key={entry.rank}>
            <td>{entry.rank}</td>
            <td>{entry.address.slice(0, 8)}...</td>
            <td>{entry.amount} BOSON</td>
            <td>{entry.percentage.toFixed(2)}%</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};
```

---

## Database Migration

Run this after updating the schema:

```bash
cd backend
npx prisma migrate dev --name add_metadata_to_user_rewards
npx prisma generate
```

---

## Testing the API

```bash
# Start the server
npm run dev

# Test getting user rewards
curl http://localhost:3000/api/user-rewards/0xaf230e3024e92da6a3a15f5a6a3f201c886891268717bf8a21157bb73a1c027b

# Test tournament leaderboard
curl http://localhost:3000/api/user-rewards/leaderboard/2c177359-eb3d-4c76-adc0-d6cb80a42a45
```

---

## Notes

- All amounts are in BOSON tokens (the game's reward currency)
- Transaction IDs are Aptos blockchain transaction hashes
- Metadata includes detailed breakdown of scores and holdings
- Status can be: PENDING, PROCESSING, COMPLETED, or FAILED

