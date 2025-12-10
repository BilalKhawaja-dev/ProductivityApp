# ProductivityApp

A modern, full-stack productivity application with AI-powered insights, built using React and AWS serverless architecture.

## 🚀 Features

- **Task Management**: Create, edit, delete, and organize tasks with categories and priorities
- **Calendar View**: Visual calendar interface for task scheduling and planning
- **AI Insights**: Powered by AWS Bedrock (Claude 3 Sonnet) for productivity analytics
- **User Authentication**: Secure JWT-based authentication system
- **Multiple Themes**: Dark/Green, Pink/White, and Blue/White theme options
- **Responsive Design**: Mobile-first design that works on all devices
- **Real-time Updates**: Live task updates and notifications
- **Categories & Priorities**: Organize tasks with custom categories and priority levels

## 🏗️ Architecture

### Frontend
- **React 18** with Vite for fast development
- **Tailwind CSS** for responsive styling
- **React Router** for navigation
- **Axios** for API communication

### Backend
- **AWS Lambda** functions (Node.js 20.x)
- **API Gateway** for REST API endpoints
- **DynamoDB** for data storage
- **AWS Bedrock** for AI insights
- **JWT** for authentication

### Infrastructure
- **Terraform** for Infrastructure as Code
- **S3 + CloudFront** for frontend hosting
- **EventBridge** for scheduled tasks
- **SNS** for notifications
- **CloudWatch** for monitoring

## 🛠️ Getting Started

### Prerequisites
- Node.js 18+
- AWS CLI configured with appropriate permissions
- Terraform 1.0+

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/BilalKhawaja-dev/ProductivityApp.git
   cd ProductivityApp
   ```

2. **Install frontend dependencies**
   ```bash
   cd frontend
   npm install
   ```

3. **Configure environment variables**
   ```bash
   # Frontend
   cp frontend/.env.example frontend/.env
   # Edit frontend/.env with your API URL
   
   # Terraform
   cp terraform/terraform.tfvars.example terraform/terraform.tfvars
   # Edit terraform/terraform.tfvars with your settings
   ```

4. **Deploy infrastructure**
   ```bash
   cd terraform
   terraform init
   terraform plan
   terraform apply
   ```

5. **Deploy Lambda functions**
   ```bash
   ./deploy-lambdas.sh
   ```

6. **Build and deploy frontend**
   ```bash
   cd frontend
   npm run build
   # Sync to S3 (URL from terraform output)
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

## 🔧 Configuration

### Environment Variables

**Frontend (.env)**
```
VITE_API_BASE_URL=https://your-api-gateway-url.amazonaws.com/dev
```

**Terraform (terraform.tfvars)**
```
aws_region = "us-east-1"
environment = "dev"
dynamodb_table_name = "ProductivityApp-dev"
frontend_bucket_name = "productivity-app-frontend-dev-12345"
jwt_secret = "your-jwt-secret"
admin_email = "your-email@example.com"
```

## 🚀 Deployment

The application uses a serverless architecture deployed on AWS:

1. **Infrastructure**: Managed by Terraform
2. **Backend**: AWS Lambda functions behind API Gateway
3. **Frontend**: Static React app hosted on S3 + CloudFront
4. **Database**: DynamoDB for scalable data storage

## 🎨 Themes

The application supports three beautiful themes:
- **Dark Green**: Dark mode with green accents
- **Pink White**: Light mode with pink accents  
- **Blue White**: Light mode with blue accents

## 🤖 AI Features

Powered by AWS Bedrock (Claude 3 Sonnet):
- **Productivity Analytics**: Analyze task completion patterns
- **Insights Generation**: Get personalized productivity recommendations
- **Trend Analysis**: Understand your productivity trends over time

## 📱 Live Demo

🌐 **Live Application**: [https://d2a2hjsmnsvls.cloudfront.net](https://d2a2hjsmnsvls.cloudfront.net)

**Test Credentials:**
- Email: `user@test.com`
- Password: `Password123!`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- AWS for the serverless infrastructure
- Anthropic Claude for AI insights
- React and Tailwind CSS communities
- All contributors and testers