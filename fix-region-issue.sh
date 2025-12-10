#!/bin/bash

echo "Fixing AWS SDK region configuration in all Lambda functions..."

# Fix DynamoDBClient
find backend/lambdas -name "*.js" -type f -exec grep -l "new DynamoDBClient({})" {} \; | while read file; do
    echo "Fixing DynamoDBClient in $file"
    sed -i 's/new DynamoDBClient({})/new DynamoDBClient({ region: process.env.AWS_REGION || '\''us-east-1'\'' })/g' "$file"
done

# Fix CloudWatchClient
find backend/lambdas -name "*.js" -type f -exec grep -l "new CloudWatchClient({})" {} \; | while read file; do
    echo "Fixing CloudWatchClient in $file"
    sed -i 's/new CloudWatchClient({})/new CloudWatchClient({ region: process.env.AWS_REGION || '\''us-east-1'\'' })/g' "$file"
done

# Fix SNSClient
find backend/lambdas -name "*.js" -type f -exec grep -l "new SNSClient({})" {} \; | while read file; do
    echo "Fixing SNSClient in $file"
    sed -i 's/new SNSClient({})/new SNSClient({ region: process.env.AWS_REGION || '\''us-east-1'\'' })/g' "$file"
done

echo "Region fix complete! Now deploying updated Lambda functions..."

# Deploy the fixed Lambda functions
./deploy-lambdas.sh

echo "All Lambda functions have been fixed and deployed!"