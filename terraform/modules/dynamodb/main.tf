# DynamoDB table for Productivity App
# Single-table design with PK/SK schema

resource "aws_dynamodb_table" "productivity_app" {
  name         = var.table_name
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "PK"
  range_key    = "SK"

  # Partition key
  attribute {
    name = "PK"
    type = "S"
  }

  # Sort key
  attribute {
    name = "SK"
    type = "S"
  }

  # Enable point-in-time recovery
  point_in_time_recovery {
    enabled = true
  }

  # Configure TTL on expiresAt attribute
  ttl {
    attribute_name = "expiresAt"
    enabled        = true
  }

  # Tags
  tags = {
    Name        = var.table_name
    Environment = var.environment
    Purpose     = "Single-table design for users tasks categories and insights"
  }
}
