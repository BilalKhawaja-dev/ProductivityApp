# S3 and CloudFront Module

This module creates the infrastructure for hosting the React frontend application.

## Resources Created

### S3 Bucket
- **Purpose**: Stores the compiled React application (HTML, CSS, JS, assets)
- **Versioning**: Enabled for rollback capability
- **Public Access**: Blocked (only CloudFront can access)
- **Website Hosting**: Configured with index.html as default and error document

### CloudFront Distribution
- **Purpose**: Content Delivery Network (CDN) for fast global access
- **HTTPS**: Enforced (redirects HTTP to HTTPS)
- **Caching**: 1 hour default TTL, 24 hours max
- **SPA Support**: 404 and 403 errors redirect to index.html for client-side routing
- **Origin**: S3 bucket via Origin Access Identity (OAI)
- **Price Class**: PriceClass_100 (North America and Europe only for cost optimization)

### Origin Access Identity (OAI)
- **Purpose**: Allows CloudFront to access private S3 bucket
- **Security**: S3 bucket policy only allows access from CloudFront

## Inputs

| Variable | Description | Type | Required |
|----------|-------------|------|----------|
| environment | Environment name (dev, staging, prod) | string | Yes |
| bucket_name | S3 bucket name for frontend | string | Yes |

## Outputs

| Output | Description |
|--------|-------------|
| bucket_name | S3 bucket name |
| bucket_arn | S3 bucket ARN |
| cloudfront_url | Full CloudFront URL (https://...) |
| cloudfront_distribution_id | CloudFront distribution ID (for cache invalidation) |
| cloudfront_domain_name | CloudFront domain name |

## Usage

```hcl
module "s3_cloudfront" {
  source = "./modules/s3-cloudfront"

  environment = "dev"
  bucket_name = "productivity-app-frontend-dev"
}
```

## Deployment Process

1. **Build Frontend**: Run `npm run build` in the frontend directory
2. **Upload to S3**: Use AWS CLI or Terraform to upload dist/ contents to S3
3. **Invalidate Cache**: Create CloudFront invalidation for updated files

Example deployment commands:
```bash
# Build frontend
cd frontend
npm run build

# Upload to S3
aws s3 sync dist/ s3://productivity-app-frontend-dev/ --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id <DISTRIBUTION_ID> \
  --paths "/*"
```

## Security Features

- **No Public S3 Access**: Bucket is completely private
- **HTTPS Only**: All traffic is encrypted
- **Origin Access Identity**: CloudFront uses IAM-based access to S3
- **Bucket Policy**: Explicitly allows only CloudFront OAI

## Cost Optimization

- **On-Demand Pricing**: No upfront costs
- **PriceClass_100**: Uses only North America and Europe edge locations
- **Compression**: Enabled to reduce data transfer costs
- **Caching**: Reduces origin requests to S3

## Client-Side Routing Support

The CloudFront distribution is configured to support React Router:
- 404 errors return index.html with 200 status
- 403 errors return index.html with 200 status
- This allows direct URL access to any route in the SPA

## Requirements Satisfied

- **12.7**: Infrastructure as Code for frontend hosting
  - S3 bucket with versioning and website hosting
  - CloudFront distribution with HTTPS
  - Origin Access Identity for security
  - SPA routing support
