# Backend API Integration Tests

This directory contains comprehensive integration tests for the Productivity App backend APIs.

## Test Coverage

The test suite validates:

1. **User Registration and Login**
   - Register new user with valid credentials
   - Reject duplicate email registration
   - Login with valid credentials
   - Reject invalid password
   - Reject non-existent email

2. **Category CRUD Operations**
   - Create category
   - Get all categories
   - Update category
   - Delete category
   - Reject unauthenticated access

3. **Task CRUD Operations**
   - Create task
   - Get all tasks
   - Get tasks with date range filter
   - Update task
   - Toggle task completion
   - Delete task
   - Reject unauthenticated access
   - Reject cross-user access

4. **Recurring Tasks**
   - Create recurring task with day configuration
   - Verify recurring configuration is saved

5. **Error Handling**
   - Missing required fields (400)
   - Non-existent resources (404)
   - Unauthorized access (401)
   - Forbidden cross-user access (403)

## Running the Tests

### Prerequisites

1. Deploy the backend infrastructure using Terraform
2. Get the API Gateway URL from Terraform outputs

### Run Tests Against Deployed API

```bash
cd backend/tests
export API_GATEWAY_URL="https://your-api-gateway-url.amazonaws.com/prod"
npm test
```

### Run Tests Against Local Development Server

```bash
cd backend/tests
npm run test:local
```

## Test Output

The test suite provides detailed output:
- ✅ Green checkmarks for passing tests
- ❌ Red X marks for failing tests
- Detailed error messages for failures
- Summary statistics at the end

## Exit Codes

- `0`: All tests passed
- `1`: One or more tests failed

## Notes

- Tests create temporary test users with unique email addresses
- Tests clean up created resources (tasks, categories) after execution
- Tests validate both success and error scenarios
- Tests verify proper HTTP status codes for all operations
