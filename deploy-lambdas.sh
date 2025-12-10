#!/bin/bash

# Script to package and deploy Lambda functions with shared dependencies

set -e

echo "Packaging Lambda functions with shared dependencies..."

# Create temporary directory for packaging
TEMP_DIR=$(mktemp -d)
echo "Using temp directory: $TEMP_DIR"

# Function to package a Lambda function
package_lambda() {
    local LAMBDA_DIR=$1
    local LAMBDA_NAME=$2
    local HANDLER_FILE=$3
    
    echo "Packaging $LAMBDA_NAME..."
    
    # Create package directory
    PKG_DIR="$TEMP_DIR/$LAMBDA_NAME"
    mkdir -p "$PKG_DIR"
    
    # Copy Lambda function file and fix import paths
    sed 's|../shared/|./shared/|g' "$LAMBDA_DIR/$HANDLER_FILE" > "$PKG_DIR/$HANDLER_FILE"
    
    # Copy shared folder
    cp -r backend/lambdas/shared "$PKG_DIR/"
    
    # Copy node_modules if they exist
    if [ -d "$LAMBDA_DIR/node_modules" ]; then
        cp -r "$LAMBDA_DIR/node_modules" "$PKG_DIR/"
    fi
    
    # Copy package.json if it exists
    if [ -f "$LAMBDA_DIR/package.json" ]; then
        cp "$LAMBDA_DIR/package.json" "$PKG_DIR/"
    fi
    
    # Create ZIP file
    cd "$PKG_DIR"
    zip -r "$LAMBDA_NAME.zip" . > /dev/null
    cd - > /dev/null
    
    # Update Lambda function
    echo "Updating Lambda function: $LAMBDA_NAME..."
    aws lambda update-function-code \
        --function-name "dev-$LAMBDA_NAME" \
        --zip-file "fileb://$PKG_DIR/$LAMBDA_NAME.zip" \
        --region us-east-1 > /dev/null
    
    echo "✓ $LAMBDA_NAME updated"
}

# Package and deploy auth Lambda functions
package_lambda "backend/lambdas/auth" "registerUser" "registerUser.js"
package_lambda "backend/lambdas/auth" "loginUser" "loginUser.js"
package_lambda "backend/lambdas/auth" "verifyToken" "verifyToken.js"
package_lambda "backend/lambdas/auth" "updateUserPreferences" "updateUserPreferences.js"

# Package and deploy task Lambda functions
package_lambda "backend/lambdas/tasks" "createTask" "createTask.js"
package_lambda "backend/lambdas/tasks" "getTasks" "getTasks.js"
package_lambda "backend/lambdas/tasks" "updateTask" "updateTask.js"
package_lambda "backend/lambdas/tasks" "deleteTask" "deleteTask.js"
package_lambda "backend/lambdas/tasks" "toggleTaskComplete" "toggleTaskComplete.js"

# Package and deploy category Lambda functions
package_lambda "backend/lambdas/categories" "createCategory" "createCategory.js"
package_lambda "backend/lambdas/categories" "getCategories" "getCategories.js"
package_lambda "backend/lambdas/categories" "updateCategory" "updateCategory.js"
package_lambda "backend/lambdas/categories" "deleteCategory" "deleteCategory.js"

# Package and deploy insight Lambda functions
package_lambda "backend/lambdas/insights" "generateInsights" "generateInsights.js"
package_lambda "backend/lambdas/insights" "getInsights" "getInsights.js"

# Package and deploy reminder Lambda functions
package_lambda "backend/lambdas/reminders" "scheduleReminder" "scheduleReminder.js"
package_lambda "backend/lambdas/reminders" "sendReminder" "sendReminder.js"

# Package and deploy recurring tasks Lambda function
package_lambda "backend/lambdas/recurring" "processRecurringTasks" "processRecurringTasks.js"

# Package and deploy reports Lambda function
package_lambda "backend/lambdas/reports" "generateWeeklyReport" "generateWeeklyReport.js"

# Package and deploy warmer Lambda function
package_lambda "backend/lambdas/warmer" "warmLambda" "warmLambda.js"

# Cleanup
rm -rf "$TEMP_DIR"

echo ""
echo "✓ All Lambda functions updated successfully!"
echo ""
echo "Waiting for functions to be ready..."
sleep 5

echo "✓ Lambda deployment complete!"
