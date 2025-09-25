# Tournament Feature Testing Guide

This guide provides complete mock data and testing procedures for the tournament feature with Aptos integration.

## 🚀 Quick Start Testing

### 1. Environment Setup

Create a `.env` file with:
```env
DATABASE_URL="postgresql://username:password@localhost:5432/cdf_database"
APTOS_NETWORK="testnet"
APTOS_CONTRACT_ADDRESS="0xfc2dd980078982103eac1f58488e7af24afbc29986fab1dfdaa2799326ec309f"
PORT=3000
```

### 2. Start the Server
```bash
cd backend
npm run dev
```

---

## 📋 Complete Testing Flow

### **Phase 1: Sync Data from Aptos Contract (NEW APPROACH)**

#### **1.1 Discover Players from Contract**
```bash
GET http://localhost:3000/api/admin/discover-contract-players
```

**Response:**
```json
{
  "success": true,
  "message": "Discovered 5 players from contract",
  "players": [
    {
      "name": "AbhishekSharma",
      "moduleName": "AbhishekSharma",
      "team": "Unknown",
      "role": "ALL_ROUNDER",
      "tokenSupply": "20000000",
      "tokenPrice": 0.001
    }
  ]
}
```

#### **1.2 Sync All Data from Contract (Recommended)**
```bash
POST http://localhost:3000/api/admin/sync-all-from-contract
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully synced 5 players and 12 users from contract",
  "result": {
    "players": {
      "totalDiscovered": 5,
      "totalSynced": 5
    },
    "users": {
      "totalHolders": 15,
      "uniqueAddresses": 12,
      "totalSynced": 12
    },
    "summary": {
      "totalPlayersSynced": 5,
      "totalUsersSynced": 12,
      "totalSynced": 17
    }
  }
}
```

#### **1.3 Alternative: Sync Players and Users Separately**
```bash
# Sync players only
POST http://localhost:3000/api/admin/sync-players-from-contract

# Sync users only  
POST http://localhost:3000/api/admin/sync-users-from-contract
```

#### **1.4 Verify Synced Data**
```bash
# Check synced players
GET http://localhost:3000/api/admin/players

# Check synced users
GET http://localhost:3000/api/admin/users

# Check current token holders
GET http://localhost:3000/api/snapshots/aptos-holders
```

---

### **Phase 2: Create Tournament**

#### **2.1 Create Tournament**
```bash
POST http://localhost:3000/api/tournaments
Content-Type: application/json

{
  "name": "India vs Australia - T20 World Cup",
  "description": "Semi-final match between India and Australia",
  "matchDate": "2024-01-15T19:00:00Z",
  "team1": "India",
  "team2": "Australia", 
  "venue": "Melbourne Cricket Ground",
  "entryFee": 10.0,
  "maxParticipants": 1000
}
```

**Save the tournament ID from response for next steps!**

#### **2.2 Create User Teams**
```bash
POST http://localhost:3000/api/tournaments/TOURNAMENT_ID/teams
Content-Type: application/json

{
  "userId": "USER_ID_1",
  "teamName": "Dream Team Alpha",
  "captainId": "VIRAT_PLAYER_ID",
  "viceCaptainId": "ABHISHEK_PLAYER_ID",
  "players": [
    "VIRAT_PLAYER_ID",
    "ABHISHEK_PLAYER_ID", 
    "ROHIT_PLAYER_ID",
    "PAT_CUMMINS_PLAYER_ID",
    "GLENN_MAXWELL_PLAYER_ID"
  ]
}

POST http://localhost:3000/api/tournaments/TOURNAMENT_ID/teams
Content-Type: application/json

{
  "userId": "USER_ID_2",
  "teamName": "Champions XI",
  "captainId": "GLENN_MAXWELL_PLAYER_ID",
  "viceCaptainId": "PAT_CUMMINS_PLAYER_ID", 
  "players": [
    "VIRAT_PLAYER_ID",
    "ABHISHEK_PLAYER_ID",
    "ROHIT_PLAYER_ID", 
    "PAT_CUMMINS_PLAYER_ID",
    "GLENN_MAXWELL_PLAYER_ID"
  ]
}

POST http://localhost:3000/api/tournaments/TOURNAMENT_ID/teams
Content-Type: application/json

{
  "userId": "USER_ID_3",
  "teamName": "All Stars",
  "captainId": "ABHISHEK_PLAYER_ID",
  "viceCaptainId": "ROHIT_PLAYER_ID",
  "players": [
    "VIRAT_PLAYER_ID",
    "ABHISHEK_PLAYER_ID",
    "ROHIT_PLAYER_ID",
    "PAT_CUMMINS_PLAYER_ID", 
    "GLENN_MAXWELL_PLAYER_ID"
  ]
}
```

---

### **Phase 3: Pre-Match Snapshot**

#### **3.1 Create Pre-Match Snapshot**
```bash
POST http://localhost:3000/api/snapshots/create
Content-Type: application/json

{
  "tournamentId": "TOURNAMENT_ID",
  "snapshotType": "PRE_MATCH",
  "useAptosData": true
}
```

#### **3.2 Verify Pre-Match Snapshot**
```bash
GET http://localhost:3000/api/snapshots/tournament/TOURNAMENT_ID
```

#### **3.3 Check Aptos Holders (Optional)**
```bash
GET http://localhost:3000/api/snapshots/aptos-holders
```

---

### **Phase 4: Match Execution - Record Player Scores**

#### **4.1 Record Player Performance**
```bash
POST http://localhost:3000/api/scoring/player-scores
Content-Type: application/json

{
  "tournamentId": "TOURNAMENT_ID",
  "playerScores": [
    {
      "playerId": "ABHISHEK_PLAYER_ID",
      "runs": 45,
      "ballsFaced": 30,
      "wickets": 2,
      "oversBowled": 4.0,
      "runsConceded": 28,
      "catches": 1,
      "stumpings": 0,
      "runOuts": 0,
      "fantasyPoints": 85.5
    },
    {
      "playerId": "VIRAT_PLAYER_ID",
      "runs": 78,
      "ballsFaced": 55,
      "wickets": 0,
      "oversBowled": 0,
      "runsConceded": 0,
      "catches": 2,
      "stumpings": 0,
      "runOuts": 1,
      "fantasyPoints": 98.0
    },
    {
      "playerId": "ROHIT_PLAYER_ID",
      "runs": 52,
      "ballsFaced": 38,
      "wickets": 0,
      "oversBowled": 0,
      "runsConceded": 0,
      "catches": 0,
      "stumpings": 0,
      "runOuts": 0,
      "fantasyPoints": 62.0
    },
    {
      "playerId": "GLENN_MAXWELL_PLAYER_ID",
      "runs": 35,
      "ballsFaced": 22,
      "wickets": 1,
      "oversBowled": 3.0,
      "runsConceded": 24,
      "catches": 1,
      "stumpings": 0,
      "runOuts": 0,
      "fantasyPoints": 67.5
    },
    {
      "playerId": "PAT_CUMMINS_PLAYER_ID",
      "runs": 12,
      "ballsFaced": 8,
      "wickets": 3,
      "oversBowled": 4.0,
      "runsConceded": 32,
      "catches": 0,
      "stumpings": 0,
      "runOuts": 0,
      "fantasyPoints": 78.0
    }
  ]
}
```

#### **4.2 Calculate User Team Scores**
```bash
POST http://localhost:3000/api/scoring/calculate-user-scores
Content-Type: application/json

{
  "tournamentId": "TOURNAMENT_ID"
}
```

#### **4.3 Update Leaderboard**
```bash
POST http://localhost:3000/api/scoring/update-leaderboard
Content-Type: application/json

{
  "tournamentId": "TOURNAMENT_ID"
}
```

---

### **Phase 5: Post-Match Snapshot**

#### **5.1 Create Post-Match Snapshot**
```bash
POST http://localhost:3000/api/snapshots/create
Content-Type: application/json

{
  "tournamentId": "TOURNAMENT_ID",
  "snapshotType": "POST_MATCH",
  "useAptosData": true
}
```

#### **5.2 Compare Pre vs Post Match**
```bash
POST http://localhost:3000/api/snapshots/compare-pre-post
Content-Type: application/json

{
  "tournamentId": "TOURNAMENT_ID"
}
```

---

### **Phase 6: Reward Calculation**

#### **6.1 Create Reward Pool**
```bash
POST http://localhost:3000/api/rewards/create-pool
Content-Type: application/json

{
  "tournamentId": "TOURNAMENT_ID",
  "name": "Main Reward Pool",
  "totalAmount": 1000.0,
  "distributionType": "PERCENTAGE",
  "distributionRules": {
    "fantasyPerformance": 70,
    "holdingBehavior": 20,
    "participationBonus": 10
  }
}
```

#### **6.2 Calculate Rewards**
```bash
POST http://localhost:3000/api/rewards/calculate
Content-Type: application/json

{
  "tournamentId": "TOURNAMENT_ID",
  "rewardPoolId": "REWARD_POOL_ID"
}
```

#### **6.3 Distribute Rewards**
```bash
POST http://localhost:3000/api/rewards/distribute
Content-Type: application/json

{
  "tournamentId": "TOURNAMENT_ID",
  "rewardPoolId": "REWARD_POOL_ID"
}
```

---

### **Phase 7: Tournament Completion**

#### **7.1 Get Final Leaderboard**
```bash
GET http://localhost:3000/api/tournaments/TOURNAMENT_ID/leaderboard
```

#### **7.2 Get Tournament Analytics**
```bash
GET http://localhost:3000/api/tournaments/TOURNAMENT_ID/analytics
```

#### **7.3 Update Tournament Status**
```bash
PATCH http://localhost:3000/api/tournaments/TOURNAMENT_ID
Content-Type: application/json

{
  "status": "COMPLETED"
}
```

---

## 📊 Expected Results

### **Pre-Match Snapshot Response:**
```json
{
  "success": true,
  "snapshot": {
    "snapshotId": "snapshot-uuid",
    "tournamentId": "tournament-uuid",
    "snapshotType": "PRE_MATCH",
    "blockNumber": "123456789",
    "totalUsers": 3,
    "totalHoldings": 15,
    "aptosHolders": 5,
    "databaseHoldings": 15,
    "mergedHoldings": 15
  }
}
```

### **Player Scores Response:**
```json
{
  "success": true,
  "scores": [
    {
      "playerId": "player-uuid",
      "playerName": "Abhishek Sharma",
      "fantasyPoints": 85.5,
      "runs": 45,
      "wickets": 2
    }
  ]
}
```

### **Post-Match Comparison Response:**
```json
{
  "success": true,
  "comparison": {
    "summary": {
      "totalUsers": 3,
      "preMatchHoldings": 15,
      "postMatchHoldings": 15,
      "newHoldings": 0,
      "removedHoldings": 0,
      "changedHoldings": 0,
      "unchangedHoldings": 15
    },
    "rewardEligibility": [
      {
        "userId": "user-uuid",
        "preMatchValue": 5000,
        "postMatchValue": 4800,
        "rewardMultiplier": 1.2
      }
    ],
    "totalEligibleUsers": 3
  }
}
```

### **Final Leaderboard Response:**
```json
{
  "success": true,
  "leaderboard": [
    {
      "rank": 1,
      "userTeamId": "team-uuid",
      "teamName": "Dream Team Alpha",
      "totalScore": 183.5,
      "user": {
        "displayName": "Test User 1",
        "walletAddress": "0x123..."
      },
      "rewards": {
        "fantasyReward": 700,
        "holdingReward": 200,
        "participationReward": 100,
        "totalReward": 1000
      }
    }
  ]
}
```

---

## 🔧 Testing Tips

### **1. Data Validation**
- Always save IDs from responses for next requests
- Check response status codes (200, 201, 400, 500)
- Validate data structure matches expected format

### **2. Error Testing**
- Test with invalid tournament IDs
- Test with missing required fields
- Test with invalid player IDs

### **3. Edge Cases**
- Test with zero token holders
- Test with no eligible users
- Test with empty reward pools

### **4. Performance Testing**
- Test with large numbers of players
- Test with many user teams
- Test snapshot creation with many holders

---

## 🐛 Common Issues & Solutions

### **Issue: "Tournament not found"**
**Solution:** Ensure you're using the correct tournament ID from the creation response

### **Issue: "Player not found"**
**Solution:** Create players first and use their exact IDs

### **Issue: "User not found"**
**Solution:** Register users first and use their wallet addresses

### **Issue: "Aptos connection failed"**
**Solution:** Check your Aptos network configuration and contract address

### **Issue: "Insufficient snapshots for comparison"**
**Solution:** Create both PRE_MATCH and POST_MATCH snapshots before comparing

---

## 📝 Postman Collection

Create a Postman collection with these folders:
1. **Setup** (Players, Users, Holdings)
2. **Tournament Creation** (Tournament, Teams)
3. **Pre-Match** (Snapshot creation)
4. **Match Execution** (Scoring)
5. **Post-Match** (Snapshot, Comparison)
6. **Rewards** (Calculation, Distribution)
7. **Completion** (Leaderboard, Analytics)

Save environment variables:
- `base_url`: http://localhost:3000
- `tournament_id`: (from creation response)
- `user_id_1`: (from user registration)
- `user_id_2`: (from user registration)
- `user_id_3`: (from user registration)

This testing guide provides a complete end-to-end test of the tournament feature! 🎯🏆
