const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

async function testSimpleRewardCalculation() {
  try {
    console.log('🧪 Testing Simplified Reward Calculation...\n');

    // Step 1: Get available tournaments
    console.log('📋 Getting available tournaments...');
    const tournamentsResponse = await axios.get(`${BASE_URL}/tournaments`);
    const tournaments = tournamentsResponse.data.tournaments;
    
    if (tournaments.length === 0) {
      console.log('❌ No tournaments found. Please create a tournament first.');
      return;
    }

    console.log(`✅ Found ${tournaments.length} tournaments:`);
    tournaments.forEach(tournament => {
      console.log(`   - ${tournament.name} (${tournament.id}) - Status: ${tournament.status}`);
    });

    // Use the first tournament
    const tournament = tournaments[0];
    console.log(`\n🎯 Using tournament: ${tournament.name} (${tournament.id})\n`);

    // Step 2: Check if snapshots exist
    console.log('📸 Checking snapshots...');
    try {
      const snapshotsResponse = await axios.get(`${BASE_URL}/snapshots/tournament/${tournament.id}`);
      const snapshots = snapshotsResponse.data.snapshots;
      
      console.log(`✅ Found ${snapshots.length} snapshots:`);
      snapshots.forEach(snapshot => {
        console.log(`   - ${snapshot.snapshotType} - ${snapshot.timestamp} - ${snapshot.totalHolders} holders`);
      });

      // Check if we have a post-match snapshot
      const postMatchSnapshot = snapshots.find(s => s.snapshotType === 'POST_MATCH');
      if (!postMatchSnapshot) {
        console.log('❌ No post-match snapshot found. Please create a post-match snapshot first.');
        return;
      }

      console.log(`✅ Post-match snapshot found with ${postMatchSnapshot.totalHolders} holders\n`);

    } catch (error) {
      console.log('❌ Error checking snapshots:', error.response?.data?.error || error.message);
      return;
    }

    // Step 3: Check player scores
    console.log('⚽ Checking player scores...');
    try {
      const scoresResponse = await axios.get(`${BASE_URL}/scoring/tournament/${tournament.id}`);
      const scores = scoresResponse.data.scores;
      
      if (scores.length === 0) {
        console.log('❌ No player scores found. Please add player scores first.');
        return;
      }

      console.log(`✅ Found ${scores.length} player scores:`);
      scores.forEach(score => {
        console.log(`   - ${score.moduleName || score.playerId}: ${score.fantasyPoints} points`);
      });
      console.log('');

    } catch (error) {
      console.log('❌ Error checking player scores:', error.response?.data?.error || error.message);
      return;
    }

    // Step 4: Test simplified reward calculation
    console.log('💰 Testing simplified reward calculation...');
    const totalRewardAmount = 100; // 100 APT total reward pool
    
    try {
      const rewardResponse = await axios.post(`${BASE_URL}/rewards/calculate-simple`, {
        tournamentId: tournament.id,
        totalRewardAmount: totalRewardAmount
      });

      const result = rewardResponse.data;
      
      if (result.success) {
        console.log('✅ Reward calculation successful!\n');
        
        console.log('📊 Summary:');
        console.log(`   - Tournament: ${result.summary.tournamentId}`);
        console.log(`   - Total Reward Pool: ${result.summary.totalRewardAmount} APT`);
        console.log(`   - Total Users: ${result.summary.totalUsers}`);
        console.log(`   - Total Score: ${result.summary.totalScore.toFixed(2)}`);
        console.log(`   - Total Distributed: ${result.summary.totalDistributed.toFixed(6)} APT`);
        console.log(`   - Highest Reward: ${result.summary.highestReward.toFixed(6)} APT\n`);

        console.log('🏆 Top 5 Rewards:');
        result.rewards.slice(0, 5).forEach((reward, index) => {
          console.log(`   ${index + 1}. ${reward.address}`);
          console.log(`      Score: ${reward.totalScore.toFixed(2)} (${reward.scorePercentage.toFixed(2)}%)`);
          console.log(`      Reward: ${reward.rewardAmount.toFixed(6)} APT`);
          console.log(`      Holdings: ${reward.holdings.length} players`);
          console.log('');
        });

        console.log('🎯 How it works:');
        console.log('   1. Gets post-match snapshot to see who holds what shares');
        console.log('   2. Gets player performance scores from the tournament');
        console.log('   3. Calculates user score = sum of (token_amount * player_fantasy_points)');
        console.log('   4. Distributes rewards proportionally based on user scores');
        console.log('   5. Users with better performing players get more rewards!');

      } else {
        console.log('❌ Reward calculation failed:', result.error);
      }

    } catch (error) {
      console.log('❌ Error calculating rewards:', error.response?.data?.error || error.message);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testSimpleRewardCalculation();
