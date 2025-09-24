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
  
  // Module name in your contract
  MODULE_NAME: 'AbhishekSharma', // Update this
};

export interface TokenHolder {
  address: string;
  balance: string;
}

export interface TokenHolderBalance {
  address: string;
  balance: bigint;
  formattedBalance: string;
}

/**
 * Get all token holders from the smart contract
 * This calls the get_token_holders function in your contract
 */
export async function getTokenHolders(): Promise<string[]> {
  try {
    console.log('Fetching token holders from contract...');

    const modules = await aptos.getAccountModules({ accountAddress: "0xfc2dd980078982103eac1f58488e7af24afbc29986fab1dfdaa2799326ec309f" });

    console.log(" modules", modules);
    
    const payload = {
      function: `${CONTRACT_CONFIG.CONTRACT_ADDRESS}::${CONTRACT_CONFIG.MODULE_NAME}::${CONTRACT_CONFIG.GET_TOKEN_HOLDERS_FUNCTION}` as const,
      arguments: [], // Add any required arguments here
    };

    const response = await aptos.view({
      payload,
    });

    // The response format depends on your contract's return type
    // Assuming it returns an array of addresses
    const holders = response[0] as string[];
    
    console.log(`Found ${holders.length} token holders`);
    return holders;
  } catch (error) {
    console.error('Error fetching token holders:', error);
    throw new Error(`Failed to fetch token holders: ${error}`);
  }
}

/**
 * Get balance for a specific address
 * This calls the balance function in your contract
 */
export async function getTokenBalance(address: string): Promise<bigint> {
  try {
    const payload = {
      function: `${CONTRACT_CONFIG.CONTRACT_ADDRESS}::${CONTRACT_CONFIG.MODULE_NAME}::${CONTRACT_CONFIG.BALANCE_FUNCTION}` as const,
      arguments: [address],
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
    console.error(`Error fetching balance for ${address}:`, error);
    // Return 0 balance for addresses that might not be in the system
    return BigInt(0);
  }
}

/**
 * Get balances for multiple addresses
 * This efficiently fetches balances for all token holders
 */
export async function getTokenHoldersWithBalances(): Promise<TokenHolderBalance[]> {
  try {
    console.log('Starting snapshot process...');
    
    // Step 1: Get all token holders
    const holders = await getTokenHolders();
    
    if (holders.length === 0) {
      console.log('No token holders found');
      return [];
    }

    console.log(`Fetching balances for ${holders.length} holders...`);
    
    // Step 2: Get balances for each holder
    // Using Promise.allSettled to handle individual failures gracefully
    const balancePromises = holders.map(async (address) => {
      try {
        const balance = await getTokenBalance(address);
        return {
          address,
          balance,
          formattedBalance: balance.toString(),
        } as TokenHolderBalance;
      } catch (error) {
        console.error(`Failed to get balance for ${address}:`, error);
        return {
          address,
          balance: BigInt(0),
          formattedBalance: '0',
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

    console.log(`Successfully processed ${validHolders.length} token holders with balances`);
    
    return validHolders;
  } catch (error) {
    console.error('Error in getTokenHoldersWithBalances:', error);
    throw new Error(`Failed to get token holders with balances: ${error}`);
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
