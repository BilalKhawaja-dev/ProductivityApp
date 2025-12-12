# 🚨 EMERGENCY SECURITY CLEANUP REQUIRED

## CRITICAL SECURITY BREACH DETECTED

Your repository has exposed sensitive AWS infrastructure details including:
- AWS Account ID: 981686514879
- API Gateway ID: 1blypvotid  
- CloudFront Distribution: d2a2hjsmnsvls

## IMMEDIATE ACTIONS REQUIRED

### 1. ROTATE ALL AWS RESOURCES (CRITICAL)

**API Gateway:**
```bash
# Delete and recreate API Gateway
aws apigateway delete-rest-api --rest-api-id 1blypvotid --region us-east-1
# Redeploy with Terraform to get new ID
cd terraform && terraform destroy -target=module.api_gateway && terraform apply
```

**CloudFront Distribution:**
```bash
# Consider recreating CloudFront distribution for new domain
# This will change your public URL
```

**JWT Secret:**
```bash
# Generate new JWT secret immediately
openssl rand -base64 32
# Update terraform.tfvars with new secret
# Redeploy all Lambda functions
```

### 2. AUDIT AWS ACCOUNT

**Check CloudTrail:**
```bash
# Review recent API calls for suspicious activity
aws logs filter-log-events --log-group-name CloudTrail/APIGateway --region us-east-1
```

**Review IAM:**
```bash
# Check for unauthorized users or roles
aws iam list-users
aws iam list-roles --query 'Roles[?contains(RoleName, `productivity`)]'
```

### 3. SECURITY MONITORING

**Enable GuardDuty:**
```bash
aws guardduty create-detector --enable --region us-east-1
```

**Set up CloudTrail alerts:**
- Monitor API Gateway access
- Alert on unusual DynamoDB access patterns
- Watch for Lambda function modifications

### 4. REPOSITORY CLEANUP

**Remove sensitive files from git history:**
```bash
# Use BFG Repo-Cleaner to remove sensitive data from git history
git filter-branch --force --index-filter 'git rm --cached --ignore-unmatch terraform/terraform.tfstate*' --prune-empty --tag-name-filter cat -- --all
```

**Force push cleaned repository:**
```bash
git push origin --force --all
```

## PREVENTION MEASURES

1. **Never commit terraform.tfstate files**
2. **Use remote state backend (S3 + DynamoDB)**
3. **Implement pre-commit hooks for secret scanning**
4. **Use AWS Secrets Manager for all secrets**
5. **Enable AWS Config for compliance monitoring**

## COST IMPACT

Rotating these resources may incur costs:
- New API Gateway: ~$0
- New CloudFront distribution: ~$0 
- Potential downtime during rotation

## TIMELINE

- **Immediate (0-1 hour)**: Rotate JWT secret, audit access
- **Within 24 hours**: Rotate API Gateway and CloudFront
- **Within 48 hours**: Complete security audit and monitoring setup

## CONTACT

If you suspect unauthorized access, contact AWS Support immediately.