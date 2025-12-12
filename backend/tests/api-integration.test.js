/**
 * API Integration Tests for Productivity App Backend
 * 
 * This test suite validates:
 * - User registration and login flow
 * - Task CRUD operations
 * - Category CRUD operations
 * - Recurring task creation and processing
 * - Authentication and authorization
 * - Error handling and status codes
 */

const https = require('https');
const http = require('http');

// Configuration
const API_BASE_URL = process.env.API_GATEWAY_URL || 'http://localhost:3000';
const TEST_USER_EMAIL = `test-${Date.now()}@example.com`;
const TEST_USER_PASSWORD = 'YourTestPassword123!';
const TEST_USER_EMAIL_2 = `test2-${Date.now()}@example.com`;

// Test state
let authToken = null;
let authToken2 = null;
let testTaskId = null;
let testCategoryId = null;
let recurringTaskId = null;

// Helper function to get date string with offset
function getDateString(baseDate, daysOffset) {
  const date = new Date(baseDate);
  date.setDate(date.getDate() + daysOffset);
  return date.toISOString().split('T')[0]; // YYYY-MM-DD
}

// Helper function to make HTTP requests
function makeRequest(method, path, data = null, token = null) {
  return new Promise((resolve, reject) => {
    // Ensure base URL ends with / and path starts with / for proper joining
    const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL : API_BASE_URL + '/';
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    const fullUrl = baseUrl + cleanPath;
    
    const url = new URL(fullUrl);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    if (data) {
      const body = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(body);
    }

    const req = client.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = responseData ? JSON.parse(responseData) : {};
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: parsed
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: responseData
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Test runner
async function runTests() {
  console.log('🚀 Starting API Integration Tests\n');
  console.log(`API Base URL: ${API_BASE_URL}\n`);

  let passed = 0;
  let failed = 0;
  const failures = [];

  async function test(name, fn) {
    try {
      await fn();
      console.log(`✅ ${name}`);
      passed++;
    } catch (error) {
      console.log(`❌ ${name}`);
      console.log(`   Error: ${error.message}`);
      failed++;
      failures.push({ name, error: error.message });
    }
  }

  // ========================================
  // 1. USER REGISTRATION AND LOGIN TESTS
  // ========================================
  console.log('📋 Testing User Registration and Login\n');

  await test('Register new user with valid credentials', async () => {
    const response = await makeRequest('POST', '/auth/register', {
      email: TEST_USER_EMAIL,
      password: TEST_USER_PASSWORD
    });

    if (response.statusCode !== 200 && response.statusCode !== 201) {
      throw new Error(`Expected 200/201, got ${response.statusCode}: ${JSON.stringify(response.body)}`);
    }

    if (!response.body.token) {
      throw new Error('No token returned in registration response');
    }

    authToken = response.body.token;
  });

  await test('Reject duplicate email registration', async () => {
    const response = await makeRequest('POST', '/auth/register', {
      email: TEST_USER_EMAIL,
      password: TEST_USER_PASSWORD
    });

    if (response.statusCode !== 400 && response.statusCode !== 409) {
      throw new Error(`Expected 400/409 for duplicate email, got ${response.statusCode}`);
    }
  });

  await test('Login with valid credentials', async () => {
    const response = await makeRequest('POST', '/auth/login', {
      email: TEST_USER_EMAIL,
      password: TEST_USER_PASSWORD
    });

    if (response.statusCode !== 200) {
      throw new Error(`Expected 200, got ${response.statusCode}: ${JSON.stringify(response.body)}`);
    }

    if (!response.body.token) {
      throw new Error('No token returned in login response');
    }

    authToken = response.body.token;
  });

  await test('Reject login with invalid password', async () => {
    const response = await makeRequest('POST', '/auth/login', {
      email: TEST_USER_EMAIL,
      password: 'WrongTestPassword123!'
    });

    if (response.statusCode !== 401) {
      throw new Error(`Expected 401 for invalid password, got ${response.statusCode}`);
    }
  });

  await test('Reject login with non-existent email', async () => {
    const response = await makeRequest('POST', '/auth/login', {
      email: 'nonexistent@example.com',
      password: TEST_USER_PASSWORD
    });

    if (response.statusCode !== 401 && response.statusCode !== 404) {
      throw new Error(`Expected 401/404 for non-existent user, got ${response.statusCode}`);
    }
  });

  // Register second user for cross-user access tests
  await test('Register second user for authorization tests', async () => {
    const response = await makeRequest('POST', '/auth/register', {
      email: TEST_USER_EMAIL_2,
      password: TEST_USER_PASSWORD
    });

    if (response.statusCode !== 200 && response.statusCode !== 201) {
      throw new Error(`Expected 200/201, got ${response.statusCode}`);
    }

    authToken2 = response.body.token;
  });

  // ========================================
  // 2. CATEGORY CRUD TESTS
  // ========================================
  console.log('\n📋 Testing Category CRUD Operations\n');

  await test('Create category with valid data', async () => {
    const response = await makeRequest('POST', '/categories', {
      name: 'Work',
      color: '#4CAF50'
    }, authToken);

    if (response.statusCode !== 200 && response.statusCode !== 201) {
      throw new Error(`Expected 200/201, got ${response.statusCode}: ${JSON.stringify(response.body)}`);
    }

    if (!response.body.category || !response.body.category.categoryId) {
      throw new Error('No category ID returned');
    }

    testCategoryId = response.body.category.categoryId;
  });

  await test('Get all categories for user', async () => {
    const response = await makeRequest('GET', '/categories', null, authToken);

    if (response.statusCode !== 200) {
      throw new Error(`Expected 200, got ${response.statusCode}`);
    }

    if (!Array.isArray(response.body.categories)) {
      throw new Error('Categories should be an array');
    }

    if (response.body.categories.length === 0) {
      throw new Error('Should have at least one category');
    }
  });

  await test('Update category with valid data', async () => {
    const response = await makeRequest('PUT', `/categories/${testCategoryId}`, {
      name: 'Work Updated',
      color: '#FF5722'
    }, authToken);

    if (response.statusCode !== 200) {
      throw new Error(`Expected 200, got ${response.statusCode}: ${JSON.stringify(response.body)}`);
    }

    if (response.body.category.name !== 'Work Updated') {
      throw new Error('Category name not updated');
    }
  });

  await test('Reject category access without authentication', async () => {
    const response = await makeRequest('GET', '/categories', null, null);

    if (response.statusCode !== 401) {
      throw new Error(`Expected 401 for unauthenticated request, got ${response.statusCode}`);
    }
  });

  await test('Reject category access with invalid token', async () => {
    const response = await makeRequest('GET', '/categories', null, 'invalid-token');

    if (response.statusCode !== 401 && response.statusCode !== 403) {
      throw new Error(`Expected 401/403 for invalid token, got ${response.statusCode}`);
    }
  });

  // ========================================
  // 3. TASK CRUD TESTS
  // ========================================
  console.log('\n📋 Testing Task CRUD Operations\n');

  await test('Create task with valid data', async () => {
    const response = await makeRequest('POST', '/tasks', {
      title: 'Test Task',
      description: 'This is a test task',
      categoryId: testCategoryId,
      priority: 'high',
      dueDate: '2025-12-15',
      dueTime: '14:00'
    }, authToken);

    if (response.statusCode !== 200 && response.statusCode !== 201) {
      throw new Error(`Expected 200/201, got ${response.statusCode}: ${JSON.stringify(response.body)}`);
    }

    if (!response.body.task || !response.body.task.taskId) {
      throw new Error('No task ID returned');
    }

    testTaskId = response.body.task.taskId;
  });

  await test('Get all tasks for user', async () => {
    const response = await makeRequest('GET', '/tasks', null, authToken);

    if (response.statusCode !== 200) {
      throw new Error(`Expected 200, got ${response.statusCode}`);
    }

    if (!Array.isArray(response.body.tasks)) {
      throw new Error('Tasks should be an array');
    }

    if (response.body.tasks.length === 0) {
      throw new Error('Should have at least one task');
    }
  });

  await test('Get tasks with date range filter', async () => {
    const response = await makeRequest('GET', '/tasks?startDate=2025-12-01&endDate=2025-12-31', null, authToken);

    if (response.statusCode !== 200) {
      throw new Error(`Expected 200, got ${response.statusCode}`);
    }

    if (!Array.isArray(response.body.tasks)) {
      throw new Error('Tasks should be an array');
    }
  });

  await test('Update task with valid data', async () => {
    const response = await makeRequest('PUT', `/tasks/${testTaskId}`, {
      title: 'Updated Test Task',
      priority: 'medium'
    }, authToken);

    if (response.statusCode !== 200) {
      throw new Error(`Expected 200, got ${response.statusCode}: ${JSON.stringify(response.body)}`);
    }

    if (response.body.task.title !== 'Updated Test Task') {
      throw new Error('Task title not updated');
    }
  });

  await test('Toggle task completion status', async () => {
    const response = await makeRequest('PATCH', `/tasks/${testTaskId}/toggle`, null, authToken);

    if (response.statusCode !== 200) {
      throw new Error(`Expected 200, got ${response.statusCode}: ${JSON.stringify(response.body)}`);
    }

    if (response.body.task.completed !== true) {
      throw new Error('Task should be marked as completed');
    }
  });

  await test('Toggle task completion status again', async () => {
    const response = await makeRequest('PATCH', `/tasks/${testTaskId}/toggle`, null, authToken);

    if (response.statusCode !== 200) {
      throw new Error(`Expected 200, got ${response.statusCode}`);
    }

    if (response.body.task.completed !== false) {
      throw new Error('Task should be marked as incomplete');
    }
  });

  await test('Reject task access without authentication', async () => {
    const response = await makeRequest('GET', '/tasks', null, null);

    if (response.statusCode !== 401) {
      throw new Error(`Expected 401 for unauthenticated request, got ${response.statusCode}`);
    }
  });

  await test('Reject cross-user task access', async () => {
    const response = await makeRequest('PUT', `/tasks/${testTaskId}`, {
      title: 'Unauthorized Update'
    }, authToken2);

    if (response.statusCode !== 403 && response.statusCode !== 404) {
      throw new Error(`Expected 403/404 for cross-user access, got ${response.statusCode}`);
    }
  });

  // ========================================
  // 4. RECURRING TASK TESTS
  // ========================================
  console.log('\n📋 Testing Recurring Tasks\n');

  await test('Create recurring task', async () => {
    const response = await makeRequest('POST', '/tasks', {
      title: 'Daily Standup',
      description: 'Team standup meeting',
      categoryId: testCategoryId,
      priority: 'high',
      dueDate: '2025-12-09',
      dueTime: '09:00',
      recurring: {
        enabled: true,
        days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
      }
    }, authToken);

    if (response.statusCode !== 200 && response.statusCode !== 201) {
      throw new Error(`Expected 200/201, got ${response.statusCode}: ${JSON.stringify(response.body)}`);
    }

    if (!response.body.task.recurring || !response.body.task.recurring.enabled) {
      throw new Error('Recurring configuration not saved');
    }

    recurringTaskId = response.body.task.taskId;
  });

  await test('Verify recurring task has correct configuration', async () => {
    const response = await makeRequest('GET', '/tasks', null, authToken);

    if (response.statusCode !== 200) {
      throw new Error(`Expected 200, got ${response.statusCode}`);
    }

    const recurringTask = response.body.tasks.find(t => t.taskId === recurringTaskId);
    
    if (!recurringTask) {
      throw new Error('Recurring task not found');
    }

    if (!recurringTask.recurring || !recurringTask.recurring.enabled) {
      throw new Error('Recurring configuration missing');
    }

    if (!Array.isArray(recurringTask.recurring.days) || recurringTask.recurring.days.length !== 5) {
      throw new Error('Recurring days not correctly saved');
    }
  });

  // ========================================
  // 5. ERROR HANDLING TESTS
  // ========================================
  console.log('\n📋 Testing Error Handling\n');

  await test('Reject task creation with missing required fields', async () => {
    const response = await makeRequest('POST', '/tasks', {
      description: 'Missing title and dueDate'
    }, authToken);

    if (response.statusCode !== 400) {
      throw new Error(`Expected 400 for missing required fields, got ${response.statusCode}`);
    }
  });

  await test('Reject category creation with missing required fields', async () => {
    const response = await makeRequest('POST', '/categories', {
      color: '#FF0000'
      // Missing name
    }, authToken);

    if (response.statusCode !== 400) {
      throw new Error(`Expected 400 for missing required fields, got ${response.statusCode}`);
    }
  });

  await test('Return 404 for non-existent task', async () => {
    const response = await makeRequest('GET', '/tasks/nonexistent-task-id', null, authToken);

    if (response.statusCode !== 404 && response.statusCode !== 400) {
      throw new Error(`Expected 404/400 for non-existent task, got ${response.statusCode}`);
    }
  });

  await test('Return 404 for non-existent category', async () => {
    const response = await makeRequest('DELETE', '/categories/nonexistent-category-id', null, authToken);

    if (response.statusCode !== 404 && response.statusCode !== 400) {
      throw new Error(`Expected 404/400 for non-existent category, got ${response.statusCode}`);
    }
  });

  // ========================================
  // 6. AI INSIGHTS END-TO-END TESTS
  // ========================================
  console.log('\n📋 Testing AI Insights End-to-End\n');

  // Create test tasks spanning 4 weeks for insights generation
  const testTasksForInsights = [];
  const today = new Date();
  
  await test('Create tasks spanning 4 weeks for insights', async () => {
    const tasksToCreate = [
      // Week 1 - High productivity
      { title: 'Week 1 Task 1', dueDate: getDateString(today, -28), completed: true, priority: 'high' },
      { title: 'Week 1 Task 2', dueDate: getDateString(today, -27), completed: true, priority: 'medium' },
      { title: 'Week 1 Task 3', dueDate: getDateString(today, -26), completed: true, priority: 'low' },
      { title: 'Week 1 Task 4', dueDate: getDateString(today, -25), completed: false, priority: 'high' },
      
      // Week 2 - Medium productivity
      { title: 'Week 2 Task 1', dueDate: getDateString(today, -21), completed: true, priority: 'high' },
      { title: 'Week 2 Task 2', dueDate: getDateString(today, -20), completed: false, priority: 'medium' },
      { title: 'Week 2 Task 3', dueDate: getDateString(today, -19), completed: true, priority: 'low' },
      
      // Week 3 - Low productivity
      { title: 'Week 3 Task 1', dueDate: getDateString(today, -14), completed: false, priority: 'high' },
      { title: 'Week 3 Task 2', dueDate: getDateString(today, -13), completed: false, priority: 'medium' },
      { title: 'Week 3 Task 3', dueDate: getDateString(today, -12), completed: true, priority: 'low' },
      
      // Week 4 - Recent tasks
      { title: 'Week 4 Task 1', dueDate: getDateString(today, -7), completed: true, priority: 'high' },
      { title: 'Week 4 Task 2', dueDate: getDateString(today, -6), completed: true, priority: 'medium' },
      { title: 'Week 4 Task 3', dueDate: getDateString(today, -5), completed: false, priority: 'low' },
      { title: 'Week 4 Task 4', dueDate: getDateString(today, -4), completed: true, priority: 'high' },
      { title: 'Week 4 Task 5', dueDate: getDateString(today, -3), completed: true, priority: 'medium' },
    ];

    for (const taskData of tasksToCreate) {
      const response = await makeRequest('POST', '/tasks', {
        title: taskData.title,
        description: 'Test task for insights generation',
        priority: taskData.priority,
        dueDate: taskData.dueDate,
        dueTime: '14:00'
      }, authToken);

      if (response.statusCode !== 200 && response.statusCode !== 201) {
        throw new Error(`Failed to create task: ${response.statusCode}`);
      }

      const taskId = response.body.task.taskId;
      testTasksForInsights.push(taskId);

      // Mark as completed if needed
      if (taskData.completed) {
        const toggleResponse = await makeRequest('PATCH', `/tasks/${taskId}/toggle`, null, authToken);
        if (toggleResponse.statusCode !== 200) {
          throw new Error(`Failed to toggle task completion: ${toggleResponse.statusCode}`);
        }
      }
    }

    if (testTasksForInsights.length !== tasksToCreate.length) {
      throw new Error(`Expected ${tasksToCreate.length} tasks, created ${testTasksForInsights.length}`);
    }
  });

  let generatedInsightTimestamp = null;

  await test('Generate insights via API', async () => {
    const response = await makeRequest('POST', '/insights/generate', null, authToken);

    if (response.statusCode !== 200) {
      throw new Error(`Expected 200, got ${response.statusCode}: ${JSON.stringify(response.body)}`);
    }

    if (!response.body.insight) {
      throw new Error('No insight returned in response');
    }

    const insight = response.body.insight;

    // Verify insight structure
    if (!insight.summary || typeof insight.summary !== 'string') {
      throw new Error('Insight missing or invalid summary');
    }

    if (!insight.patterns || typeof insight.patterns !== 'object') {
      throw new Error('Insight missing or invalid patterns');
    }

    if (!insight.recommendations || !Array.isArray(insight.recommendations)) {
      throw new Error('Insight missing or invalid recommendations');
    }

    // Verify patterns structure
    if (!insight.patterns.mostProductiveDay) {
      throw new Error('Patterns missing mostProductiveDay');
    }

    if (!insight.patterns.leastProductiveDay) {
      throw new Error('Patterns missing leastProductiveDay');
    }

    if (typeof insight.patterns.completionRate !== 'number') {
      throw new Error('Patterns missing or invalid completionRate');
    }

    if (typeof insight.patterns.averageTasksPerDay !== 'number') {
      throw new Error('Patterns missing or invalid averageTasksPerDay');
    }

    if (!insight.generatedAt) {
      throw new Error('Insight missing generatedAt timestamp');
    }

    generatedInsightTimestamp = insight.generatedAt;
    console.log(`   📊 Insight generated at: ${generatedInsightTimestamp}`);
    console.log(`   📈 Completion rate: ${(insight.patterns.completionRate * 100).toFixed(1)}%`);
    console.log(`   📅 Most productive day: ${insight.patterns.mostProductiveDay}`);
  });

  await test('Verify Bedrock was invoked (check insight quality)', async () => {
    // We can't directly check CloudWatch logs in the test, but we can verify
    // that the insight contains meaningful AI-generated content
    const response = await makeRequest('GET', '/insights', null, authToken);

    if (response.statusCode !== 200) {
      throw new Error(`Expected 200, got ${response.statusCode}`);
    }

    const insights = response.body.insights;
    if (!insights || insights.length === 0) {
      throw new Error('No insights found after generation');
    }

    const latestInsight = insights[0];

    // Verify the insight has meaningful content (not just empty strings)
    if (latestInsight.summary.length < 20) {
      throw new Error('Insight summary is too short - Bedrock may not have been invoked properly');
    }

    if (latestInsight.recommendations.length === 0) {
      throw new Error('No recommendations provided - Bedrock may not have been invoked properly');
    }

    // Verify recommendations are meaningful
    const hasShortRecommendation = latestInsight.recommendations.some(rec => rec.length < 10);
    if (hasShortRecommendation) {
      throw new Error('Recommendations are too short - Bedrock may not have been invoked properly');
    }

    console.log(`   ✅ Bedrock appears to have generated quality insights`);
    console.log(`   📝 Summary length: ${latestInsight.summary.length} characters`);
    console.log(`   💡 Recommendations count: ${latestInsight.recommendations.length}`);
  });

  await test('Retrieve past insights and verify chronological order', async () => {
    const response = await makeRequest('GET', '/insights', null, authToken);

    if (response.statusCode !== 200) {
      throw new Error(`Expected 200, got ${response.statusCode}`);
    }

    if (!Array.isArray(response.body.insights)) {
      throw new Error('Insights should be an array');
    }

    const insights = response.body.insights;

    if (insights.length === 0) {
      throw new Error('Should have at least one insight');
    }

    // Verify chronological order (newest first)
    for (let i = 0; i < insights.length - 1; i++) {
      const current = new Date(insights[i].generatedAt);
      const next = new Date(insights[i + 1].generatedAt);

      if (current < next) {
        throw new Error(`Insights not in chronological order: ${insights[i].generatedAt} should be after ${insights[i + 1].generatedAt}`);
      }
    }

    console.log(`   📚 Retrieved ${insights.length} insight(s) in correct chronological order`);
  });

  await test('Verify insight is stored in DynamoDB (by retrieving it)', async () => {
    const response = await makeRequest('GET', '/insights', null, authToken);

    if (response.statusCode !== 200) {
      throw new Error(`Expected 200, got ${response.statusCode}`);
    }

    const insights = response.body.insights;
    const matchingInsight = insights.find(i => i.generatedAt === generatedInsightTimestamp);

    if (!matchingInsight) {
      throw new Error('Generated insight not found in DynamoDB');
    }

    // Verify the insight has all required fields
    if (!matchingInsight.summary || !matchingInsight.patterns || !matchingInsight.recommendations) {
      throw new Error('Stored insight is missing required fields');
    }

    console.log(`   💾 Insight successfully stored and retrieved from DynamoDB`);
  });

  await test('Verify insights require JWT authorization', async () => {
    const response = await makeRequest('POST', '/insights/generate', null, null);

    if (response.statusCode !== 401) {
      throw new Error(`Expected 401 for unauthenticated request, got ${response.statusCode}`);
    }
  });

  await test('Verify GET insights requires JWT authorization', async () => {
    const response = await makeRequest('GET', '/insights', null, null);

    if (response.statusCode !== 401) {
      throw new Error(`Expected 401 for unauthenticated request, got ${response.statusCode}`);
    }
  });

  await test('Verify users cannot access other users insights', async () => {
    // User 2 should not see User 1's insights
    const response = await makeRequest('GET', '/insights', null, authToken2);

    if (response.statusCode !== 200) {
      throw new Error(`Expected 200, got ${response.statusCode}`);
    }

    // User 2 should have no insights (or only their own)
    const insights = response.body.insights;
    const hasUser1Insight = insights.some(i => i.generatedAt === generatedInsightTimestamp);

    if (hasUser1Insight) {
      throw new Error('User 2 can see User 1\'s insights - data isolation violated');
    }

    console.log(`   🔒 Data isolation verified - users can only see their own insights`);
  });

  // Clean up test tasks for insights
  await test('Clean up test tasks created for insights', async () => {
    let deletedCount = 0;
    for (const taskId of testTasksForInsights) {
      const response = await makeRequest('DELETE', `/tasks/${taskId}`, null, authToken);
      if (response.statusCode === 200 || response.statusCode === 204) {
        deletedCount++;
      }
    }

    if (deletedCount !== testTasksForInsights.length) {
      console.log(`   ⚠️  Warning: Only deleted ${deletedCount}/${testTasksForInsights.length} test tasks`);
    } else {
      console.log(`   🧹 Cleaned up ${deletedCount} test tasks`);
    }
  });

  // ========================================
  // 7. CLEANUP AND DELETE TESTS
  // ========================================
  console.log('\n📋 Testing Delete Operations\n');

  await test('Delete task', async () => {
    const response = await makeRequest('DELETE', `/tasks/${testTaskId}`, null, authToken);

    if (response.statusCode !== 200 && response.statusCode !== 204) {
      throw new Error(`Expected 200/204, got ${response.statusCode}: ${JSON.stringify(response.body)}`);
    }
  });

  await test('Verify task is deleted', async () => {
    const response = await makeRequest('GET', '/tasks', null, authToken);

    if (response.statusCode !== 200) {
      throw new Error(`Expected 200, got ${response.statusCode}`);
    }

    const deletedTask = response.body.tasks.find(t => t.taskId === testTaskId);
    
    if (deletedTask) {
      throw new Error('Task should be deleted');
    }
  });

  await test('Delete category', async () => {
    const response = await makeRequest('DELETE', `/categories/${testCategoryId}`, null, authToken);

    if (response.statusCode !== 200 && response.statusCode !== 204) {
      throw new Error(`Expected 200/204, got ${response.statusCode}: ${JSON.stringify(response.body)}`);
    }
  });

  await test('Verify category is deleted', async () => {
    const response = await makeRequest('GET', '/categories', null, authToken);

    if (response.statusCode !== 200) {
      throw new Error(`Expected 200, got ${response.statusCode}`);
    }

    const deletedCategory = response.body.categories.find(c => c.categoryId === testCategoryId);
    
    if (deletedCategory) {
      throw new Error('Category should be deleted');
    }
  });

  // ========================================
  // SUMMARY
  // ========================================
  console.log('\n' + '='.repeat(50));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(50));
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Total: ${passed + failed}`);
  console.log(`🎯 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  
  if (failures.length > 0) {
    console.log('\n❌ Failed Tests:');
    failures.forEach(({ name, error }) => {
      console.log(`   - ${name}`);
      console.log(`     ${error}`);
    });
  }

  console.log('\n' + '='.repeat(50));

  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch((error) => {
  console.error('Fatal error running tests:', error);
  process.exit(1);
});
