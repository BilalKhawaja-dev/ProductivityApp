# Personal Productivity App

A production-grade, serverless task management system built on AWS that demonstrates enterprise architecture patterns, cost optimization, and AI integration. This project showcases Solutions Architect capabilities through hands-on implementation of modern cloud-native applications.

## 🎯 Project Overview

The Personal Productivity App is a full-stack serverless application that helps users manage daily tasks with intelligent insights. Built entirely on AWS using Infrastructure as Code, it demonstrates production-ready architecture at a fraction of traditional costs ($3-5/month for 30 users).

### Key Features

- **Task Management**: Create, organize, and track tasks with custom categories and priorities
- **Recurring Tasks**: Automated task generation for routine activities with day-of-week selection
- **Smart Reminders**: Opt-in email/SMS notifications via Amazon SNS
- **AI-Powered Insights**: On-demand productivity analysis using Amazon Bedrock (Claude 3 Sonnet)
- **Calendar View**: Weekly and monthly task visualization
- **Multi-Theme UI**: Three responsive themes (Dark/Green, Pink/White, Blue/White)
- **Mobile-First Design**: Fully responsive interface optimized for all devices

## 🏗️ Architecture

<img width="728" height="863" alt="Productivity App drawio" src="https://github.com/user-attachments/assets/0d82bd2d-3a28-4b4e-8c84-cc5492305007" />


### Technology Stack

**Frontend**
- React 18 with Vite
- Tailwind CSS for styling
- React Router for client-side routing
- Hosted on S3 + CloudFront

**Backend**
- AWS Lambda (Node.js 18) for serverless compute
- API Gateway for RESTful endpoints
- DynamoDB single-table design for data persistence
- Amazon Bedrock for AI insights
- EventBridge for scheduling (recurring tasks, reminders, Lambda warming)
- SNS for email/SMS notifications

**Infrastructure**
- Terraform for Infrastructure as Code
- AWS CodePipeline for CI/CD
- CloudWatch for monitoring and alerting
- IAM for security and access control

### Architecture Diagram

```
┌─────────────────────────────────────────────────┐
│                Users (Web/Mobile)               │
└─────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────┐
│              CloudFront (CDN)                   │
│            - Global content delivery            │
│            - HTTPS enforcement                  │
└─────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────┐
│           S3 Bucket (Static Website)            │
│            - React SPA hosting                  │
│            - Versioning enabled                 │
└─────────────────────────────────────────────────┘
                         ↓ API Calls
┌─────────────────────────────────────────────────┐
│            API Gateway (REST API)               │
│            - JWT authorization                  │
│            - CORS configuration                 │
│            - Rate limiting                      │
└─────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────┐
│               Lambda Functions                  │
│    - Authentication (register, login, verify)  │
│    - Task CRUD operations                       │
│    - Category management                        │
│    - AI insights generation                     │
│    - Reminder scheduling                        │
│    - Recurring task processor                   │
└─────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────┐
│           DynamoDB (Single Table)               │
│            - User profiles                      │
│            - Tasks with categories              │
│            - AI insights (with TTL)             │
│            - On-demand billing                  │
└─────────────────────────────────────────────────┘
```

## 🔐 Security

- **Authentication**: Custom JWT implementation with bcrypt password hashing (10 salt rounds)
- **Authorization**: API Gateway Lambda authorizer validates JWT on all protected endpoints
- **Data Encryption**: Encryption at rest (DynamoDB) and in transit (HTTPS only)
- **Least Privilege IAM**: Each Lambda function has minimal required permissions
- **Rate Limiting**: Login endpoint limited to 5 attempts per 15 minutes
- **Input Validation**: All user inputs validated and sanitized
- **Secrets Management**: Sensitive data stored in environment variables, never in code

## 💰 Cost Optimization

**Monthly Cost Breakdown (30 users):**
- DynamoDB (on-demand): $1-2
- Lambda (within free tier): $0
- API Gateway (within free tier): $0
- S3 + CloudFront: $1
- Amazon Bedrock: $0.72
- SNS (email): $0
- SNS (SMS, optional): $0.20
- EventBridge: $0
- CloudWatch (within free tier): $0

**Total: $3-5/month**

### Cost Optimization Strategies

1. **Serverless-First Architecture**: Pay only for actual usage, scales to zero
2. **DynamoDB On-Demand**: No provisioned capacity, automatic scaling
3. **Single-Table Design**: Reduces DynamoDB costs and complexity
4. **Lambda Warming**: EventBridge warmer only during active hours (7 AM - 11 PM)
5. **TTL on AI Insights**: Automatic deletion after 30 days reduces storage costs
6. **CloudFront Caching**: Reduces S3 requests and improves performance
7. **Right-Sized Resources**: Lambda memory and timeout optimized per function

## 📊 AWS Well-Architected Framework Alignment

### Operational Excellence
- **Infrastructure as Code**: 100% Terraform-managed infrastructure
- **CI/CD Pipeline**: Automated deployment via CodePipeline
- **Monitoring**: CloudWatch dashboards with custom metrics
- **Logging**: Centralized logging with sanitized sensitive data

### Security
- **Identity and Access Management**: Least privilege IAM roles per Lambda
- **Data Protection**: Encryption at rest and in transit
- **Application Security**: JWT authentication, input validation, rate limiting
- **Audit Logging**: CloudWatch logs for all API calls and Lambda executions

### Reliability
- **Multi-AZ Deployment**: DynamoDB automatically replicates across AZs
- **Fault Isolation**: Serverless architecture eliminates single points of failure
- **Automated Recovery**: Lambda retries on failure, DynamoDB point-in-time recovery
- **Monitoring and Alerting**: CloudWatch alarms for critical failures

### Performance Efficiency
- **Serverless Compute**: Lambda scales automatically based on demand
- **Global Content Delivery**: CloudFront CDN for low-latency frontend delivery
- **Database Optimization**: Single-table DynamoDB design with efficient access patterns
- **Cold Start Mitigation**: EventBridge warmer during active hours

### Cost Optimization
- **Right-Sizing**: On-demand billing for all services
- **Serverless Architecture**: No idle resource costs
- **Cost Monitoring**: CloudWatch cost metrics and budget alerts
- **Resource Lifecycle**: TTL on temporary data (AI insights)

## 🚀 Getting Started

### Prerequisites

- AWS Account with appropriate permissions
- AWS CLI configured with credentials
- Terraform >= 1.5.0
- Node.js >= 18.0.0

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/BilalKhawaja-dev/ProductivityApp.git
   cd ProductivityApp
   ```

2. **Configure environment variables**
   ```bash
   # Terraform
   cp terraform/terraform.tfvars.example terraform/terraform.tfvars
   # Edit terraform/terraform.tfvars with your settings
   
   # Frontend
   cp frontend/.env.example frontend/.env
   # Edit frontend/.env with your API URL
   ```

3. **Deploy infrastructure**
   ```bash
   cd terraform
   terraform init
   terraform plan
   terraform apply
   ```

4. **Deploy Lambda functions**
   ```bash
   ./deploy-lambdas.sh
   ```

5. **Build and deploy frontend**
   ```bash
   cd frontend
   npm install
   npm run build
   # Upload to S3 (bucket name from terraform output)
   ```

## 📁 Project Structure

```
ProductivityApp/
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API service layer
│   │   ├── contexts/       # React contexts
│   │   └── utils/          # Utility functions
│   └── package.json
├── backend/
│   └── lambdas/            # AWS Lambda functions
│       ├── auth/           # Authentication functions
│       ├── tasks/          # Task management functions
│       ├── categories/     # Category management functions
│       ├── insights/       # AI insights functions
│       └── shared/         # Shared utilities
├── terraform/              # Infrastructure as Code
│   ├── modules/           # Terraform modules
│   └── main.tf           # Main configuration
└── README.md
```

## 🧪 Testing

**Backend Testing**
```bash
cd backend/tests
npm install
npm test                      # Unit tests
npm run test:integration      # Integration tests
```

**Frontend Testing**
```bash
cd frontend
npm test                      # Jest unit tests
```

**Manual Testing**
- Use Postman collection in `backend/tests/`
- Test authentication flow
- Test task CRUD operations
- Test AI insights generation

## 📈 Monitoring

**CloudWatch Dashboard**: Access via AWS Console → CloudWatch → Dashboards → ProductivityApp

**Key Metrics:**
- Lambda execution times (p50, p99)
- API Gateway request count and error rate
- DynamoDB read/write capacity
- Cost metrics
- User activity patterns

## 🔄 CI/CD Pipeline

**Automated Deployment:**
1. Push code to GitHub main branch
2. CodePipeline triggers automatically
3. Frontend: Build React app → Upload to S3 → Invalidate CloudFront
4. Backend: Package Lambda functions → Update function code
5. Infrastructure: Terraform plan → Manual approval → Apply

## 📱 Live Demo

🌐 **Live Application**: [https://d2a2hjsmnsvls.cloudfront.net](https://d2a2hjsmnsvls.cloudfront.net)

**Test Credentials:**
- Email: `user@test.com`
- Password: `Password123!`

## 📋 Solutions Architect Assessment

For a comprehensive technical assessment including detailed architecture analysis, AWS Well-Architected Framework alignment, cost optimization strategies, and scalability planning, see:

**[📄 Solutions Architect Technical Assessment](SOLUTIONS_ARCHITECT_ASSESSMENT.md)**

This document provides:
- Detailed architecture diagrams and component analysis
- Complete AWS Well-Architected Framework alignment across all 6 pillars
- Technical decision rationale and trade-off analysis
- Scalability analysis from 30 to 10,000+ users
- Cost optimization strategies with detailed breakdown
- Risk assessment and mitigation planning
- Disaster recovery and business continuity procedures
- Future enhancement roadmap

## 🎓 Learning Outcomes

This project demonstrates:
- **Serverless Architecture**: Building production applications without managing servers
- **Cost Optimization**: Achieving enterprise functionality at minimal cost
- **Infrastructure as Code**: Managing infrastructure with Terraform
- **AI Integration**: Leveraging Amazon Bedrock for intelligent features
- **Security Best Practices**: Implementing authentication, authorization, and encryption
- **Well-Architected Framework**: Aligning with AWS best practices across all pillars
- **CI/CD**: Automating deployment pipelines
- **Monitoring and Observability**: Implementing comprehensive monitoring

## 🤝 Contributing

This is a personal portfolio project, but feedback and suggestions are welcome!

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

MIT License - See LICENSE file for details

## 👤 Author

**Bilal Khawaja**
- AWS Solutions Architect Associate (SAA-C03)
- AWS Certified Cloud Practitioner (CCP)
- GitHub: [@BilalKhawaja-dev](https://github.com/BilalKhawaja-dev)

## 🙏 Acknowledgments

- AWS Well-Architected Framework documentation
- AWS Serverless Application Model (SAM) examples
- React and Vite communities
- Terraform AWS provider documentation
