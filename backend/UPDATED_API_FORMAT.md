# Updated Cricket API Format

## ✅ Fixed API Response Structure

The actual Cricbuzz API response format has been updated to match the real API structure.

### Actual API Response Format

```json
{
  "scorecard": [
    {
      "inningsid": 1,
      "batsman": [
        {
          "id": 13625,
          "name": "Sahibzada Farhan",
          "balls": 38,
          "runs": 57,
          "fours": 5,
          "sixes": 3,
          "strkrate": "150",
          "outdec": "c Tilak Varma b Varun Chakaravarthy",
          "iscaptain": false,
          "iskeeper": false
        }
      ],
      "bowler": [
        {
          "id": 123,
          "name": "Shivam Dube",
          "wickets": 0,
          "overs": 3,
          "runs": 23,
          "economy": "7.7"
        }
      ]
    }
  ]
}
```

### Key Changes Made

1. **Field Name Changes:**
   - `scoreCard` → `scorecard` (lowercase 'c')
   - `batTeamDetails.batsmenData` → `batsman` (array)
   - `bowlTeamDetails.bowlersData` → `bowler` (array)
   - `batName` → `name`
   - `bowlName` → `name`
   - `outDesc` → `outdec`

2. **Structure Changes:**
   - Batsmen and bowlers are now arrays, not objects
   - Each player has an `id` field
   - Direct access via `innings.batsman[i]` instead of `innings.batTeamDetails.batsmenData[playerId]`

### Updated Parsing Functions

#### 1. Batting Performance
```typescript
function parseBattingPerformance(scorecardData: any) {
  for (const innings of scorecardData) {
    if (!innings.batsman || !Array.isArray(innings.batsman)) continue;
    
    for (const batsman of innings.batsman) {
      const moduleName = mapPlayerNameToModuleName(batsman.name);
      const runs = parseInt(batsman.runs) || 0;
      const balls = parseInt(batsman.balls) || 0;
      // ... store stats
    }
  }
}
```

#### 2. Bowling Performance
```typescript
function parseBowlingPerformance(scorecardData: any) {
  for (const innings of scorecardData) {
    if (!innings.bowler || !Array.isArray(innings.bowler)) continue;
    
    for (const bowler of innings.bowler) {
      const moduleName = mapPlayerNameToModuleName(bowler.name);
      const wickets = parseInt(bowler.wickets) || 0;
      const overs = parseFloat(bowler.overs) || 0;
      const runs = parseInt(bowler.runs) || 0;
      // ... store stats
    }
  }
}
```

#### 3. Fielding Performance
```typescript
function parseFieldingPerformance(scorecardData: any) {
  for (const innings of scorecardData) {
    if (!innings.batsman || !Array.isArray(innings.batsman)) continue;
    
    for (const batsman of innings.batsman) {
      const outDesc = batsman.outdec || '';
      
      // Extract catches: "c Tilak Varma b Varun Chakaravarthy"
      const catchMatch = outDesc.match(/c\s+([A-Za-z\s]+?)\s+b\s+/i);
      
      // Extract stumpings: "st Samson b Kuldeep Yadav"
      const stumpingMatch = outDesc.match(/st\s+([A-Za-z\s]+?)\s+b\s+/i);
      
      // Extract run outs: "run out (Rinku Singh)" or "run out (Rinku/Bumrah)"
      const runoutMatch = outDesc.match(/run\s+out\s+\(([^)]+)\)/i);
      // ... store stats
    }
  }
}
```

## Testing

### Test API Connection
```bash
cd backend
node test-cricket-api.js
```

**Expected Output:**
```
🏏 Testing Cricket API Connection
==================================
Match ID: 130179

📡 Fetching scorecard from Cricbuzz API...
✅ API Connection Successful!

📊 Response Summary:
===================
✓ Scorecard data received
✓ Number of innings: 2
✓ Number of batsmen: 11

📋 Sample Batsman Data:
   Name: Sahibzada Farhan
   Runs: 57
   Balls: 38
   Strike Rate: 150
   Dismissal: c Tilak Varma b Varun Chakaravarthy

✓ Number of bowlers: 6

🎯 Sample Bowler Data:
   Name: Shivam Dube
   Wickets: 0
   Overs: 3
   Runs Conceded: 23
   Economy: 7.7

✅ API integration is working correctly!
```

## Usage

### Fetch Real Scores
```bash
npm run scores:fetch-api -- <tournament-id> 130179
```

### Example
```bash
npm run scores:fetch-api -- 2c177359-eb3d-4c76-adc0-d6cb80a42a45 130179
```

This will:
1. Fetch scorecard from Cricbuzz API
2. Parse batting stats (runs, balls)
3. Parse bowling stats (wickets, overs, runs conceded)
4. Parse fielding stats (catches, stumpings, run outs)
5. Map player names to module names
6. Calculate fantasy points
7. Update database

## Player Name Mapping

Currently mapped players:
- Virat Kohli → `ViratKohli`
- Rohit Sharma → `RohitSharma`
- Hardik Pandya → `HardikPandya`
- Jasprit Bumrah → `JaspreetBumhrah`
- Shubhman Gill → `ShubhmanGill`
- Kane Williamson → `KaneWilliamson`
- Ben Stokes → `BenStokes`
- Glen Maxwell → `GlenMaxwell`
- Abhishek Sharma → `AbhishekSharma`
- Shubham Dube / Shivam Dube → `ShubhamDube`
- Travis Head → `TravisHead`
- MS Dhoni → `MSDhoni`
- Suryakumar Yadav → `SuryakumarYadav`

### Add More Players

Edit `/src/services/cricketApiService.ts`:

```typescript
const nameMap: { [key: string]: string } = {
  // ... existing mappings
  'newplayername': 'NewPlayerModule',
  'nplayer': 'NewPlayerModule',
};
```

## Dismissal Types Parsed

The API extracts fielding credits from dismissal descriptions:

### Catches
- Format: `"c Tilak Varma b Varun Chakaravarthy"`
- Regex: `/c\s+([A-Za-z\s]+?)\s+b\s+/i`
- Credits: Tilak Varma gets 1 catch

### Stumpings
- Format: `"st Samson b Kuldeep Yadav"`
- Regex: `/st\s+([A-Za-z\s]+?)\s+b\s+/i`
- Credits: Samson gets 1 stumping

### Run Outs
- Format: `"run out (Rinku Singh)"` or `"run out (Rinku/Bumrah)"`
- Regex: `/run\s+out\s+\(([^)]+)\)/i`
- Credits: Split between fielders if multiple

### LBW / Bowled
- Format: `"lbw b Kuldeep Yadav"` or `"b Bumrah"`
- No fielding credits (only bowling)

## Complete Workflow Example

### 1. Create Tournament
```bash
npm run tournament:create-sample
```

### 2. Get Tournament ID
```bash
npm run tournament:list
```

### 3. Fetch Real Scores
```bash
npm run scores:fetch-api -- <tournament-id> 130179
```

### 4. View Scores
```bash
npm run scores:get -- <tournament-id>
```

### 5. End Tournament with Rewards
```bash
npm run end:with-snapshot -- <tournament-id> --amount 100
```

### 6. View Rewards
```bash
curl http://localhost:3000/api/user-rewards/tournament/<tournament-id>
```

## Troubleshooting

### No Players Mapped
**Issue:** API returns data but no players are in database

**Solution:** Add player name mappings in `cricketApiService.ts`

### API Returns Empty Scorecard
**Issue:** `scorecard` array is empty

**Possible Causes:**
- Match hasn't started yet
- Match ID is incorrect
- Scorecard not yet available

**Solution:** Verify match ID on Cricbuzz website

### Rate Limit Exceeded
**Issue:** API returns 429 error

**Solution:** 
- Wait a few minutes
- Upgrade RapidAPI plan
- Use different API key

## Files Modified

1. **`/src/services/cricketApiService.ts`** - Main API service
   - Updated all parsing functions
   - Fixed field names
   - Changed object iteration to array iteration

2. **`/test-cricket-api.js`** - Test script
   - Updated to match new response format
   - Shows sample batsman and bowler data

3. **`/src/scripts/update-player-scores.ts`** - Already compatible
   - No changes needed
   - Works with updated service

## API Endpoint

```
GET https://cricbuzz-cricket.p.rapidapi.com/mcenter/v1/{matchId}/scard
Headers:
  x-rapidapi-key: your-key-here
  x-rapidapi-host: cricbuzz-cricket.p.rapidapi.com
```

## Next Steps

1. ✅ API connection tested and working
2. ✅ Parsing logic updated for actual format
3. ✅ Player name mapping configured
4. ⏭️ Test full workflow with real match
5. ⏭️ Add more player mappings as needed

---

**Status:** ✅ Ready to use with real cricket matches!

