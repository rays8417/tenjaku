const { testSingleModuleBalance, CONTRACT_CONFIG } = require('./src/services/aptosService.ts');

async function debugBalanceIssue() {
  console.log('=== BALANCE DEBUG TEST ===');
  console.log('Contract Config:', CONTRACT_CONFIG);
  
  try {
    // Test with AbhishekSharma module first (since we have the contract code for it)
    console.log('\n--- Testing AbhishekSharma module ---');
    await testSingleModuleBalance('AbhishekSharma');
    
    console.log('\n--- Testing ShubhamDube module (the one that failed) ---');
    await testSingleModuleBalance('ShubhamDube');
    
  } catch (error) {
    console.error('Debug test failed:', error);
  }
}

// Run the debug test
debugBalanceIssue().catch(console.error);
