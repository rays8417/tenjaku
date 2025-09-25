#!/usr/bin/env node

/**
 * Contract Sync Test Script
 * 
 * This script tests the new contract-first approach for syncing players and users
 * Run with: node test-contract-sync.js
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
const API_TIMEOUT = 15000;

// Test data
const TEST_TOURNAMENT = {
  name: "India vs Australia - Contract Sync Test",
  description: "Testing tournament with contract-synced data",
  matchDate: "2024-01-15T19:00:00Z",
  team1: "India",
  team2: "Australia", 
  venue: "Melbourne Cricket Ground",
  entryFee: 10.0,
  maxParticipants: 1000
};

// Storage for created IDs
const createdIds = {
  tournament: null,
  players: [],
  users: [],
  teams: [],
  snapshots: {}
};

// Helper function to make API calls
async function apiCall(method, endpoint, data = null) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: { 'Content-Type': 'application/json' },
      timeout: API_TIMEOUT
    };
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    return { success: true, data: response.data };
  } catch (error) {
    console.error(`❌ API Error ${method} ${endpoint}:`, error.response?.data || error.message);
    return { success: false, error: error.response?.data || error.message };
  }
}

// Test functions
async function testContractDiscovery() {
  console.log('\n🔍 Testing Contract Discovery...');
  
  const result = await apiCall('GET', '/api/admin/discover-contract-players');
  
  if (result.success) {
    console.log(`✅ Discovered ${result.data.players?.length || 0} players from contract`);
    if (result.data.players?.length > 0) {
      console.log('   Players found:', result.data.players.map(p => p.name).join(', '));
    }
  } else {
    console.log('❌ Contract discovery failed');
  }
  
  return result.success;
}

async function testContractSync() {
  console.log('\n🔄 Testing Contract Sync...');
  
  const result = await apiCall('POST', '/api/admin/sync-all-from-contract');
  
  if (result.success) {
    const summary = result.data.result?.summary;
    console.log('✅ Contract sync successful');
    console.log(`   Players synced: ${summary?.totalPlayersSynced || 0}`);
    console.log(`   Users synced: ${summary?.totalUsersSynced || 0}`);
    console.log(`   Total synced: ${summary?.totalSynced || 0}`);
    
    // Store synced player and user data
    if (result.data.result?.players?.players) {
      createdIds.players = result.data.result.players.players.map(p => ({
        id: p.id,
        name: p.name,
        moduleName: p.moduleName
      }));
    }
    
    if (result.data.result?.users?.users) {
      createdIds.users = result.data.result.users.users.map(u => ({
        id: u.id,
        walletAddress: u.walletAddress,
        displayName: u.displayName
      }));
    }
  } else {
    console.log('❌ Contract sync failed');
  }
  
  return result.success;
}

async function testVerifySyncedData() {
  console.log('\n✅ Testing Data Verification...');
  
  // Check players
  const playersResult = await apiCall('GET', '/api/admin/players');
  if (playersResult.success) {
    console.log(`✅ Found ${playersResult.data.players?.length || 0} players in database`);
  }
  
  // Check users
  const usersResult = await apiCall('GET', '/api/admin/users');
  if (usersResult.success) {
    console.log(`✅ Found ${usersResult.data.users?.length || 0} users in database`);
  }
  
  // Check Aptos holders
  const holdersResult = await apiCall('GET', '/api/snapshots/aptos-holders');
  if (holdersResult.success) {
    console.log(`✅ Found ${holdersResult.data.totalHolders || 0} token holders from Aptos`);
  }
  
  return playersResult.success && usersResult.success && holdersResult.success;
}

async function testTournamentCreation() {
  console.log('\n🏆 Testing Tournament Creation...');
  
  const result = await apiCall('POST', '/api/tournaments', TEST_TOURNAMENT);
  
  if (result.success) {
    console.log('✅ Tournament created successfully');
    createdIds.tournament = result.data.tournament?.id;
    console.log(`   Tournament ID: ${createdIds.tournament}`);
  } else {
    console.log('❌ Tournament creation failed');
  }
  
  return result.success;
}

async function testTeamCreation() {
  console.log('\n👨‍👩‍👧‍👦 Testing Team Creation...');
  
  if (createdIds.players.length < 2 || createdIds.users.length < 2) {
    console.log('⚠️  Not enough players or users for team creation');
    return false;
  }
  
  const teams = [
    {
      userId: createdIds.users[0].id,
      teamName: 'Contract Team Alpha',
      captainId: createdIds.players[0].id,
      viceCaptainId: createdIds.players[1]?.id || createdIds.players[0].id,
      players: createdIds.players.slice(0, 5).map(p => p.id)
    },
    {
      userId: createdIds.users[1]?.id || createdIds.users[0].id,
      teamName: 'Contract Team Beta',
      captainId: createdIds.players[1]?.id || createdIds.players[0].id,
      viceCaptainId: createdIds.players[0].id,
      players: createdIds.players.slice(0, 5).map(p => p.id)
    }
  ];
  
  let successCount = 0;
  
  for (const team of teams) {
    const result = await apiCall('POST', `/api/tournaments/${createdIds.tournament}/teams`, team);
    
    if (result.success) {
      console.log(`✅ Team "${team.teamName}" created successfully`);
      createdIds.teams.push(result.data.team?.id);
      successCount++;
    } else {
      console.log(`❌ Team "${team.teamName}" creation failed`);
    }
  }
  
  return successCount > 0;
}

async function testPreMatchSnapshot() {
  console.log('\n📸 Testing Pre-Match Snapshot...');
  
  const result = await apiCall('POST', '/api/snapshots/create', {
    tournamentId: createdIds.tournament,
    snapshotType: 'PRE_MATCH',
    useAptosData: true
  });
  
  if (result.success) {
    console.log('✅ Pre-match snapshot created successfully');
    createdIds.snapshots.preMatch = result.data.snapshot?.snapshotId;
    console.log(`   Snapshot ID: ${createdIds.snapshots.preMatch}`);
  } else {
    console.log('❌ Pre-match snapshot creation failed');
  }
  
  return result.success;
}

async function testPostMatchSnapshot() {
  console.log('\n📸 Testing Post-Match Snapshot...');
  
  const result = await apiCall('POST', '/api/snapshots/create', {
    tournamentId: createdIds.tournament,
    snapshotType: 'POST_MATCH',
    useAptosData: true
  });
  
  if (result.success) {
    console.log('✅ Post-match snapshot created successfully');
    createdIds.snapshots.postMatch = result.data.snapshot?.snapshotId;
    console.log(`   Snapshot ID: ${createdIds.snapshots.postMatch}`);
  } else {
    console.log('❌ Post-match snapshot creation failed');
  }
  
  return result.success;
}

async function testSnapshotComparison() {
  console.log('\n🔍 Testing Snapshot Comparison...');
  
  const result = await apiCall('POST', '/api/snapshots/compare-pre-post', {
    tournamentId: createdIds.tournament
  });
  
  if (result.success) {
    console.log('✅ Snapshot comparison successful');
    const comparison = result.data.comparison;
    console.log(`   Total users: ${comparison?.summary?.totalUsers || 0}`);
    console.log(`   Eligible users: ${comparison?.totalEligibleUsers || 0}`);
    console.log(`   Pre-match holdings: ${comparison?.summary?.preMatchHoldings || 0}`);
    console.log(`   Post-match holdings: ${comparison?.summary?.postMatchHoldings || 0}`);
  } else {
    console.log('❌ Snapshot comparison failed');
  }
  
  return result.success;
}

async function testPlayerScoring() {
  console.log('\n⚽ Testing Player Scoring...');
  
  const playerScores = [
    {
      moduleName: 'AbhishekSharma',
      runs: 85,
      ballsFaced: 65,
      wickets: 0,
      oversBowled: 0,
      runsConceded: 0,
      catches: 2,
      stumpings: 0,
      runOuts: 1
    },
    {
      moduleName: 'ViratKohli',
      runs: 42,
      ballsFaced: 38,
      wickets: 3,
      oversBowled: 4,
      runsConceded: 28,
      catches: 1,
      stumpings: 0,
      runOuts: 0
    },
    {
      moduleName: 'RohitSharma',
      runs: 120,
      ballsFaced: 95,
      wickets: 0,
      oversBowled: 0,
      runsConceded: 0,
      catches: 0,
      stumpings: 0,
      runOuts: 0
    },
    {
      moduleName: 'MSDhoni',
      runs: 15,
      ballsFaced: 12,
      wickets: 2,
      oversBowled: 3,
      runsConceded: 22,
      catches: 0,
      stumpings: 1,
      runOuts: 0
    }
  ];
  
  const result = await apiCall('POST', '/api/scoring/player-scores', {
    tournamentId: createdIds.tournament,
    playerScores: playerScores
  });
  
  if (result.success) {
    console.log('✅ Player scores updated successfully');
    console.log(`   Updated ${result.data.scores?.length || 0} player scores`);
  } else {
    console.log('❌ Player scoring failed');
  }
  
  return result.success;
}

async function testUserScoring() {
  console.log('\n🏆 Testing User Score Calculation...');
  
  const result = await apiCall('POST', '/api/scoring/calculate-user-scores', {
    tournamentId: createdIds.tournament
  });
  
  if (result.success) {
    console.log('✅ User scores calculated successfully');
    console.log(`   Total users: ${result.data.totalUsers || 0}`);
    console.log(`   Top scorer: ${result.data.userScores?.[0]?.walletAddress || 'N/A'}`);
    console.log(`   Top score: ${result.data.userScores?.[0]?.totalScore || 0}`);
  } else {
    console.log('❌ User score calculation failed');
  }
  
  return result.success;
}

async function testTournamentCompletion() {
  console.log('\n🏁 Testing Tournament Completion...');
  
  // Complete tournament
  const completeResult = await apiCall('PATCH', `/api/tournaments/${createdIds.tournament}`, {
    status: 'COMPLETED'
  });
  
  if (completeResult.success) {
    console.log('✅ Tournament completed successfully');
  } else {
    console.log('❌ Tournament completion failed');
  }
  
  return completeResult.success;
}

// Main test runner
async function runTests() {
  console.log('🚀 Starting Contract Sync Tests...\n');
  console.log('This test validates the new contract-first approach:');
  console.log('1. Discover players from Aptos contract');
  console.log('2. Sync players and users to database');
  console.log('3. Create tournament with synced data');
  console.log('4. Test snapshots with real contract data\n');
  
  const tests = [
    { name: 'Contract Discovery', fn: testContractDiscovery },
    { name: 'Contract Sync', fn: testContractSync },
    { name: 'Data Verification', fn: testVerifySyncedData },
    { name: 'Tournament Creation', fn: testTournamentCreation },
    { name: 'Team Creation', fn: testTeamCreation },
    { name: 'Pre-Match Snapshot', fn: testPreMatchSnapshot },
    { name: 'Player Scoring', fn: testPlayerScoring },
    { name: 'User Scoring', fn: testUserScoring },
    { name: 'Post-Match Snapshot', fn: testPostMatchSnapshot },
    { name: 'Snapshot Comparison', fn: testSnapshotComparison },
    { name: 'Tournament Completion', fn: testTournamentCompletion }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      const success = await test.fn();
      if (success !== false) passed++;
      else failed++;
      
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`❌ Test "${test.name}" crashed:`, error.message);
      failed++;
    }
  }
  
  console.log('\n📊 Test Results:');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  
  if (failed === 0) {
    console.log('\n🎉 All tests passed! Contract sync approach is working correctly.');
    console.log('\n📋 Summary:');
    console.log(`   Players synced: ${createdIds.players.length}`);
    console.log(`   Users synced: ${createdIds.users.length}`);
    console.log(`   Tournament created: ${createdIds.tournament ? 'Yes' : 'No'}`);
    console.log(`   Teams created: ${createdIds.teams.length}`);
    console.log(`   Snapshots created: ${Object.keys(createdIds.snapshots).length}`);
  } else {
    console.log('\n⚠️  Some tests failed. Check the logs above for details.');
    console.log('\n💡 Tips:');
    console.log('   - Ensure Aptos contract is deployed and accessible');
    console.log('   - Check your contract address configuration');
    console.log('   - Verify network connectivity to Aptos');
  }
}

// Check if axios is available
try {
  require.resolve('axios');
} catch (e) {
  console.error('❌ axios is not installed. Please run: npm install axios');
  process.exit(1);
}

// Run the tests
runTests().catch(console.error);
