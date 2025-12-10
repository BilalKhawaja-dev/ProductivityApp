#!/bin/bash

# Setup script for Dual Repository CI/CD Pipeline
# GitHub (main repo) + CodeCommit (AWS deployment)
# This gives you the best of both worlds!

set -e

echo "🚀 Setting up Dual Repository CI/CD Pipeline"
echo "============================================="
echo "📋 GitHub: Main repository (portfolio/LinkedIn)"
echo "⚡ CodeCommit: AWS deployment pipeline"
echo ""

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

# Set up dual repository workflow
echo "🔗 Setting up dual repository workflow..."

# Ensure GitHub is the main origin
if git remote get-url origin &> /dev/null; then
    CURRENT_ORIGIN=$(git remote get-url origin)
    if [[ "$CURRENT_ORIGIN" != *"github.com"* ]]; then
        echo "   Renaming current origin to 'old-origin'..."
        git remote rename origin old-origin
    fi
fi

# Add GitHub as origin if not already set
if ! git remote get-url origin &> /dev/null; then
    echo "   Adding GitHub as origin (main repository)..."
    git remote add origin https://github.com/BilalKhawaja-dev/ProductivityApp.git
fi

# Add CodeCommit as deployment remote
if git remote get-url aws &> /dev/null; then
    echo "   Updating existing 'aws' remote..."
    git remote set-url aws "$CLONE_URL"
else
    echo "   Adding CodeCommit as 'aws' remote (deployment)..."
    git remote add aws "$CLONE_URL"
fi

# Configure git credential helper for CodeCommit
echo "🔧 Configuring AWS credentials for CodeCommit..."
git config credential.helper '!aws codecommit credential-helper $@'
git config credential.UseHttpPath true

# Push to both repositories
echo ""
echo "📤 Pushing code to both repositories..."
echo "   📋 Pushing to GitHub (main repository)..."
git push origin main

echo "   ⚡ Pushing to CodeCommit (triggers AWS deployment)..."
git push aws main

echo ""
echo "🎉 Dual Repository Setup Complete!"
echo ""
echo "📋 Repository Configuration:"
echo "   📋 GitHub (origin): Main repository for portfolio/LinkedIn"
echo "   ⚡ CodeCommit (aws): AWS deployment pipeline"
echo ""
echo "🔄 Workflow for future changes:"
echo "   1. Make your changes and commit normally"
echo "   2. Push to GitHub: git push origin main"
echo "   3. Deploy to AWS: git push aws main"
echo "   4. Or push to both: git push origin main && git push aws main"
echo ""
echo "📊 Monitor your AWS deployment:"
echo "   AWS Console → CodePipeline → View pipelines"
echo ""
echo "💰 Cost: ~$5/month for AWS CI/CD services"
echo ""
echo "🎯 Your live app: https://$(cd terraform && terraform output -raw cloudfront_domain_name)"
echo ""
echo "✨ Benefits:"
echo "   📋 GitHub: Perfect for portfolio and LinkedIn showcase"
echo "   ⚡ CodeCommit: Seamless AWS deployment without tokens"
echo "   🔄 Dual workflow: Best of both worlds!"