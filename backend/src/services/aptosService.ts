import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk';

// Aptos SDK configuration
const aptosConfig = new AptosConfig({
  network: Network.DEVNET, // Change to MAINNET for production
});

export const aptos = new Aptos(aptosConfig);



// Contract configuration - Update these with your actual contract details
export const CONTRACT_CONFIG = {
  // Update this with your actual contract address
  CONTRACT_ADDRESS: process.env.APTOS_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000',
  
  // Update these with your actual function names
  GET_TOKEN_HOLDERS_FUNCTION: 'get_token_holders',
  BALANCE_FUNCTION: 'balance',
  
  // Default module name (can be overridden per player)
  DEFAULT_MODULE_NAME: 'AbhishekSharma',
};

export interface TokenHolder {
  address: string;
  balance: string;
}

export interface TokenHolderBalance {
  address: string;
  balance: bigint;
  formattedBalance: string;
  playerId?: string; // Track which player this balance belongs to
  moduleName?: string; // Track which module this came from
}

/**
 * Get all token holders from the smart contract
 * This calls the get_token_holders function in your contract
 */
export async function getTokenHolders(moduleName: string): Promise<string[]> {
  try {
    console.log(`Fetching token holders from ${moduleName} module...`);
    
    const payload = {
      function: `${CONTRACT_CONFIG.CONTRACT_ADDRESS}::${moduleName}::${CONTRACT_CONFIG.GET_TOKEN_HOLDERS_FUNCTION}` as const,
      arguments: [], // Add any required arguments here
      type_arguments: [],
    };

    const response = await aptos.view({
      payload,
    });

    // The response format depends on your contract's return type
    // Assuming it returns an array of addresses
    const holders = response[0] as string[];
    
    console.log(`Found ${holders.length} token holders in ${moduleName} module`);
    return holders;
  } catch (error) {
    console.error(`Error fetching token holders from ${moduleName}:`, error);
    throw new Error(`Failed to fetch token holders from ${moduleName}: ${error}`);
  }
}

/**
 * Get balance for a specific address from a specific player module
 * This calls the balance function in your contract
 */
export async function getTokenBalance(address: string, moduleName: string): Promise<bigint> {
  try {
    const payload = {
      function: `${CONTRACT_CONFIG.CONTRACT_ADDRESS}::${moduleName}::${CONTRACT_CONFIG.BALANCE_FUNCTION}` as const,
      arguments: [address],
      type_arguments: [],
    };

    const response = await aptos.view({
      payload,
    });

    // Assuming the balance is returned as a string or number
    const balance = response[0];
    
    if (balance === null || balance === undefined) {
      return BigInt(0);
    }
    
    // Convert to bigint for consistency
    if (typeof balance === 'string') {
      return BigInt(balance);
    } else if (typeof balance === 'number') {
      return BigInt(balance);
    } else {
      return BigInt(balance.toString());
    }
  } catch (error) {
    console.error(`Error fetching balance for ${address} from ${moduleName}:`, error);
    // Return 0 balance for addresses that might not be in the system
    return BigInt(0);
  }
}

/**
 * Get balances for a specific player module
 */
export async function getTokenHoldersWithBalancesForPlayer(moduleName: string, playerId?: string): Promise<TokenHolderBalance[]> {
  try {
    console.log(`Starting snapshot process for ${moduleName} module...`);
    
    // Step 1: Get all token holders for this player module
    const holders = await getTokenHolders(moduleName);
    
    if (holders.length === 0) {
      console.log(`No token holders found for ${moduleName}`);
      return [];
    }

    console.log(`Fetching balances for ${holders.length} holders in ${moduleName}...`);
    
    // Step 2: Get balances for each holder
    const balancePromises = holders.map(async (address) => {
      try {
        const balance = await getTokenBalance(address, moduleName);
        return {
          address,
          balance,
          formattedBalance: balance.toString(),
          playerId,
          moduleName,
        } as TokenHolderBalance;
      } catch (error) {
        console.error(`Failed to get balance for ${address} in ${moduleName}:`, error);
        return {
          address,
          balance: BigInt(0),
          formattedBalance: '0',
          playerId,
          moduleName,
        } as TokenHolderBalance;
      }
    });

    const results = await Promise.allSettled(balancePromises);
    
    // Filter out failed requests and zero balances
    const validHolders = results
      .filter((result): result is PromiseFulfilledResult<TokenHolderBalance> => 
        result.status === 'fulfilled'
      )
      .map(result => result.value)
      .filter(holder => holder.balance > 0); // Only include holders with actual balance

    console.log(`Successfully processed ${validHolders.length} token holders for ${moduleName}`);
    
    return validHolders;
  } catch (error) {
    console.error(`Error in getTokenHoldersWithBalancesForPlayer for ${moduleName}:`, error);
    throw new Error(`Failed to get token holders with balances for ${moduleName}: ${error}`);
  }
}

/**
 * Get balances for all player modules
 * This fetches data from all player modules and combines them
 */
export async function getTokenHoldersWithBalances(): Promise<TokenHolderBalance[]> {
  try {
    console.log('Starting snapshot process for all player modules...');
    
    // Hardcoded list of player module names
    const players = [
      { id: '1', name: 'AbhishekSharma', moduleName: 'AbhishekSharma' },
      { id: '2', name: 'BenStokes', moduleName: 'BenStokes' },
      { id: '3', name: 'Boson', moduleName: 'Boson' },
      { id: '4', name: 'GlenMaxwell', moduleName: 'GlenMaxwell' },
      { id: '5', name: 'HardikPandya', moduleName: 'HardikPandya' },
      { id: '6', name: 'JaspreetBumhrah', moduleName: 'JaspreetBumhrah' },
      { id: '7', name: 'KaneWilliamson', moduleName: 'KaneWilliamson' },
      { id: '8', name: 'ShubhamDube', moduleName: 'ShubhamDube' },
      { id: '9', name: 'ShubhmanGill', moduleName: 'ShubhmanGill' },
      { id: '10', name: 'ViratKohli', moduleName: 'ViratKohli' }
    ];

    console.log("players-----------", players)
    
    if (players.length === 0) {
      console.log('No players with Aptos modules found');
      return [];
    }

    console.log(`Processing ${players.length} player modules...`);
    
    // Fetch data from all player modules in parallel
    const playerPromises = players.map(async (player) => {
      try {
        return await getTokenHoldersWithBalancesForPlayer(player.moduleName, player.id);
      } catch (error) {
        console.error(`Failed to fetch data for player ${player.name} (${player.moduleName}):`, error);
        return [];
      }
    });

    const results = await Promise.allSettled(playerPromises);
    
    // Combine all results
    const allHolders = results
      .filter((result): result is PromiseFulfilledResult<TokenHolderBalance[]> => 
        result.status === 'fulfilled'
      )
      .flatMap(result => result.value);

    console.log(`Successfully processed ${allHolders.length} total token holders across all modules`);
    
    return allHolders;
  } catch (error) {
    console.error('Error in getTokenHoldersWithBalances:', error);
    throw new Error(`Failed to get token holders with balances: ${error}`);
  }
}

/**
 * Get all players with their Aptos module names from database
 */
export async function getPlayersWithModules() {
  try {
    // Import PrismaClient here to avoid circular dependency
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    const players = await prisma.player.findMany({
      where: {
        aptosTokenAddress: {
          not: null
        }
      },
      select: {
        id: true,
        name: true,
        aptosTokenAddress: true
      }
    });

    // Map aptosTokenAddress to module name
    // Assuming aptosTokenAddress contains the module name or can be derived from it
    const playersWithModules = players.map(player => ({
      id: player.id,
      name: player.name,
      moduleName: player.aptosTokenAddress || player.name.replace(/\s+/g, '') // Fallback to player name
    }));

    await prisma.$disconnect();
    return playersWithModules;
  } catch (error) {
    console.error('Error fetching players with modules:', error);
    throw new Error(`Failed to get players with modules: ${error}`);
  }
}

/**
 * Get current block number for snapshot reference
 */
export async function getCurrentBlockNumber(): Promise<bigint> {
  try {
    const ledgerInfo = await aptos.getLedgerInfo();
    return BigInt(ledgerInfo.block_height);
  } catch (error) {
    console.error('Error fetching block number:', error);
    throw new Error(`Failed to get current block number: ${error}`);
  }
}
