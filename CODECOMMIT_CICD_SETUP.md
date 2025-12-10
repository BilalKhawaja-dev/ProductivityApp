# AWS CodeCommit CI/CD Setup

## 🎯 **Solution: No GitHub Token Required!**

I've updated the CI/CD pipeline to use **AWS CodeCommit** instead of GitHub, eliminating the need for personal access tokens.

## 🏗️ **What's Included**

### **AWS Services Used:**
✅ **AWS CodeCommit** - Git repository hosting  
✅ **AWS CodePipeline** - CI/CD orchestration  
✅ **AWS CodeBuild** - Build and deployment  
✅ **AWS S3** - Artifact storage and frontend hosting  
✅ **AWS CloudFront** - CDN with cache invalidation  
✅ **AWS SNS** - Failure notifications  

### **Three Pipelines:**
1. **Frontend Pipeline**: React build → S3 → CloudFront invalidation
2. **Backend Pipeline**: Lambda packaging → Function updates
3. **Infrastructure Pipeline**: Terraform plan → Manual approval → Apply

## 🚀 **Quick Setup (2 minutes)**

### **Option A: Automated Setup**
```bash
# Run the setup script (recommended)
./setup-codecommit.sh
```

### **Option B: Manual Setup**
```bash
# 1. Deploy CI/CD infrastructure
cd terraform
terraform apply -var="enable_cicd=true" -var="use_codecommit=true"

# 2. Get repository details
REPO_URL=$(terraform output -raw codecommit_clone_url_http)

# 3. Add CodeCommit remote and push
cd ..
git remote add codecommit $REPO_URL
git config credential.helper '!aws codecommit credential-helper $@'
git config credential.UseHttpPath true
git push codecommit main
```

## 🔄 **How It Works**

### **Automatic Deployment:**
1. **Push code**: `git push codecommit main`
2. **Pipeline triggers**: Automatically starts build
3. **Frontend deploys**: React app builds and deploys to S3
4. **Backend deploys**: Lambda functions update automatically
5. **Cache invalidation**: CloudFront cache clears
6. **Notification**: SNS alert on success/failure

### **No Tokens Required:**
- Uses AWS IAM roles and credentials
- No GitHub personal access tokens
- No external service dependencies
- Fully AWS native solution

## 💰 **Cost Breakdown**

| Service | Monthly Cost |
|---------|-------------|
| CodeCommit | $1.00 (5 users) |
| CodePipeline | $3.00 (3 pipelines) |
| CodeBuild | $0.50 (20 builds) |
| S3 Storage | $0.50 (artifacts) |
| **Total** | **~$5.00/month** |

## 🔧 **Configuration**

### **Current Settings:**
```hcl
# terraform/terraform.tfvars
enable_cicd    = true
use_codecommit = true
github_branch  = "main"  # Branch to track
```

### **Repository Details:**
- **Name**: `dev-productivity-app`
- **Region**: `us-east-1`
- **Branch**: `main` (triggers pipeline)

## 📊 **Monitoring**

### **AWS Console Locations:**
- **Pipelines**: CodePipeline → View all pipelines
- **Repository**: CodeCommit → Repositories
- **Build Logs**: CodeBuild → Build history
- **Notifications**: SNS → Topics

### **Pipeline Status:**
- ✅ **Success**: App deployed automatically
- ❌ **Failure**: SNS notification sent
- ⏳ **In Progress**: Check CodePipeline console

## 🎯 **Benefits Over GitHub**

| Feature | GitHub + Token | CodeCommit |
|---------|---------------|------------|
| **Setup** | Complex (token required) | Simple (AWS credentials) |
| **Security** | External token | IAM roles |
| **Cost** | GitHub + AWS | AWS only |
| **Integration** | Third-party | Native AWS |
| **Maintenance** | Token rotation | Zero maintenance |

## 🔄 **Migration from GitHub**

If you were using GitHub before:

```bash
# Keep GitHub as backup
git remote rename origin github

# Add CodeCommit as primary
git remote add codecommit <CODECOMMIT_URL>

# Push to both (optional)
git push github main      # Backup to GitHub
git push codecommit main  # Deploy via CodeCommit
```

## 🚨 **Important Notes**

### **AWS Credentials Required:**
- Ensure AWS CLI is configured: `aws configure`
- CodeCommit uses your AWS credentials automatically
- No additional tokens or keys needed

### **First Push:**
- The first push to CodeCommit will trigger all pipelines
- Frontend deployment takes ~3-5 minutes
- Backend deployment takes ~2-3 minutes
- Monitor progress in AWS Console

### **Branch Strategy:**
- Only `main` branch triggers pipelines
- Other branches can be pushed but won't deploy
- Change branch in `terraform.tfvars` if needed

## 🎉 **Result**

After setup:
1. **Your UI fixes are automatically deployed** 🎨
2. **No more manual deployments needed** ⚡
3. **Professional CI/CD pipeline** 🏗️
4. **AWS native solution** ☁️
5. **Cost-effective** 💰

## 🔧 **Troubleshooting**

### **Common Issues:**

**"Permission denied" on push:**
```bash
# Reconfigure git credentials
git config credential.helper '!aws codecommit credential-helper $@'
git config credential.UseHttpPath true
```

**"Repository not found":**
```bash
# Check if infrastructure deployed
cd terraform
terraform output codecommit_repository_name
```

**Pipeline not triggering:**
```bash
# Check pipeline status
aws codepipeline get-pipeline-state --name dev-frontend-pipeline
```

## 📞 **Support**

If you encounter issues:
1. Check AWS Console → CodePipeline for pipeline status
2. Check AWS Console → CodeBuild for build logs
3. Verify AWS credentials: `aws sts get-caller-identity`
4. Check repository exists: `aws codecommit list-repositories`

---

**Ready to deploy your UI fixes automatically? Run `./setup-codecommit.sh` now!** 🚀