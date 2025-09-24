#!/usr/bin/env node

/**
 * Cricket Fantasy Backend Test Script
 * Tests all major functionalities of the fantasy cricket platform
 * Run with: npm run test:integration
 */

import { PrismaClient } from '@prisma/client';
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000/api';
const prisma = new PrismaClient();

// Test data
const testData = {
  users: [],
  tournaments: [],
  players: [],
  teams: [],
  rewardPools: []
};

// Utility functions
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const makeRequest = async (endpoint, method = 'GET', body = null) => {
  const url = `${BASE_URL}${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, options);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${data.error || 'Unknown error'}`);
    }
    
    return data;
  } catch (error) {
    console.error(`❌ Request failed for ${method} ${endpoint}:`, error.message);
    throw error;
  }
};

// Test functions
const testHealthCheck = async () => {
  console.log('\n🏥 Testing Health Check...');
  try {
    const response = await fetch('http://localhost:3000/health');
    const data = await response.json();
    console.log('✅ Health check passed:', data.status);
    return true;
  } catch (error) {
    console.log('❌ Health check failed:', error.message);
    return false;
  }
};

const testUserManagement = async () => {
  console.log('\n👤 Testing User Management...');
  
  try {
    // Test user login/registration
    const userData = {
      walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
      displayName: 'Test User',
      avatar: 'https://example.com/avatar.jpg'
    };
    
    const loginResult = await makeRequest('/users/login', 'POST', userData);
    testData.users.push(loginResult.user);
    console.log('✅ User login/registration successful');
    
    // Test user profile
    const profileResult = await makeRequest(`/users/profile/${userData.walletAddress}`);
    console.log('✅ User profile fetch successful');
    
    // Test user stats
    const statsResult = await makeRequest(`/users/stats/${userData.walletAddress}`);
    console.log('✅ User stats fetch successful');
    
    return true;
  } catch (error) {
    console.log('❌ User management test failed:', error.message);
    return false;
  }
};

const testTournamentManagement = async () => {
  console.log('\n🏆 Testing Tournament Management...');
  
  try {
    // Create tournament
    const tournamentData = {
      name: 'Test Cricket Match',
      description: 'A test cricket match for testing purposes',
      matchDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
      team1: 'Team A',
      team2: 'Team B',
      venue: 'Test Stadium',
      entryFee: 10,
      maxParticipants: 100
    };
    
    const createResult = await makeRequest('/admin/tournaments', 'POST', tournamentData);
    testData.tournaments.push(createResult.tournament);
    console.log('✅ Tournament creation successful');
    
    // Get all tournaments
    const tournamentsResult = await makeRequest('/tournaments');
    console.log('✅ Tournament listing successful');
    
    // Get tournament details
    const detailsResult = await makeRequest(`/tournaments/${testData.tournaments[0].id}`);
    console.log('✅ Tournament details fetch successful');
    
    return true;
  } catch (error) {
    console.log('❌ Tournament management test failed:', error.message);
    return false;
  }
};

const testPlayerManagement = async () => {
  console.log('\n⚾ Testing Player Management...');
  
  try {
    const players = [
      { name: 'Virat Kohli', team: 'Team A', role: 'BATSMAN', creditValue: 12 },
      { name: 'MS Dhoni', team: 'Team A', role: 'WICKET_KEEPER', creditValue: 11 },
      { name: 'Jasprit Bumrah', team: 'Team A', role: 'BOWLER', creditValue: 10 },
      { name: 'Rohit Sharma', team: 'Team B', role: 'BATSMAN', creditValue: 11 },
      { name: 'Hardik Pandya', team: 'Team B', role: 'ALL_ROUNDER', creditValue: 9 },
      { name: 'Mohammed Shami', team: 'Team B', role: 'BOWLER', creditValue: 8 }
    ];
    
    for (const playerData of players) {
      const createResult = await makeRequest('/admin/players', 'POST', playerData);
      testData.players.push(createResult.player);
      console.log(`✅ Player creation successful: ${playerData.name}`);
    }
    
    // Get tournament players
    const tournamentPlayersResult = await makeRequest(`/tournaments/${testData.tournaments[0].id}/players`);
    console.log('✅ Tournament players fetch successful');
    
    return true;
  } catch (error) {
    console.log('❌ Player management test failed:', error.message);
    return false;
  }
};

const testTeamManagement = async () => {
  console.log('\n👥 Testing Team Management...');
  
  try {
    // Create user team
    const teamData = {
      userId: testData.users[0].id,
      tournamentId: testData.tournaments[0].id,
      teamName: 'My Dream Team',
      captainId: testData.players[0].id,
      viceCaptainId: testData.players[1].id,
      playerIds: testData.players.slice(0, 11).map(p => p.id) // Take first 11 players
    };
    
    const createResult = await makeRequest('/teams', 'POST', teamData);
    testData.teams.push(createResult.team);
    console.log('✅ Team creation successful');
    
    // Get user teams
    const userTeamsResult = await makeRequest(`/teams/user/${testData.users[0].id}`);
    console.log('✅ User teams fetch successful');
    
    // Get team details
    const teamDetailsResult = await makeRequest(`/teams/${testData.teams[0].id}`);
    console.log('✅ Team details fetch successful');
    
    return true;
  } catch (error) {
    console.log('❌ Team management test failed:', error.message);
    return false;
  }
};

const testScoringSystem = async () => {
  console.log('\n📊 Testing Scoring System...');
  
  try {
    // Update player scores
    const playerScores = testData.players.map((player, index) => ({
      playerId: player.id,
      runs: Math.floor(Math.random() * 100),
      ballsFaced: Math.floor(Math.random() * 60),
      wickets: Math.floor(Math.random() * 5),
      oversBowled: Math.floor(Math.random() * 10),
      runsConceded: Math.floor(Math.random() * 50),
      catches: Math.floor(Math.random() * 3),
      stumpings: Math.floor(Math.random() * 2),
      runOuts: Math.floor(Math.random() * 2)
    }));
    
    const scoresResult = await makeRequest('/scoring/player-scores', 'POST', {
      tournamentId: testData.tournaments[0].id,
      playerScores
    });
    console.log('✅ Player scores update successful');
    
    // Calculate user scores
    const userScoresResult = await makeRequest('/scoring/calculate-user-scores', 'POST', {
      tournamentId: testData.tournaments[0].id
    });
    console.log('✅ User scores calculation successful');
    
    // Update leaderboard
    const leaderboardResult = await makeRequest('/scoring/update-leaderboard', 'POST', {
      tournamentId: testData.tournaments[0].id
    });
    console.log('✅ Leaderboard update successful');
    
    // Get tournament scores
    const tournamentScoresResult = await makeRequest(`/scoring/tournament/${testData.tournaments[0].id}/scores`);
    console.log('✅ Tournament scores fetch successful');
    
    return true;
  } catch (error) {
    console.log('❌ Scoring system test failed:', error.message);
    return false;
  }
};

const testRewardSystem = async () => {
  console.log('\n💰 Testing Reward System...');
  
  try {
    // Create reward pool
    const rewardPoolData = {
      tournamentId: testData.tournaments[0].id,
      name: 'Test Reward Pool',
      totalAmount: 1000,
      distributionType: 'PERCENTAGE',
      distributionRules: JSON.stringify({
        rules: [
          { rank: 1, percentage: 50 },
          { rank: 2, percentage: 30 },
          { rank: 3, percentage: 20 }
        ]
      })
    };
    
    const createPoolResult = await makeRequest('/rewards/create-pool', 'POST', rewardPoolData);
    testData.rewardPools.push(createPoolResult.rewardPool);
    console.log('✅ Reward pool creation successful');
    
    // Distribute rewards
    const distributeResult = await makeRequest('/rewards/distribute', 'POST', {
      tournamentId: testData.tournaments[0].id,
      rewardPoolId: testData.rewardPools[0].id
    });
    console.log('✅ Reward distribution successful');
    
    // Get tournament reward pools
    const poolsResult = await makeRequest(`/rewards/tournament/${testData.tournaments[0].id}`);
    console.log('✅ Tournament reward pools fetch successful');
    
    // Get user rewards
    const userRewardsResult = await makeRequest(`/rewards/user/${testData.users[0].walletAddress}`);
    console.log('✅ User rewards fetch successful');
    
    return true;
  } catch (error) {
    console.log('❌ Reward system test failed:', error.message);
    return false;
  }
};

const testTradingSystem = async () => {
  console.log('\n💰 Testing Trading System...');
  
  try {
    // Get all players for trading
    const playersResult = await makeRequest('/trading/players');
    console.log('✅ Players for trading fetch successful');
    
    // Get specific player details
    const playerDetailsResult = await makeRequest(`/trading/player/${testData.players[0].id}`);
    console.log('✅ Player details fetch successful');
    
    // Test buy transaction
    const buyResult = await makeRequest('/trading/buy', 'POST', {
      userId: testData.users[0].id,
      playerId: testData.players[0].id,
      tokenAmount: 1000,
      maxPrice: 2.0
    });
    console.log('✅ Buy transaction successful');
    
    // Test sell transaction
    const sellResult = await makeRequest('/trading/sell', 'POST', {
      userId: testData.users[0].id,
      playerId: testData.players[0].id,
      tokenAmount: 500,
      minPrice: 1.0
    });
    console.log('✅ Sell transaction successful');
    
    // Get user portfolio
    const portfolioResult = await makeRequest(`/trading/portfolio/${testData.users[0].id}`);
    console.log('✅ Portfolio fetch successful');
    
    // Get user transaction history
    const transactionsResult = await makeRequest(`/trading/transactions/${testData.users[0].id}`);
    console.log('✅ Transaction history fetch successful');
    
    return true;
  } catch (error) {
    console.log('❌ Trading system test failed:', error.message);
    return false;
  }
};

const testSnapshotSystem = async () => {
  console.log('\n📸 Testing Snapshot System...');
  
  try {
    // Create pre-match snapshot
    const preMatchSnapshot = await makeRequest('/snapshots/create', 'POST', {
      tournamentId: testData.tournaments[0].id,
      snapshotType: 'PRE_MATCH',
      blockNumber: 12345,
      contractAddress: '0x1234567890abcdef'
    });
    console.log('✅ Pre-match snapshot creation successful');
    
    // Create post-match snapshot
    const postMatchSnapshot = await makeRequest('/snapshots/create', 'POST', {
      tournamentId: testData.tournaments[0].id,
      snapshotType: 'POST_MATCH',
      blockNumber: 12350,
      contractAddress: '0x1234567890abcdef'
    });
    console.log('✅ Post-match snapshot creation successful');
    
    // Get tournament snapshots
    const tournamentSnapshots = await makeRequest(`/snapshots/tournament/${testData.tournaments[0].id}`);
    console.log('✅ Tournament snapshots fetch successful');
    
    // Validate reward eligibility
    const eligibilityResult = await makeRequest('/snapshots/validate-eligibility', 'POST', {
      tournamentId: testData.tournaments[0].id,
      userId: testData.users[0].id
    });
    console.log('✅ Eligibility validation successful');
    
    // Get user holdings history
    const holdingsHistory = await makeRequest(`/snapshots/user/${testData.users[0].id}/holdings?tournamentId=${testData.tournaments[0].id}`);
    console.log('✅ User holdings history fetch successful');
    
    // Compare snapshots
    const comparisonResult = await makeRequest('/snapshots/compare', 'POST', {
      snapshotId1: preMatchSnapshot.snapshot.id,
      snapshotId2: postMatchSnapshot.snapshot.id
    });
    console.log('✅ Snapshot comparison successful');
    
    return true;
  } catch (error) {
    console.log('❌ Snapshot system test failed:', error.message);
    return false;
  }
};

const testAdminFunctions = async () => {
  console.log('\n🔧 Testing Admin Functions...');
  
  try {
    // Get admin stats
    const statsResult = await makeRequest('/admin/stats');
    console.log('✅ Admin stats fetch successful');
    
    // Get all tournaments (admin view)
    const tournamentsResult = await makeRequest('/admin/tournaments');
    console.log('✅ Admin tournaments fetch successful');
    
    // Get all users (admin view)
    const usersResult = await makeRequest('/admin/users');
    console.log('✅ Admin users fetch successful');
    
    return true;
  } catch (error) {
    console.log('❌ Admin functions test failed:', error.message);
    return false;
  }
};

const cleanupTestData = async () => {
  console.log('\n🧹 Cleaning up test data...');
  
  try {
    // Clean up in reverse order of creation
    for (const pool of testData.rewardPools) {
      await prisma.rewardPool.delete({ where: { id: pool.id } }).catch(() => {});
    }
    
    for (const team of testData.teams) {
      await prisma.userTeam.delete({ where: { id: team.id } }).catch(() => {});
    }
    
    for (const player of testData.players) {
      await prisma.player.delete({ where: { id: player.id } }).catch(() => {});
    }
    
    for (const tournament of testData.tournaments) {
      await prisma.tournament.delete({ where: { id: tournament.id } }).catch(() => {});
    }
    
    for (const user of testData.users) {
      await prisma.user.delete({ where: { id: user.id } }).catch(() => {});
    }
    
    console.log('✅ Test data cleanup completed');
  } catch (error) {
    console.log('⚠️  Cleanup had some issues (this is usually fine):', error.message);
  }
};

// Main test runner
const runAllTests = async () => {
  console.log('🚀 Starting Cricket Fantasy Backend Integration Tests');
  console.log('=' .repeat(60));
  
  const startTime = Date.now();
  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };
  
  const tests = [
    { name: 'Health Check', fn: testHealthCheck },
    { name: 'User Management', fn: testUserManagement },
    { name: 'Tournament Management', fn: testTournamentManagement },
    { name: 'Player Management', fn: testPlayerManagement },
    { name: 'Team Management', fn: testTeamManagement },
    { name: 'Trading System', fn: testTradingSystem },
    { name: 'Snapshot System', fn: testSnapshotSystem },
    { name: 'Scoring System', fn: testScoringSystem },
    { name: 'Reward System', fn: testRewardSystem },
    { name: 'Admin Functions', fn: testAdminFunctions }
  ];
  
  for (const test of tests) {
    try {
      const passed = await test.fn();
      results.tests.push({ name: test.name, status: passed ? 'PASSED' : 'FAILED' });
      if (passed) results.passed++; else results.failed++;
    } catch (error) {
      console.log(`❌ ${test.name} test crashed:`, error.message);
      results.tests.push({ name: test.name, status: 'CRASHED' });
      results.failed++;
    }
    
    await delay(500); // Small delay between tests
  }
  
  // Cleanup
  await cleanupTestData();
  
  // Results
  const endTime = Date.now();
  const duration = (endTime - startTime) / 1000;
  
  console.log('\n' + '=' .repeat(60));
  console.log('📋 TEST RESULTS');
  console.log('=' .repeat(60));
  
  results.tests.forEach(test => {
    const status = test.status === 'PASSED' ? '✅' : '❌';
    console.log(`${status} ${test.name}: ${test.status}`);
  });
  
  console.log('\n📊 SUMMARY:');
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`⏱️  Duration: ${duration.toFixed(2)}s`);
  
  if (results.failed === 0) {
    console.log('\n🎉 All tests passed! Your backend is working correctly.');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed. Please check the logs above.');
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n\n🛑 Test interrupted. Cleaning up...');
  await cleanupTestData();
  await prisma.$disconnect();
  process.exit(0);
});

// Run tests
runAllTests().catch(async (error) => {
  console.error('\n💥 Test runner crashed:', error);
  await cleanupTestData();
  await prisma.$disconnect();
  process.exit(1);
});
