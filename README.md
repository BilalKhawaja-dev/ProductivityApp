# Personal Productivity App — Serverless Security Patterns on AWS

Serverless task and notes application on AWS demonstrating cost-conscious, security-aware architecture with Terraform. Includes an [SA assessment document](docs/sa-assessment.md) that articulates tradeoffs, risks, scaling considerations, and production hardening recommendations — the kind of analysis an SA does day-to-day.

## Architecture

<img width="742" height="875" alt="image" src="https://github.com/user-attachments/assets/2128018e-c3ec-43f8-ba95-91ea677fdbe7" />

```
CloudFront → S3 (React SPA)
     ↓
API Gateway → Lambda (Node.js) → DynamoDB (single-table)
     ↓              ↓
Rate Limiting    EventBridge (recurring tasks)
                    ↓
                 SNS (notifications)
                 Bedrock (on-demand AI insights)
```

## Security Controls

| Control | Implementation |
|---------|---------------|
| Authentication | JWT + bcrypt (custom auth; Cognito recommended for production) |
| Authorization | Per-user data isolation in DynamoDB |
| Rate Limiting | API Gateway throttling to prevent abuse and cost runaway |
| Input Validation | Server-side validation on all Lambda handlers |
| Encryption at Rest | DynamoDB encryption enabled |
| Encryption in Transit | HTTPS via CloudFront + API Gateway |
| IAM | Least-privilege Lambda execution roles |
| Data Recovery | DynamoDB point-in-time recovery enabled |
| Cost Protection | Per-user Bedrock limits, budget alerts, monitoring |

## SA Assessment Highlights

The [SA assessment](docs/sa-assessment.md) covers:

- **Architecture decisions with tradeoffs**: serverless-first (cold starts vs ops simplicity), single-table DynamoDB (query flexibility vs performance), custom auth (build speed vs production readiness)
- **Risk assessment**: cold starts, rate limiting gaps, data loss scenarios, cost runaway from AI services — each with current mitigation and production recommendation
- **Scaling analysis**: what changes at 100, 1K, 10K, and 10K+ users (provisioned concurrency, Aurora Serverless, multi-region, microservices split)
- **Production hardening roadmap**: Cognito migration, WAF, X-Ray tracing, load testing, multi-region replication, blue/green deployments, audit logging

## Features

- Task CRUD with categories
- Recurring tasks via EventBridge schedules
- Optional email/SMS reminders (SNS)
- On-demand AI insights from recent activity (Bedrock)
- Calendar view
- Multi-theme UI

## Tech Stack

- **Frontend**: React (Vite) on S3 + CloudFront
- **API**: API Gateway + Lambda (Node.js)
- **Data**: DynamoDB (single-table design)
- **Scheduling**: EventBridge
- **Notifications**: SNS
- **AI**: Amazon Bedrock (on-demand)
- **IaC**: Terraform

## Deployment

```bash
# Infrastructure
cd terraform && terraform apply

# Lambda functions
./deploy-lambdas.sh

# Frontend
cd frontend && npm run build
# Upload dist/ to S3 bucket from terraform output
```

Requires: AWS CLI configured, Terraform, Node.js 18+

## Project Structure

```
├── terraform/      # All infrastructure (API Gateway, Lambda, DynamoDB, CloudFront, SNS, EventBridge)
├── backend/        # Lambda function code + tests
├── frontend/       # React SPA (Vite)
└── docs/
    └── sa-assessment.md  # Architecture rationale, risks, scaling plan
```

## What This Demonstrates

- Designing serverless architectures with security and cost awareness from day one
- Articulating architecture tradeoffs, risks, and scaling paths (SA core skill)
- Implementing practical security controls (auth, rate limiting, encryption, least-privilege IAM)
- Thinking about production readiness: what's good enough for V1 vs what needs to change at scale
