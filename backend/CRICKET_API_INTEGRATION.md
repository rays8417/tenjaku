# Cricket API Integration Guide

This guide explains how to use the real Cricket API (Cricbuzz) to fetch and update player scores automatically.

## Setup

### 1. Environment Variables

Add your RapidAPI key to `.env`:

```env
```

Or use the default key hardcoded in the service (already included).

### 2. Install Dependencies

```bash
npm install axios
```

## Usage

### Fetch Scores from Cricket API

Use the new command to fetch real scores from Cricbuzz and update your tournament:

```bash
npm run scores:fetch-api -- <tournament-id> <match-id>
```

**Example:**
```bash
npm run scores:fetch-api -- 2c177359-eb3d-4c76-adc0-d6cb80a42a45 130179
```

This will:
1. 🏏 Fetch the scorecard from Cricbuzz API for match ID `130179`
2. 📊 Parse batting, bowling, and fielding statistics
3. 🎯 Map player names to your smart contract module names
4. 💾 Calculate fantasy points using your scoring formula
5. ✅ Update the database with all player scores

### Find Match IDs

To find Cricbuzz match IDs:

1. Go to [Cricbuzz](https://www.cricbuzz.com/)
2. Find the match you want
3. Look at the URL: `https://www.cricbuzz.com/live-cricket-scores/12345/match-name`
4. The match ID is `12345`

Or use the RapidAPI Cricbuzz endpoints to search for matches.

## Player Name Mapping

The service automatically maps Cricbuzz player names to your module names:

| Cricbuzz Name | Module Name |
|---------------|-------------|
| Virat Kohli | ViratKohli |
| Rohit Sharma | RohitSharma |
| Hardik Pandya | HardikPandya |
| Jasprit Bumrah | JaspreetBumhrah |
| Shubhman Gill | ShubhmanGill |
| Kane Williamson | KaneWilliamson |
| Ben Stokes | BenStokes |
| Glen Maxwell | GlenMaxwell |
| Abhishek Sharma | AbhishekSharma |
| Shubham Dube | ShubhamDube |
| Travis Head | TravisHead |
| MS Dhoni | MSDhoni |

### Add More Players

Edit `/src/services/cricketApiService.ts` and add to the `nameMap` object:

```typescript
const nameMap: { [key: string]: string } = {
  // ... existing mappings
  'newplayername': 'NewPlayerModule',
  'nplayer': 'NewPlayerModule',
};
```

## API Response Structure

The Cricbuzz API returns scorecard data in this format:

```json
{
  "scoreCard": [
    {
      "batTeamDetails": {
        "batsmenData": {
          "123": {
            "batName": "Virat Kohli",
            "runs": 82,
            "balls": 53,
            "outDesc": "c Smith b Johnson"
          }
        }
      },
      "bowlTeamDetails": {
        "bowlersData": {
          "456": {
            "bowlName": "Jasprit Bumrah",
            "wickets": 3,
            "overs": 4,
            "runs": 28
          }
        }
      }
    }
  ]
}
```

## Parsed Output

The service converts this to your format:

```typescript
{
  moduleName: "ViratKohli",
  runs: 82,
  ballsFaced: 53,
  wickets: 0,
  oversBowled: 0,
  runsConceded: 0,
  catches: 1,  // Extracted from dismissal info
  stumpings: 0,
  runOuts: 0,
  fantasyPoints: 90.5  // Auto-calculated
}
```

## Fantasy Points Calculation

Fantasy points are automatically calculated using your formula:

### Batting
- 1 point per run
- +8 for 50+ runs
- +16 for 100+ runs
- +4 for 150+ strike rate
- +6 for 200+ strike rate

### Bowling
- 25 points per wicket
- +8 for 3+ wickets
- +16 for 5+ wickets
- +4 for economy ≤ 6
- +6 for economy ≤ 4

### Fielding
- 8 points per catch
- 12 points per stumping
- 12 points per run out

## Complete Workflow Example

### 1. Create Tournament with matchId

```typescript
const tournament = {
  name: "India vs Pakistan - Asia Cup 2025",
  matchDate: new Date(1759069800000),
  team1: "India",
  team2: "Pakistan",
  matchId: 130179,  // 👈 Include match ID
  // ... other fields
};
```

### 2. Fetch Real Scores

```bash
npm run scores:fetch-api -- <tournament-id> 130179
```

### 3. Create Post-Match Snapshot

```bash
npm run end:snapshot-only -- <tournament-id>
```

### 4. Calculate Rewards

```bash
npm run end:calculate-rewards -- <tournament-id> --amount 100
```

### 5. End Tournament

```bash
npm run end:end-only -- <tournament-id>
```

Or do steps 3-5 in one command:

```bash
npm run end:with-snapshot -- <tournament-id> --amount 100
```

## Troubleshooting

### No Players Found

If no players are parsed, it means:
1. Player names in Cricbuzz don't match your mapping
2. Match scorecard is not yet available
3. Match ID is incorrect

**Solution:** Add player name mappings or check match status.

### API Rate Limits

RapidAPI has rate limits. If you hit them:
1. Wait a few minutes
2. Upgrade your RapidAPI plan
3. Use a different API key

### Invalid Match ID

**Error:** `Failed to fetch scorecard for match 130179`

**Solution:** Verify the match ID on Cricbuzz website.

## Testing

### Test with Sample Match

```bash
# Use match ID 130179 (from your sample)
npm run scores:fetch-api -- <your-tournament-id> 130179
```

### View Updated Scores

```bash
npm run scores:get -- <tournament-id>
```

## API Endpoints

The Cricket API service uses these RapidAPI endpoints:

- **Get Scorecard:** `GET /mcenter/v1/{matchId}/scard`
- **Host:** `cricbuzz-cricket.p.rapidapi.com`
- **Required Header:** `x-rapidapi-key`

## Code Structure

```
backend/src/
├── services/
│   └── cricketApiService.ts      # API integration
├── scripts/
│   └── update-player-scores.ts   # CLI commands
```

### Key Functions

1. **`fetchMatchScorecard(matchId)`** - Fetch raw data from API
2. **`parseScorecard(matchId)`** - Parse and convert to your format
3. **`mapPlayerNameToModuleName(name)`** - Map names to modules

## Future Enhancements

Possible improvements:

1. **Auto-sync:** Automatically fetch scores when match ends
2. **Live updates:** Fetch scores during live matches
3. **More stats:** Add more fielding stats when API provides them
4. **Bulk import:** Import multiple matches at once
5. **Player discovery:** Auto-detect available players from API

## Support

For issues with:
- **API Integration:** Check `/src/services/cricketApiService.ts`
- **Name Mapping:** Add players to `nameMap` object
- **Fantasy Points:** Update calculation in `/src/scripts/update-player-scores.ts`

---

**Happy Cricket Fantasy Gaming! 🏏**

