// Quick test script to verify Cricket API integration
const axios = require('axios');

const MATCH_ID = 130179;

async function testCricketAPI() {
  try {
    console.log('\n🏏 Testing Cricket API Connection');
    console.log('==================================');
    console.log(`Match ID: ${MATCH_ID}\n`);

    const options = {
      method: 'GET',
      url: `https://cricbuzz-cricket.p.rapidapi.com/mcenter/v1/${MATCH_ID}/scard`,
      headers: {
        'x-rapidapi-key': process.env.RAPIDAPI_KEY,
        'x-rapidapi-host': 'cricbuzz-cricket.p.rapidapi.com'
      }
    };

    console.log('📡 Fetching scorecard from Cricbuzz API...');
    const response = await axios.request(options);

    console.log('✅ API Connection Successful!\n');
    console.log('📊 Response Summary:');
    console.log('===================');
    
    if (response.data && response.data.scorecard) {
      console.log(`✓ Scorecard data received`);
      console.log(`✓ Number of innings: ${response.data.scorecard.length}`);
      
      // Show sample batting data
      if (response.data.scorecard[0]?.batsman && Array.isArray(response.data.scorecard[0].batsman)) {
        const batsmen = response.data.scorecard[0].batsman;
        console.log(`✓ Number of batsmen: ${batsmen.length}`);
        
        if (batsmen.length > 0) {
          console.log('\n📋 Sample Batsman Data:');
          const sample = batsmen[0];
          console.log(`   Name: ${sample.name}`);
          console.log(`   Runs: ${sample.runs}`);
          console.log(`   Balls: ${sample.balls}`);
          console.log(`   Strike Rate: ${sample.strkrate}`);
          console.log(`   Dismissal: ${sample.outdec || 'Not out'}`);
        }
      }
      
      // Show sample bowling data
      if (response.data.scorecard[0]?.bowler && Array.isArray(response.data.scorecard[0].bowler)) {
        const bowlers = response.data.scorecard[0].bowler;
        console.log(`\n✓ Number of bowlers: ${bowlers.length}`);
        
        if (bowlers.length > 0) {
          console.log('\n🎯 Sample Bowler Data:');
          const sample = bowlers[0];
          console.log(`   Name: ${sample.name}`);
          console.log(`   Wickets: ${sample.wickets}`);
          console.log(`   Overs: ${sample.overs}`);
          console.log(`   Runs Conceded: ${sample.runs}`);
          console.log(`   Economy: ${sample.economy}`);
        }
      }
      
      console.log('\n✅ API integration is working correctly!');
      console.log('\nYou can now use:');
      console.log(`   npm run scores:fetch-api -- <tournament-id> ${MATCH_ID}`);
      
    } else {
      console.log('⚠️  No scorecard data found in response');
      console.log('Response structure:', JSON.stringify(response.data, null, 2).substring(0, 500));
    }

  } catch (error) {
    console.error('\n❌ API Test Failed!');
    console.error('===================');
    
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Message: ${error.response.statusText}`);
      console.error(`Data:`, JSON.stringify(error.response.data, null, 2).substring(0, 500));
    } else {
      console.error('Error:', error.message);
    }
    
    console.log('\nPossible issues:');
    console.log('1. Match ID might be invalid');
    console.log('2. API key might have expired');
    console.log('3. Rate limit might be exceeded');
    console.log('4. Network connection issue');
  }
}

testCricketAPI();

