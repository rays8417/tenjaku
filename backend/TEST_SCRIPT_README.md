# 🏏 Cricket Fantasy Backend Test Script

This comprehensive test script validates all major functionalities of your cricket fantasy sports platform, comparing it against football.fun mechanics.

## 🚀 Quick Start

### Prerequisites
1. **Database Setup**: Ensure your PostgreSQL database is running and migrations are applied
2. **Server Running**: Start your backend server with `npm run dev`
3. **Dependencies**: Install required packages with `npm install`

### Running Tests

```bash
# Run integration tests
npm run test:integration

# Run all tests (unit + integration)
npm run test:all

# Run only unit tests
npm run test
```

## 📋 What Gets Tested

### ✅ **Already Implemented & Working**
- **User Management**: Registration, login, profile management
- **Tournament System**: Creation, management, team participation
- **Player Management**: Player creation, role assignment, credit system
- **Team Building**: 11-player teams with captain/vice-captain
- **Scoring System**: Cricket-specific fantasy points calculation
- **Reward System**: Pool creation, distribution, processing
- **Leaderboard**: Real-time ranking system
- **Admin Functions**: Tournament/player management, statistics

### 🆕 **New Features Added**
- **Trading System**: Buy/sell player shares with AMM-like mechanics
- **Snapshot Mechanism**: Pre/post match snapshots for reward eligibility
- **Portfolio Management**: User holdings tracking and P&L calculation
- **Transaction History**: Complete trading activity logs

## 🧪 Test Coverage

### 1. **Health Check** ✅
- Server connectivity
- API endpoint availability

### 2. **User Management** ✅
- User registration/login with wallet
- Profile management
- Statistics tracking

### 3. **Tournament Management** ✅
- Tournament creation
- Team registration
- Participant tracking

### 4. **Player Management** ✅
- Player creation with roles
- Credit value assignment
- Team-based organization

### 5. **Team Management** ✅
- 11-player team creation
- Captain/vice-captain selection
- Credit limit validation (100 credits)

### 6. **Trading System** 🆕
- Player share buying/selling
- Portfolio tracking
- Transaction history
- P&L calculation

### 7. **Snapshot System** 🆕
- Pre-match snapshot creation
- Post-match snapshot creation
- Reward eligibility validation
- Holdings comparison

### 8. **Scoring System** ✅
- Player performance tracking
- Fantasy points calculation
- Captain/vice-captain multipliers

### 9. **Reward System** ✅
- Reward pool creation
- Distribution based on leaderboard
- Processing and tracking

### 10. **Admin Functions** ✅
- Tournament management
- Player management
- System statistics

## 📊 Test Data

The script creates realistic test data:
- **Users**: Test user with wallet address
- **Tournaments**: Sample cricket match
- **Players**: 6 players (3 per team) with different roles
- **Teams**: User team with captain/vice-captain
- **Scores**: Random but realistic cricket statistics
- **Rewards**: Sample reward pool with distribution rules

## 🔧 Configuration

### Environment Variables
```bash
# Required
DATABASE_URL="postgresql://username:password@localhost:5432/cricket_fantasy"
PORT=3000

# Optional
NODE_ENV=development
```

### Test Configuration
- **Base URL**: `http://localhost:3000/api`
- **Test Timeout**: 30 seconds per test
- **Cleanup**: Automatic cleanup after tests

## 📈 Expected Results

### Successful Run
```
🚀 Starting Cricket Fantasy Backend Integration Tests
============================================================

🏥 Testing Health Check...
✅ Health check passed: OK

👤 Testing User Management...
✅ User login/registration successful
✅ User profile fetch successful
✅ User stats fetch successful

... (more test results)

============================================================
📋 TEST RESULTS
============================================================
✅ Health Check: PASSED
✅ User Management: PASSED
✅ Tournament Management: PASSED
✅ Player Management: PASSED
✅ Team Management: PASSED
✅ Trading System: PASSED
✅ Snapshot System: PASSED
✅ Scoring System: PASSED
✅ Reward System: PASSED
✅ Admin Functions: PASSED

📊 SUMMARY:
✅ Passed: 10
❌ Failed: 0
⏱️  Duration: 15.32s

🎉 All tests passed! Your backend is working correctly.
```

## 🚨 Troubleshooting

### Common Issues

1. **Server Not Running**
   ```
   ❌ Request failed for GET /health: fetch failed
   ```
   **Solution**: Start server with `npm run dev`

2. **Database Connection Issues**
   ```
   ❌ Failed to create tournament: Database connection failed
   ```
   **Solution**: Check DATABASE_URL and ensure PostgreSQL is running

3. **Missing Dependencies**
   ```
   ❌ Cannot find module 'node-fetch'
   ```
   **Solution**: Run `npm install`

4. **Port Already in Use**
   ```
   ❌ Error: listen EADDRINUSE: address already in use :::3000
   ```
   **Solution**: Change PORT in .env or kill existing process

### Debug Mode
Add `DEBUG=true` to see detailed request/response logs:
```bash
DEBUG=true npm run test:integration
```

## 🔄 Continuous Integration

### GitHub Actions Example
```yaml
name: Backend Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm run test:all
```

## 📝 Customization

### Adding New Tests
1. Create new test function in `test-script.js`
2. Add to tests array in `runAllTests()`
3. Update this README

### Modifying Test Data
Edit the `testData` object and individual test functions to match your requirements.

### Environment-Specific Testing
Create separate test scripts for different environments:
- `test-script.dev.js` - Development testing
- `test-script.staging.js` - Staging validation
- `test-script.prod.js` - Production smoke tests

## 🎯 Football.fun Comparison

This test script validates that your platform includes all core football.fun mechanics:

| Feature | Football.fun | Your Platform | Status |
|---------|-------------|---------------|---------|
| Player Share Trading | ✅ | ✅ | Implemented |
| AMM-like Pricing | ✅ | ✅ | Implemented |
| Tournament System | ✅ | ✅ | Implemented |
| Snapshot Mechanism | ✅ | ✅ | Implemented |
| Reward Distribution | ✅ | ✅ | Implemented |
| Portfolio Management | ✅ | ✅ | Implemented |
| Transaction History | ✅ | ✅ | Implemented |

## 🚀 Next Steps

After running tests successfully:

1. **Deploy to staging** and run tests there
2. **Set up monitoring** for key endpoints
3. **Implement rate limiting** for production
4. **Add authentication middleware** for admin endpoints
5. **Set up automated testing** in CI/CD pipeline

---

**Happy Testing! 🏏⚡**
