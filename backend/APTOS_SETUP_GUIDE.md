# Aptos Integration Setup Guide

This guide explains how to configure and use the Aptos TypeScript SDK integration for snapshot functionality.

## Overview

The snapshot system now integrates with your Aptos smart contract to:
1. Get all token holders using `get_token_holders()` function
2. Get individual balances using `balance(address)` function
3. Map Aptos data to your database users
4. Create comprehensive snapshots with both Aptos and database data

## Configuration

### 1. Environment Variables

Add these environment variables to your `.env` file:

```env
# Aptos Configuration
APTOS_NETWORK="testnet"  # Options: testnet, mainnet, devnet
APTOS_CONTRACT_ADDRESS="0x0000000000000000000000000000000000000000"  # Replace with your contract address
APTOS_MODULE_NAME="your_module_name"  # Replace with your module name
APTOS_GET_TOKEN_HOLDERS_FUNCTION="get_token_holders"  # Replace with your function name
APTOS_BALANCE_FUNCTION="balance"  # Replace with your function name
```

### 2. Update Contract Configuration

In `src/services/aptosService.ts`, update the `CONTRACT_CONFIG` object:

```typescript
export const CONTRACT_CONFIG = {
  CONTRACT_ADDRESS: process.env.APTOS_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000',
  GET_TOKEN_HOLDERS_FUNCTION: 'get_token_holders', // Your function name
  BALANCE_FUNCTION: 'balance', // Your function name
  MODULE_NAME: 'your_module_name', // Your module name
};
```

## Smart Contract Requirements

Each player has their own module in your smart contract. Each module must have these two functions:

### 1. `get_token_holders()` (per player module)
```move
public fun get_token_holders(): vector<address> {
    // Return all addresses that hold this player's tokens
}
```

### 2. `balance(address: address): u64` (per player module)
```move
public fun balance(owner: address): u64 {
    // Return the token balance for the given address for this player
}
```

### Module Structure
- Each player has their own module (e.g., `AbhishekSharma`, `ViratKohli`, etc.)
- The module name should match the `aptosTokenAddress` field in your Player database records
- All modules are deployed under the same contract address

## API Endpoints

### 1. Create Snapshot with Aptos Data
```http
POST /api/snapshots/create
Content-Type: application/json

{
  "tournamentId": "tournament-uuid",
  "snapshotType": "PRE_MATCH", // or "POST_MATCH"
  "contractAddress": "0x...", // Optional, uses env var if not provided
  "useAptosData": true // Default: true
}
```

### 2. Get Current Aptos Token Holders (All Modules)
```http
GET /api/snapshots/aptos-holders
```

Response:
```json
{
  "success": true,
  "holders": [
    {
      "address": "0x123...",
      "balance": "1000000",
      "balanceBigInt": "1000000",
      "playerId": "player-uuid",
      "moduleName": "AbhishekSharma"
    }
  ],
  "totalHolders": 5,
  "totalTokens": "5000000"
}
```

### 3. Get Aptos Token Holders for Specific Player Module
```http
GET /api/snapshots/aptos-holders/AbhishekSharma
```

Response:
```json
{
  "success": true,
  "moduleName": "AbhishekSharma",
  "holders": [
    {
      "address": "0x123...",
      "balance": "1000000",
      "balanceBigInt": "1000000",
      "playerId": "player-uuid"
    }
  ],
  "totalHolders": 2,
  "totalTokens": "2000000"
}
```

### 4. Compare Aptos Data with Database
```http
POST /api/snapshots/compare-aptos
```

Response:
```json
{
  "success": true,
  "comparison": {
    "summary": {
      "totalAptosHolders": 5,
      "aptosOnlyHolders": 1,
      "databaseOnlyHolders": 2,
      "matchingHolders": 4,
      "discrepancies": 0
    },
    "details": {
      "aptosOnlyHolders": [...],
      "databaseOnlyHolders": [...],
      "matchingHolders": [...],
      "discrepancies": [...]
    }
  }
}
```

### 5. Sync Aptos Holders to Database
```http
POST /api/snapshots/sync-aptos
Content-Type: application/json

{
  "createMissingUsers": true // Optional, default: false
}
```

## How It Works

### 1. Snapshot Creation Process

When you create a snapshot with `useAptosData: true`:

1. **Fetch Aptos Data**: Calls `get_token_holders()` to get all shareholder addresses
2. **Get Balances**: For each address, calls `balance(address)` to get token amounts
3. **Map to Database**: Finds matching users in your database by wallet address
4. **Combine Data**: Merges Aptos contract data with database holdings
5. **Store Snapshot**: Saves comprehensive snapshot with both data sources

### 2. Data Mapping

- **Aptos Holders**: Raw token holders from your smart contract
- **Database Users**: Users registered in your system with wallet addresses
- **Mapped Data**: Aptos holders that match database users (by wallet address)
- **External Holders**: Aptos holders not in your database (logged but not included in snapshots)

### 3. Snapshot Data Structure

```json
{
  "tournamentId": "uuid",
  "snapshotType": "PRE_MATCH",
  "timestamp": "2024-01-01T00:00:00Z",
  "blockNumber": "123456789",
  "contractAddress": "0x...",
  "totalUsers": 10,
  "totalHoldings": 25,
  "aptosHolders": 5,
  "databaseHoldings": 20,
  "mergedHoldings": 15,
  "aptosData": {
    "holders": [...],
    "mappedHoldings": [...]
  },
  "databaseData": {
    "holdings": [...]
  },
  "allHoldings": [...]
}
```

## Error Handling

The system handles various error scenarios:

1. **Contract Connection Issues**: Falls back to database-only snapshots
2. **Missing Users**: Logs Aptos holders not in database
3. **Balance Fetch Failures**: Returns 0 balance for failed requests
4. **Network Issues**: Graceful degradation with detailed error messages

## Testing

### 1. Test Aptos Connection
```bash
curl -X GET http://localhost:3000/api/snapshots/aptos-holders
```

### 2. Test Data Comparison
```bash
curl -X POST http://localhost:3000/api/snapshots/compare-aptos
```

### 3. Test Snapshot Creation
```bash
curl -X POST http://localhost:3000/api/snapshots/create \
  -H "Content-Type: application/json" \
  -d '{
    "tournamentId": "your-tournament-id",
    "snapshotType": "PRE_MATCH",
    "useAptosData": true
  }'
```

## Troubleshooting

### Common Issues

1. **"Failed to fetch token holders"**
   - Check contract address and function names
   - Verify network connection
   - Ensure contract is deployed and accessible

2. **"No matching users found"**
   - Run sync endpoint to create missing users
   - Check wallet address format consistency

3. **"Balance fetch failed"**
   - Verify balance function signature
   - Check if address exists in contract
   - Review contract permissions

### Debug Mode

Enable detailed logging by setting:
```env
NODE_ENV=development
```

This will show detailed logs of:
- Aptos API calls
- Data mapping process
- Error details
- Performance metrics

## Next Steps

1. **Update Environment Variables**: Set your actual contract details
2. **Test Connection**: Use the test endpoints to verify integration
3. **Create Snapshots**: Start creating snapshots with Aptos data
4. **Monitor Sync**: Use comparison endpoints to ensure data consistency
5. **Production Setup**: Switch to mainnet when ready
