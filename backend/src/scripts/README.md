# Tournament Management Script

This script provides a comprehensive tool for managing cricket fantasy tournaments in the database.

## Features

- Create tournaments with **ONGOING** status
- Create sample tournaments with realistic cricket match data
- Create custom tournaments through interactive prompts
- List existing tournaments
- Update tournament status
- Full error handling and validation

## Usage

### Prerequisites

Make sure you have:
- Node.js installed
- Database connection configured
- Prisma client generated (`npm run prisma:generate`)

### Running the Script

Navigate to the backend directory and run:

```bash
cd /Users/yashodeep/Desktop/backend/backend
npx ts-node src/scripts/tournament.ts [command]
```

### Using NPM Scripts (Recommended)

For convenience, you can use the predefined npm scripts:

```bash
# Create sample tournaments
npm run tournament:create-sample

# Create custom tournament
npm run tournament:create-custom

# List tournaments
npm run tournament:list

# End a tournament
npm run tournament:end <tournament-id>

# Cleanup tournaments (keep only one)
npm run tournament:cleanup [--keep <tournament-id>]

# End all ongoing tournaments and cleanup
npm run tournament:end-and-cleanup [--keep <tournament-id>]

# Update player scores
npm run tournament:update-scores <tournament-id> '<scores-json>'

# Update scores from file
npm run tournament:update-scores-file <file-path>

# Update sample scores
npm run tournament:update-sample-scores

# Show help
npm run tournament:help
```

### Available Commands

#### 1. Create Sample Tournaments
Creates 3 sample tournaments with ONGOING status:

```bash
npx ts-node src/scripts/tournament.ts create-sample
```

This will create:
- IPL 2024 - Mumbai Indians vs Chennai Super Kings
- T20 World Cup - India vs Australia  
- Test Series - England vs South Africa

#### 2. Create Custom Tournament
Interactive mode to create a custom tournament:

```bash
npx ts-node src/scripts/tournament.ts create-custom
```

You'll be prompted for:
- Tournament Name
- Description (optional)
- Team 1
- Team 2
- Venue (optional)
- Entry Fee (in APT tokens)
- Max Participants (optional)
- Match Date (YYYY-MM-DD HH:MM format)

#### 3. List Tournaments
View all existing tournaments:

```bash
npx ts-node src/scripts/tournament.ts list
```

#### 4. Update Tournament Status
Change the status of an existing tournament:

```bash
npx ts-node src/scripts/tournament.ts update-status <tournament-id> <status>
```

Valid statuses: `UPCOMING`, `ONGOING`, `COMPLETED`, `CANCELLED`

Example:
```bash
npx ts-node src/scripts/tournament.ts update-status abc123 ONGOING
```

#### 5. End Tournament
End a specific tournament by setting its status to COMPLETED:

```bash
npx ts-node src/scripts/tournament.ts end <tournament-id>
```

Example:
```bash
npx ts-node src/scripts/tournament.ts end abc123
```

#### 6. Cleanup Tournaments
Keep only one tournament and delete all others:

```bash
npx ts-node src/scripts/tournament.ts cleanup [--keep <tournament-id>]
```

- Without `--keep`: Keeps the most recent tournament
- With `--keep`: Keeps the specified tournament

Examples:
```bash
# Keep most recent tournament
npx ts-node src/scripts/tournament.ts cleanup

# Keep specific tournament
npx ts-node src/scripts/tournament.ts cleanup --keep abc123
```

#### 7. End and Cleanup
End all ongoing tournaments and keep only one tournament:

```bash
npx ts-node src/scripts/tournament.ts end-and-cleanup [--keep <tournament-id>]
```

This is a combination of ending all ongoing tournaments and then cleaning up to keep only one.

Example:
```bash
npx ts-node src/scripts/tournament.ts end-and-cleanup --keep abc123
```

#### 8. Update Player Scores
Update player scores for a tournament using JSON data:

```bash
npx ts-node src/scripts/tournament.ts update-scores <tournament-id> '<scores-json>'
```

Example:
```bash
npx ts-node src/scripts/tournament.ts update-scores abc123 '{"playerScores":[{"moduleName":"ViratKohli","runs":85,"ballsFaced":65,"wickets":0,"oversBowled":0,"runsConceded":0,"catches":2,"stumpings":0,"runOuts":1}]}'
```

#### 9. Update Scores from File
Update player scores from a JSON file:

```bash
npx ts-node src/scripts/tournament.ts update-scores-file <file-path>
```

Example:
```bash
npx ts-node src/scripts/tournament.ts update-scores-file ./scores.json
```

#### 10. Update Sample Scores
Update sample player scores for testing:

```bash
npx ts-node src/scripts/tournament.ts update-sample-scores
```

### Sample Output

When creating tournaments, you'll see output like:

```
🏏 Creating Sample Tournaments
==============================

Creating tournament: IPL 2024 - Mumbai Indians vs Chennai Super Kings
✅ Tournament created successfully!
   ID: 123e4567-e89b-12d3-a456-426614174000
   Name: IPL 2024 - Mumbai Indians vs Chennai Super Kings
   Status: ONGOING
   Teams: Mumbai Indians vs Chennai Super Kings
   Match Date: 2024-03-15T19:30:00.000Z
   Entry Fee: 5 APT
   Max Participants: 1000
```

## Tournament Data Structure

Each tournament includes:
- **Name**: Tournament title
- **Description**: Optional description
- **Match Date**: When the match occurs
- **Team 1 & Team 2**: Competing teams
- **Venue**: Match location (optional)
- **Status**: Tournament status (defaults to ONGOING)
- **Entry Fee**: Cost in APT tokens to participate
- **Max Participants**: Maximum number of participants (optional)

## Player Scores Data Structure

Player scores are updated using the following JSON format:

```json
{
  "tournamentId": "tournament-uuid",
  "playerScores": [
    {
      "moduleName": "PlayerName",
      "runs": 85,
      "ballsFaced": 65,
      "wickets": 0,
      "oversBowled": 0,
      "runsConceded": 0,
      "catches": 2,
      "stumpings": 0,
      "runOuts": 1
    }
  ]
}
```

### Fantasy Points Calculation

The script automatically calculates fantasy points based on:

**Batting Points:**
- 1 point per run
- +8 points for half-century (50+ runs)
- +16 points for century (100+ runs)
- +6 points for 200+ strike rate
- +4 points for 150+ strike rate

**Bowling Points:**
- 25 points per wicket
- +8 points for 3+ wickets
- +16 points for 5+ wickets
- +6 points for economy rate ≤ 4
- +4 points for economy rate ≤ 6

**Fielding Points:**
- 8 points per catch
- 12 points per stumping
- 12 points per run out

## Error Handling

The script includes comprehensive error handling:
- Database connection errors
- Invalid data validation
- Duplicate tournament prevention
- Graceful error messages with helpful suggestions

## Integration

The script can be imported and used in other parts of the application:

```typescript
import { createTournament, listTournaments } from './scripts/tournament';

// Create a tournament programmatically
const tournament = await createTournament({
  name: "Custom Tournament",
  matchDate: new Date(),
  team1: "Team A",
  team2: "Team B",
  status: TournamentStatus.ONGOING,
  entryFee: 5.0
});
```
