#!/bin/bash

# Setup script for AWS CodeCommit CI/CD Pipeline
# This script helps migrate from GitHub to CodeCommit for the Productivity App

set -e

echo "🚀 Setting up AWS CodeCommit CI/CD Pipeline"
echo "============================================="

# Check if AWS CLI is configured
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ AWS CLI not configured. Please run 'aws configure' first."
    exit 1
fi

echo "✅ AWS CLI configured"

# Deploy the CI/CD infrastructure
echo ""
echo "📦 Deploying CI/CD infrastructure..."
cd terraform

# Initialize terraform if needed
if [ ! -d ".terraform" ]; then
    echo "🔧 Initializing Terraform..."
    terraform init
fi

# Plan the deployment
echo "📋 Planning deployment..."
terraform plan -var="enable_cicd=true" -var="use_codecommit=true"

# Ask for confirmation
echo ""
read -p "🤔 Do you want to apply these changes? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Deployment cancelled"
    exit 1
fi

# Apply the changes
echo "🚀 Deploying infrastructure..."
terraform apply -var="enable_cicd=true" -var="use_codecommit=true" -auto-approve

# Get the CodeCommit repository details
REPO_NAME=$(terraform output -raw codecommit_repository_name 2>/dev/null || echo "")
CLONE_URL=$(terraform output -raw codecommit_clone_url_http 2>/dev/null || echo "")

if [ -z "$REPO_NAME" ]; then
    echo "❌ Failed to get CodeCommit repository details"
    exit 1
fi

echo ""
echo "✅ CI/CD Infrastructure deployed successfully!"
echo ""
echo "📋 CodeCommit Repository Details:"
echo "   Repository Name: $REPO_NAME"
echo "   Clone URL: $CLONE_URL"
echo ""

# Go back to project root
cd ..

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    echo "❌ Not in a git repository. Please run this script from the project root."
    exit 1
fi

# Add CodeCommit as a remote
echo "🔗 Adding CodeCommit as remote repository..."
if git remote get-url codecommit &> /dev/null; then
    echo "   Updating existing codecommit remote..."
    git remote set-url codecommit "$CLONE_URL"
else
    echo "   Adding new codecommit remote..."
    git remote add codecommit "$CLONE_URL"
fi

# Push current code to CodeCommit
echo ""
echo "📤 Pushing code to CodeCommit..."
echo "   Note: This will trigger the CI/CD pipeline automatically!"

# Configure git credential helper for CodeCommit
git config credential.helper '!aws codecommit credential-helper $@'
git config credential.UseHttpPath true

# Push to CodeCommit
git push codecommit main

echo ""
echo "🎉 Setup Complete!"
echo ""
echo "📋 What happens next:"
echo "   1. Your code is now in AWS CodeCommit"
echo "   2. The CI/CD pipeline will automatically build and deploy"
echo "   3. Check AWS Console → CodePipeline to monitor progress"
echo "   4. Your app will be updated in ~5 minutes"
echo ""
echo "🔧 Future deployments:"
echo "   Just push to CodeCommit: git push codecommit main"
echo ""
echo "📊 Monitor your pipelines:"
echo "   AWS Console → CodePipeline → View pipelines"
echo ""
echo "💰 Cost: ~$4.50/month for CI/CD services"
echo ""
echo "🎯 Your live app: https://$(cd terraform && terraform output -raw cloudfront_domain_name)"