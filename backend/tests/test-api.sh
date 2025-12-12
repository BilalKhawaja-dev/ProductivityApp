#!/bin/bash

# Simple bash script to test backend APIs using curl
# Usage: ./test-api.sh <API_GATEWAY_URL>

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
API_URL="${1:-${API_GATEWAY_URL}}"
TEST_EMAIL="test-$(date +%s)@example.com"
TEST_EMAIL_2="test2-$(date +%s)@example.com"
TEST_PASSWORD="SecureTestPass123!"

if [ -z "$API_URL" ]; then
    echo -e "${RED}Error: API Gateway URL not provided${NC}"
    echo "Usage: $0 <API_GATEWAY_URL>"
    echo "Or set API_GATEWAY_URL environment variable"
    exit 1
fi

echo -e "${YELLOW}🚀 Testing Backend APIs${NC}"
echo "API URL: $API_URL"
echo ""

# Test counter
PASSED=0
FAILED=0

# Helper function to test API endpoint
test_api() {
    local name="$1"
    local method="$2"
    local endpoint="$3"
    local data="$4"
    local token="$5"
    local expected_status="$6"
    
    echo -n "Testing: $name... "
    
    local headers=(-H "Content-Type: application/json")
    if [ -n "$token" ]; then
        headers+=(-H "Authorization: Bearer $token")
    fi
    
    local response
    if [ -n "$data" ]; then
        response=$(curl -s -w "\n%{http_code}" -X "$method" "${API_URL}${endpoint}" "${headers[@]}" -d "$data")
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" "${API_URL}${endpoint}" "${headers[@]}")
    fi
    
    local body=$(echo "$response" | head -n -1)
    local status=$(echo "$response" | tail -n 1)
    
    if [[ "$status" == "$expected_status" ]] || [[ "$expected_status" == *"|"* && "$expected_status" == *"$status"* ]]; then
        echo -e "${GREEN}✅ PASS${NC} (Status: $status)"
        ((PASSED++))
        echo "$body"
        return 0
    else
        echo -e "${RED}❌ FAIL${NC} (Expected: $expected_status, Got: $status)"
        echo "Response: $body"
        ((FAILED++))
        return 1
    fi
}

# Variables to store tokens and IDs
AUTH_TOKEN=""
AUTH_TOKEN_2=""
CATEGORY_ID=""
TASK_ID=""

echo -e "${YELLOW}📋 1. Testing User Registration and Login${NC}"
echo ""

# Register User 1
response=$(test_api "Register User 1" "POST" "/auth/register" \
    "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}" \
    "" "200|201")
AUTH_TOKEN=$(echo "$response" | jq -r '.token // empty' 2>/dev/null || echo "")

# Register duplicate (should fail)
test_api "Register Duplicate Email" "POST" "/auth/register" \
    "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}" \
    "" "400|409"

# Login User 1
response=$(test_api "Login User 1" "POST" "/auth/login" \
    "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}" \
    "" "200")
AUTH_TOKEN=$(echo "$response" | jq -r '.token // empty' 2>/dev/null || echo "$AUTH_TOKEN")

# Login with wrong password
test_api "Login Wrong Password" "POST" "/auth/login" \
    "{\"email\":\"$TEST_EMAIL\",\"password\":\"WrongPassword\"}" \
    "" "401"

# Register User 2
response=$(test_api "Register User 2" "POST" "/auth/register" \
    "{\"email\":\"$TEST_EMAIL_2\",\"password\":\"$TEST_PASSWORD\"}" \
    "" "200|201")
AUTH_TOKEN_2=$(echo "$response" | jq -r '.token // empty' 2>/dev/null || echo "")

echo ""
echo -e "${YELLOW}📋 2. Testing Category CRUD${NC}"
echo ""

# Create Category
response=$(test_api "Create Category" "POST" "/categories" \
    "{\"name\":\"Work\",\"color\":\"#4CAF50\"}" \
    "$AUTH_TOKEN" "200|201")
CATEGORY_ID=$(echo "$response" | jq -r '.category.categoryId // empty' 2>/dev/null || echo "")

# Get Categories
test_api "Get Categories" "GET" "/categories" \
    "" "$AUTH_TOKEN" "200"

# Update Category
test_api "Update Category" "PUT" "/categories/$CATEGORY_ID" \
    "{\"name\":\"Work Updated\",\"color\":\"#FF5722\"}" \
    "$AUTH_TOKEN" "200"

# Get Categories without auth (should fail)
test_api "Get Categories No Auth" "GET" "/categories" \
    "" "" "401"

echo ""
echo -e "${YELLOW}📋 3. Testing Task CRUD${NC}"
echo ""

# Create Task
response=$(test_api "Create Task" "POST" "/tasks" \
    "{\"title\":\"Test Task\",\"description\":\"Test\",\"categoryId\":\"$CATEGORY_ID\",\"priority\":\"high\",\"dueDate\":\"2025-12-15\",\"dueTime\":\"14:00\"}" \
    "$AUTH_TOKEN" "200|201")
TASK_ID=$(echo "$response" | jq -r '.task.taskId // empty' 2>/dev/null || echo "")

# Get Tasks
test_api "Get Tasks" "GET" "/tasks" \
    "" "$AUTH_TOKEN" "200"

# Get Tasks with date range
test_api "Get Tasks Date Range" "GET" "/tasks?startDate=2025-12-01&endDate=2025-12-31" \
    "" "$AUTH_TOKEN" "200"

# Update Task
test_api "Update Task" "PUT" "/tasks/$TASK_ID" \
    "{\"title\":\"Updated Task\",\"priority\":\"medium\"}" \
    "$AUTH_TOKEN" "200"

# Toggle Task Complete
test_api "Toggle Task Complete" "PATCH" "/tasks/$TASK_ID/toggle" \
    "" "$AUTH_TOKEN" "200"

# Toggle Task Incomplete
test_api "Toggle Task Incomplete" "PATCH" "/tasks/$TASK_ID/toggle" \
    "" "$AUTH_TOKEN" "200"

# Get Tasks without auth (should fail)
test_api "Get Tasks No Auth" "GET" "/tasks" \
    "" "" "401"

# Update task as User 2 (should fail)
test_api "Update Task Cross-User" "PUT" "/tasks/$TASK_ID" \
    "{\"title\":\"Unauthorized\"}" \
    "$AUTH_TOKEN_2" "403|404"

echo ""
echo -e "${YELLOW}📋 4. Testing Recurring Tasks${NC}"
echo ""

# Create Recurring Task
test_api "Create Recurring Task" "POST" "/tasks" \
    "{\"title\":\"Daily Standup\",\"categoryId\":\"$CATEGORY_ID\",\"priority\":\"high\",\"dueDate\":\"2025-12-09\",\"dueTime\":\"09:00\",\"recurring\":{\"enabled\":true,\"days\":[\"monday\",\"tuesday\",\"wednesday\",\"thursday\",\"friday\"]}}" \
    "$AUTH_TOKEN" "200|201"

echo ""
echo -e "${YELLOW}📋 5. Testing Error Cases${NC}"
echo ""

# Create task without required fields
test_api "Create Task Missing Fields" "POST" "/tasks" \
    "{\"description\":\"Missing title\"}" \
    "$AUTH_TOKEN" "400"

# Create category without name
test_api "Create Category Missing Name" "POST" "/categories" \
    "{\"color\":\"#FF0000\"}" \
    "$AUTH_TOKEN" "400"

echo ""
echo -e "${YELLOW}📋 6. Testing Cleanup${NC}"
echo ""

# Delete Task
test_api "Delete Task" "DELETE" "/tasks/$TASK_ID" \
    "" "$AUTH_TOKEN" "200|204"

# Delete Category
test_api "Delete Category" "DELETE" "/categories/$CATEGORY_ID" \
    "" "$AUTH_TOKEN" "200|204"

echo ""
echo "=================================================="
echo -e "${YELLOW}📊 TEST SUMMARY${NC}"
echo "=================================================="
echo -e "${GREEN}✅ Passed: $PASSED${NC}"
echo -e "${RED}❌ Failed: $FAILED${NC}"
echo "📈 Total: $((PASSED + FAILED))"

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}⚠️  Some tests failed${NC}"
    exit 1
fi
