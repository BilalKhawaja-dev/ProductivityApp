#!/bin/bash

# Final Integration Test Script for Productivity App
# This script tests all requirements end-to-end

# Set AWS region
export AWS_DEFAULT_REGION=us-east-1

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
API_URL="https://YOUR_API_GATEWAY_ID.execute-api.us-east-1.amazonaws.com/dev"
CLOUDFRONT_URL="https://YOUR_CLOUDFRONT_DISTRIBUTION.cloudfront.net"
TEST_EMAIL="test-$(date +%s)@example.com"
TEST_PASSWORD="TestPassword123!"

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0

# Helper functions
print_test() {
    echo -e "${YELLOW}[TEST]${NC} $1"
}

print_pass() {
    echo -e "${GREEN}[PASS]${NC} $1"
    ((TESTS_PASSED++))
}

print_fail() {
    echo -e "${RED}[FAIL]${NC} $1"
    ((TESTS_FAILED++))
}

print_section() {
    echo ""
    echo "=========================================="
    echo "$1"
    echo "=========================================="
}

# Test 1: Infrastructure Deployment
print_section "1. INFRASTRUCTURE DEPLOYMENT"

print_test "Checking DynamoDB table exists"
if aws dynamodb describe-table --table-name ProductivityApp-dev &>/dev/null; then
    print_pass "DynamoDB table exists"
else
    print_fail "DynamoDB table not found"
fi

print_test "Checking API Gateway is accessible"
if curl -s -o /dev/null -w "%{http_code}" "$API_URL/auth/register" | grep -q "400\|401\|403"; then
    print_pass "API Gateway is accessible"
else
    print_fail "API Gateway not accessible"
fi

print_test "Checking S3 bucket exists"
if aws s3 ls s3://productivity-app-frontend-dev-12345 &>/dev/null; then
    print_pass "S3 bucket exists"
else
    print_fail "S3 bucket not found"
fi

print_test "Checking CloudFront distribution"
if curl -s -o /dev/null -w "%{http_code}" "$CLOUDFRONT_URL" | grep -q "200"; then
    print_pass "CloudFront distribution is accessible"
else
    print_fail "CloudFront distribution not accessible"
fi

# Test 2: User Registration and Authentication (Requirement 1)
print_section "2. USER AUTHENTICATION (Requirement 1)"

print_test "Registering new user"
REGISTER_RESPONSE=$(curl -s -X POST "$API_URL/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")

if echo "$REGISTER_RESPONSE" | jq -e '.token' &>/dev/null; then
    TOKEN=$(echo "$REGISTER_RESPONSE" | jq -r '.token')
    print_pass "User registration successful (Req 1.1)"
else
    print_fail "User registration failed"
    echo "Response: $REGISTER_RESPONSE"
fi

print_test "Testing duplicate email rejection"
DUPLICATE_RESPONSE=$(curl -s -X POST "$API_URL/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")

if echo "$DUPLICATE_RESPONSE" | grep -q "already exists\|duplicate"; then
    print_pass "Duplicate email rejected (Req 1.4)"
else
    print_fail "Duplicate email not properly rejected"
fi

print_test "Testing login with valid credentials"
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")

if echo "$LOGIN_RESPONSE" | jq -e '.token' &>/dev/null; then
    TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token')
    print_pass "Login successful (Req 1.2)"
else
    print_fail "Login failed"
fi

print_test "Testing login with invalid credentials"
INVALID_LOGIN=$(curl -s -X POST "$API_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"WrongPassword\"}")

if echo "$INVALID_LOGIN" | grep -q "Invalid\|Unauthorized\|401"; then
    print_pass "Invalid credentials rejected (Req 1.5)"
else
    print_fail "Invalid credentials not properly rejected"
fi

# Test 3: Task Management (Requirement 2)
print_section "3. TASK MANAGEMENT (Requirement 2)"

print_test "Creating a task"
TASK_RESPONSE=$(curl -s -X POST "$API_URL/tasks" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{
        "title": "Test Task",
        "description": "Integration test task",
        "priority": "high",
        "dueDate": "2025-12-15",
        "dueTime": "14:00"
    }')

if echo "$TASK_RESPONSE" | jq -e '.task.taskId' &>/dev/null; then
    TASK_ID=$(echo "$TASK_RESPONSE" | jq -r '.task.taskId')
    print_pass "Task creation successful (Req 2.1)"
else
    print_fail "Task creation failed"
    echo "Response: $TASK_RESPONSE"
fi

print_test "Retrieving tasks"
TASKS_RESPONSE=$(curl -s -X GET "$API_URL/tasks" \
    -H "Authorization: Bearer $TOKEN")

if echo "$TASKS_RESPONSE" | jq -e '.tasks' &>/dev/null; then
    print_pass "Task retrieval successful (Req 2.2)"
else
    print_fail "Task retrieval failed"
fi

print_test "Updating task"
UPDATE_RESPONSE=$(curl -s -X PUT "$API_URL/tasks/$TASK_ID" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"title": "Updated Test Task"}')

if echo "$UPDATE_RESPONSE" | jq -e '.task' &>/dev/null; then
    print_pass "Task update successful (Req 2.3)"
else
    print_fail "Task update failed"
fi

print_test "Toggling task completion"
TOGGLE_RESPONSE=$(curl -s -X PATCH "$API_URL/tasks/$TASK_ID/toggle" \
    -H "Authorization: Bearer $TOKEN")

if echo "$TOGGLE_RESPONSE" | jq -e '.task.completed' &>/dev/null; then
    print_pass "Task toggle successful (Req 2.5)"
else
    print_fail "Task toggle failed"
fi

# Test 4: Category Management (Requirement 3)
print_section "4. CATEGORY MANAGEMENT (Requirement 3)"

print_test "Creating a category"
CATEGORY_RESPONSE=$(curl -s -X POST "$API_URL/categories" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"name": "Work", "color": "#4CAF50"}')

if echo "$CATEGORY_RESPONSE" | jq -e '.category.categoryId' &>/dev/null; then
    CATEGORY_ID=$(echo "$CATEGORY_RESPONSE" | jq -r '.category.categoryId')
    print_pass "Category creation successful (Req 3.1)"
else
    print_fail "Category creation failed"
fi

print_test "Retrieving categories"
CATEGORIES_RESPONSE=$(curl -s -X GET "$API_URL/categories" \
    -H "Authorization: Bearer $TOKEN")

if echo "$CATEGORIES_RESPONSE" | jq -e '.categories' &>/dev/null; then
    print_pass "Category retrieval successful (Req 3.2)"
else
    print_fail "Category retrieval failed"
fi

print_test "Updating category"
UPDATE_CAT_RESPONSE=$(curl -s -X PUT "$API_URL/categories/$CATEGORY_ID" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"name": "Work Updated", "color": "#FF5722"}')

if echo "$UPDATE_CAT_RESPONSE" | jq -e '.category' &>/dev/null; then
    print_pass "Category update successful (Req 3.3)"
else
    print_fail "Category update failed"
fi

# Test 5: Security and Authorization (Requirement 17)
print_section "5. SECURITY AND AUTHORIZATION (Requirement 17)"

print_test "Testing unauthorized access"
UNAUTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$API_URL/tasks")

if [ "$UNAUTH_RESPONSE" = "401" ]; then
    print_pass "Unauthorized access blocked (Req 17.6)"
else
    print_fail "Unauthorized access not properly blocked"
fi

print_test "Testing invalid token"
INVALID_TOKEN_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$API_URL/tasks" \
    -H "Authorization: Bearer invalid-token-12345")

if [ "$INVALID_TOKEN_RESPONSE" = "401" ] || [ "$INVALID_TOKEN_RESPONSE" = "403" ]; then
    print_pass "Invalid token rejected (Req 17.6)"
else
    print_fail "Invalid token not properly rejected"
fi

# Test 6: Lambda Functions
print_section "6. LAMBDA FUNCTIONS"

print_test "Checking Lambda functions exist"
LAMBDA_COUNT=$(aws lambda list-functions --query "Functions[?starts_with(FunctionName, 'dev-')].FunctionName" --output text | wc -w)

if [ "$LAMBDA_COUNT" -ge 15 ]; then
    print_pass "Lambda functions deployed ($LAMBDA_COUNT functions)"
else
    print_fail "Not all Lambda functions deployed (found $LAMBDA_COUNT)"
fi

# Test 7: EventBridge Rules
print_section "7. EVENTBRIDGE RULES (Requirements 4, 5, 10, 15)"

print_test "Checking recurring tasks EventBridge rule"
if aws events describe-rule --name "dev-recurring-tasks-daily" &>/dev/null; then
    print_pass "Recurring tasks rule exists (Req 4.2)"
else
    print_fail "Recurring tasks rule not found"
fi

# Test 8: SNS Topic
print_section "8. SNS NOTIFICATIONS (Requirement 5)"

print_test "Checking SNS topic exists"
if aws sns get-topic-attributes --topic-arn "arn:aws:sns:us-east-1:YOUR_ACCOUNT_ID:dev-task-reminders" &>/dev/null; then
    print_pass "SNS topic exists (Req 5.2, 5.3)"
else
    print_fail "SNS topic not found"
fi

# Test 9: CloudWatch Monitoring
print_section "9. CLOUDWATCH MONITORING (Requirement 11)"

print_test "Checking CloudWatch log groups"
LOG_GROUP_COUNT=$(aws logs describe-log-groups --log-group-name-prefix "/aws/lambda/dev-" --query "logGroups[].logGroupName" --output text | wc -w)

if [ "$LOG_GROUP_COUNT" -ge 10 ]; then
    print_pass "CloudWatch log groups exist ($LOG_GROUP_COUNT groups)"
else
    print_fail "Not all log groups found (found $LOG_GROUP_COUNT)"
fi

# Test 10: Frontend Accessibility
print_section "10. FRONTEND ACCESSIBILITY (Requirement 13)"

print_test "Checking frontend loads"
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$CLOUDFRONT_URL")

if [ "$FRONTEND_STATUS" = "200" ]; then
    print_pass "Frontend accessible via CloudFront"
else
    print_fail "Frontend not accessible (status: $FRONTEND_STATUS)"
fi

print_test "Checking frontend contains React app"
if curl -s "$CLOUDFRONT_URL" | grep -q "root"; then
    print_pass "Frontend contains React app"
else
    print_fail "Frontend does not contain React app"
fi

# Cleanup
print_section "11. CLEANUP"

print_test "Deleting test task"
DELETE_TASK_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "$API_URL/tasks/$TASK_ID" \
    -H "Authorization: Bearer $TOKEN")

if [ "$DELETE_TASK_RESPONSE" = "200" ]; then
    print_pass "Task deletion successful (Req 2.4)"
else
    print_fail "Task deletion failed"
fi

print_test "Deleting test category"
DELETE_CAT_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "$API_URL/categories/$CATEGORY_ID" \
    -H "Authorization: Bearer $TOKEN")

if [ "$DELETE_CAT_RESPONSE" = "200" ]; then
    print_pass "Category deletion successful (Req 3.4)"
else
    print_fail "Category deletion failed"
fi

# Summary
print_section "TEST SUMMARY"
echo -e "${GREEN}Tests Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Tests Failed: $TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}✗ Some tests failed${NC}"
    exit 1
fi
