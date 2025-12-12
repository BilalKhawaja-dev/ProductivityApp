# 🔐 Security Setup Guide

## ⚠️ CRITICAL: Secure Configuration Required

This repository contains placeholder values for security-sensitive configuration. You MUST replace these with secure values before deployment.

## 🚨 Required Actions Before Deployment

### 1. JWT Secret Configuration

**File**: `terraform/terraform.tfvars`

```bash
# INSECURE (current placeholder)
jwt_secret = "REPLACE_WITH_SECURE_SECRET_FROM_ENV"

# SECURE (generate a strong secret)
jwt_secret = "$(openssl rand -base64 32)"
```

**Generate a secure JWT secret:**
```bash
# Generate a 32-byte random secret
openssl rand -base64 32

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 2. AWS Account ID Replacement

**Files to update with your AWS Account ID:**
- `final-integration-test.sh`

Replace `YOUR_ACCOUNT_ID` with your actual AWS Account ID:
```bash
# Find your AWS Account ID
aws sts get-caller-identity --query Account --output text
```

### 3. API Gateway URL Configuration

**Files to update:**
- `final-integration-test.sh`
- `frontend/.env`

Replace `YOUR_API_GATEWAY_ID` with your actual API Gateway ID from Terraform outputs:
```bash
# Get API Gateway URL from Terraform
cd terraform
terraform output api_gateway_url
```

### 4. CloudFront Distribution URL

**Files to update:**
- `final-integration-test.sh`
- `README.md`
- `SOLUTIONS_ARCHITECT_ASSESSMENT.md`

Replace `YOUR_CLOUDFRONT_DISTRIBUTION` with your actual CloudFront distribution:
```bash
# Get CloudFront URL from Terraform
cd terraform
terraform output cloudfront_url
```

## 🛡️ Security Best Practices

### Environment Variables (Recommended)

Instead of hardcoding secrets in `terraform.tfvars`, use environment variables:

```bash
# Set environment variables
export TF_VAR_jwt_secret="$(openssl rand -base64 32)"
export TF_VAR_aws_region="us-east-1"

# Deploy without exposing secrets in files
terraform apply
```

### AWS Secrets Manager (Production)

For production deployments, use AWS Secrets Manager:

```hcl
# In terraform/main.tf
resource "aws_secretsmanager_secret" "jwt_secret" {
  name = "${var.environment}-jwt-secret"
}

resource "aws_secretsmanager_secret_version" "jwt_secret" {
  secret_id     = aws_secretsmanager_secret.jwt_secret.id
  secret_string = var.jwt_secret
}
```

## 🚫 Never Commit These Values

- JWT secrets
- AWS Account IDs
- API Gateway URLs
- CloudFront distribution IDs
- Any production credentials

## ✅ Safe to Commit

- Terraform configuration files (without secrets)
- Application code
- Documentation with placeholder values
- Example configuration files

## 🔍 Security Validation

Before committing, run this security check:

```bash
# Check for exposed secrets
grep -r "test-secret-key" .
grep -r "981686514879" .
grep -r "1blypvotid" .
grep -r "d2a2hjsmnsvls" .

# Should return no results
```

## 📞 Security Contact

If you discover any security vulnerabilities, please report them immediately.