## Tenjaku: Cricket Fan Score Predictions

A decentralized cricket prediction platform that lets fans hold player cards, join tournaments, and earn rewards based on real-world performance. Tenjaku runs on the Aptos blockchain.

### Highlights
- **Decentralized & trustless**: Built on Aptos for transparent, secure, low-fee transactions.
- **Boson platform token**: Utility token pegged to $1 for swaps, entries, payouts.
- **Player Cards via AMM**: Swap Boson for player cards using on-chain AMM pools.
- **Telegram-first UX**: Onboard, manage cards, and get notifications from the Telegram bot.
- **Automated tournaments**: Snapshot holdings pre/post tournament, calculate scores, distribute rewards.
- **Composable markets**: Predict across upcoming sports; propose your own markets.

---

## How It Works
1. **Onboard**: Start with the Tenjaku.fun to connect your Aptos wallet and set up your account.
2. **Get Boson**:
   - Testnet: Use the faucet to mint Boson.
   - Mainnet (later): Swap APT for Boson.
3. **Swap for Player Cards**: Use AMM pools to swap Boson for supported player cards.
4. **Enter a tournament**: Pick an upcoming cricket tournament from the list.
5. **Hold through the event**: Snapshots are taken before and after the tournament; your holdings during this window count.
6. **Payouts**: Rewards are distributed from the tournament pool based on player performance and your relative holdings.

---


## Scoring System
Total user score for a tournament is the sum of scores contributed by each held player card across snapshots.

### Player Points
- **Batting**
  - Points: Runs + Staying bonus
  - Formula: `R + (BF / 2)` where `BF` is balls faced
- **Bowling**
  - Points: Wickets + Balls bowled + Economy bonus
  - Formula: `(W × 25) + (BB / 2) + EB` where `BB` is balls bowled
- **Fielding**
  - Points: Catches + Stumpings + Run Outs
  - Formula: `(C × 8) + (S × 10) + (RO × 6)`

### Economy Bonus (Bowling)
- < 4 runs/over: +6 points
- 4–6 runs/over: +4 points
- 6–8 runs/over: +2 points

### Multipliers
- By default, points are 1×. Multipliers can be configured per player role or program rules if needed.

> Note: Back-end parsers and example workflows are documented in `backend/UPDATED_API_FORMAT.md`.

---

## Platform Overview
- **Faucet**: Get testnet Boson.
- **Swap**: Trade Boson for player cards via AMM pools.
- **Tournaments**: Join upcoming events; holdings are snapshotted.
- **Rewards**: Automated calculation and distribution based on snapshots and scores.
- **Leaderboards**: Compare performance across users.

### Supported Player Cards (initial)
- Glenn Maxwell
- Kane Williamson
- Travis Head
- Ben Stokes
- Virat Kohli
- Hardik Pandya
- Shubman Gill
- Abhishek Sharma
- Shivam Dube
- Suryakumar Yadav
- Jasprit Bumrah

---

## Technical Overview

### Blockchain
- **Aptos**: High throughput, low fees, Move-based smart contracts.
- **Smart contracts**: AMM pools, Boson token, and player cards are implemented as Move modules in `contract/`.

### Backend
- **Node/Express + Prisma + PostgreSQL**
- Responsibilities: tournament lifecycle, snapshots, scoring, rewards, leaderboards, and APIs consumed by interfaces and the Telegram bot.


### Frontend
- **Next.js** in `tenjaku-interface/` for user dashboards: swaps, tournaments, leaderboards, and my teams/cards.

---

## Repository Structure
```
higgsfield/
  backend/                 # API server, scoring, rewards, scripts, Prisma
  contract/                # Move modules (Boson, AMM, player cards, router)
  tenjaku-interface/       # Next.js web app (swaps, tournaments, leaderboards)
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Aptos CLI (for contract workflows) and a wallet (e.g., Petra)

### 1) Backend setup
```bash
cd backend
npm install

# configure environment
cp .env.example .env  # if present; otherwise create using the template below

# generate Prisma client and migrate DB
npm run prisma:generate
npm run prisma:migrate

# start API (default PORT=3000)
npm run dev
```

Environment variables (create `backend/.env`):
```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/tenjaku"

# Server
PORT=3000

# Aptos
APTOS_CONTRACT_ADDRESS=0xYOUR_CONTRACT_ADDRESS

# Optional: ignore these holder addresses when aggregating snapshots (comma-separated)
IGNORED_HOLDER_ADDRESSES=0x111...,0x222...
```

API base URL: `http://localhost:3000/api`

Handy backend scripts:
```bash
# list sample tournaments
npm run tournament:list

# create sample tournament
npm run tournament:create-sample

# fetch real scores via Cricbuzz (see UPDATED_API_FORMAT.md)
npm run scores:fetch-api -- <tournament-id> <match-id>

# end tournament with snapshot + rewards
npm run end:with-snapshot -- <tournament-id> --amount 100
```

### 2) Frontend setup (Next.js)
```bash
cd tenjaku-interface
npm install

# run dev on a port that does not clash with the backend (e.g., 3001)
PORT=3001 npm run dev

# then open http://localhost:3001
```

Configure the frontend to point to the backend API (via Next env or config) as needed, e.g. `NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api`.

---

## Contracts
- Location: `contract/`
- Tooling: Aptos CLI and Move.
- You can build, test, and publish modules following standard Aptos workflows. Ensure the address in `Move.toml` matches `APTOS_CONTRACT_ADDRESS` used by the backend.


---

## Roadmap
- Mainnet Boson–APT swap
- Expanded player card roster and leagues
- Advanced analytics and live feeds
- Deeper Telegram automation and notifications
- Governance for market creation and curation

