# Admin Route Tests

This document describes the comprehensive test suite for the admin routes in the Cricket Fantasy Sports backend.

## Test Overview

The test suite covers all admin route endpoints with comprehensive test cases including:

### Tournament Management
- **POST /api/admin/tournaments** - Create tournaments
- **PUT /api/admin/tournaments/:id** - Update tournaments  
- **DELETE /api/admin/tournaments/:id** - Delete tournaments
- **GET /api/admin/tournaments** - List tournaments with filtering and pagination

### Player Management
- **POST /api/admin/players** - Create players
- **PUT /api/admin/players/:id** - Update players

### Admin Statistics
- **GET /api/admin/stats** - Get system statistics

### User Management
- **GET /api/admin/users** - List users with pagination

## Test Coverage

Each endpoint is tested for:

✅ **Success scenarios** - Valid requests with proper responses
✅ **Validation errors** - Missing required fields, invalid data
✅ **Database errors** - Error handling and proper error responses
✅ **Edge cases** - Null values, empty results, pagination
✅ **Business logic** - Tournament deletion with participants, etc.

## Running Tests

### Prerequisites
```bash
npm install
```

### Run All Tests
```bash
npm test
```

### Run Tests in Watch Mode
```bash
npm run test:watch
```

### Run Tests with Coverage
```bash
npm run test:coverage
```

## Test Structure

```
src/__tests__/
├── setup.ts              # Test setup and Prisma mocking
└── routes/
    └── admin.test.ts     # Admin route tests
```

## Mocking Strategy

The tests use Jest mocking to:
- Mock Prisma Client operations
- Isolate route logic from database
- Test error scenarios without real database failures
- Ensure fast, reliable test execution

## Test Data

Tests use realistic mock data that matches the Prisma schema:
- Tournament data with proper date formatting
- Player data with roles and credit values
- User data with wallet addresses and statistics
- Proper enum values for status fields

## Key Test Features

1. **Comprehensive Coverage** - All endpoints and scenarios tested
2. **Error Handling** - Database errors and validation failures
3. **Data Validation** - Required fields and data types
4. **Business Logic** - Complex rules like tournament deletion constraints
5. **Pagination** - Query parameters and limits
6. **Response Format** - Consistent API response structure

## Example Test Cases

### Tournament Creation
```typescript
it('should create a tournament successfully', async () => {
  const tournamentData = {
    name: 'Test Tournament',
    matchDate: '2024-12-25T10:00:00Z',
    team1: 'Team A',
    team2: 'Team B'
  };
  
  // Test successful creation with proper response format
});
```

### Error Handling
```typescript
it('should handle database errors', async () => {
  mockPrisma.tournament.create.mockRejectedValue(new Error('Database error'));
  
  // Test proper error response and status code
});
```

## Maintenance

When adding new admin endpoints:
1. Add corresponding test cases to `admin.test.ts`
2. Update mock setup in `setup.ts` if needed
3. Ensure all scenarios are covered (success, validation, errors)
4. Run tests to verify functionality

The test suite provides confidence in the admin route functionality and serves as documentation for expected behavior.
