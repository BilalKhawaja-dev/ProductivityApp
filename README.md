# Personal Productivity App (V1)

A serverless task + notes app on AWS with optional AI-generated insights (Amazon Bedrock). Built as a cost-conscious reference implementation and learning project.

## Features

- Task CRUD + categories
- Recurring tasks (EventBridge schedules)
- Optional reminders (SNS email/SMS)
- On-demand insights from recent activity (Bedrock)
- Calendar view
- Multi-theme UI

## Architecture

- **Frontend**: React (Vite) on S3 + CloudFront
- **API**: API Gateway + Lambda (Node.js)
- **Data**: DynamoDB (single-table design)
- **Async/Scheduling**: EventBridge
- **Notifications**: SNS
- **IaC**: Terraform

## Key decisions & tradeoffs

- **Serverless-first** to reduce ops overhead and scale with usage
- **DynamoDB single-table** to support predictable access patterns
- **Custom auth** due to build constraints; would move to Cognito for multi-tenant/SSO
- **AI insights are on-demand** to control cost and latency

## Repo structure

```
/terraform          # infrastructure
/backend            # Lambda functions  
/frontend           # React SPA
```

## Deploy

**Prerequisites**: AWS CLI, Terraform, Node 18+

```bash
# Infrastructure
cd terraform
terraform apply

# Lambda functions  
./deploy-lambdas.sh

# Frontend
cd frontend
npm run build
# Upload to S3 bucket from terraform output
```

## Deeper notes

See [docs/sa-assessment.md](docs/sa-assessment.md) for architecture rationale, risks, and scaling considerations.
