# QuckApp Deployment Guide

Complete guide for building and deploying QuckApp locally and on AWS production.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Local Development Setup](#part-1-local-development-setup)
3. [AWS Production Deployment](#part-2-aws-production-deployment)
4. [CI/CD Pipeline](#part-3-cicd-pipeline)
5. [Monitoring & Logging](#part-4-monitoring--logging)
6. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              PRODUCTION (AWS)                                │
│                                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │    ECS      │  │    ECS      │  │    ECS      │  │    ALB      │        │
│  │  NestJS     │  │  Spring     │  │   Elixir    │  │   Load      │        │
│  │  Backend    │  │   Auth      │  │  Realtime   │  │  Balancer   │        │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │
│         │                │                │                │                │
│         └────────────────┴────────────────┴────────────────┘                │
│                                   │                                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │ MongoDB     │  │    RDS      │  │ ElastiCache │  │    MSK      │        │
│  │  Atlas      │  │ PostgreSQL  │  │   Redis     │  │   Kafka     │        │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                         │
│  │     S3      │  │ CloudFront  │  │    ECR      │                         │
│  │   Storage   │  │     CDN     │  │  Registry   │                         │
│  └─────────────┘  └─────────────┘  └─────────────┘                         │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Part 1: Local Development Setup

### Prerequisites

```bash
# Required software
- Node.js 20+           (https://nodejs.org/)
- Java 21               (https://adoptium.net/)
- Elixir 1.15+          (https://elixir-lang.org/)
- Docker Desktop        (https://docker.com/)
- Git                   (https://git-scm.com/)
```

### Step 1: Clone and Setup

```bash
# Clone repository
git clone https://github.com/your-org/quckapp.git
cd quckapp

# Install dependencies for each service
cd backend && npm install && cd ..
cd auth-service && ./mvnw dependency:resolve && cd ..
cd realtime && mix deps.get && cd ..
cd web && npm install && cd ..
cd mobile && npm install && cd ..
```

### Step 2: Environment Configuration

Create `.env` files for each service:

```bash
# Backend (.env)
cp backend/.env.example backend/.env

# Auth Service (use application-local.yml)
cp auth-service/src/main/resources/application-local.yml.example \
   auth-service/src/main/resources/application-local.yml

# Realtime
cp realtime/.env.example realtime/.env
```

Edit the `.env` files with your configuration:

```bash
# backend/.env
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://localhost:27017/quckapp
JWT_SECRET=your-dev-secret-key
USE_SPRING_AUTH=true
SPRING_AUTH_SERVICE_URL=http://localhost:8081/api/auth
KAFKA_BROKERS=localhost:29092
REDIS_HOST=localhost
```

### Step 3: Start with Docker Compose (Recommended)

```bash
# Start all infrastructure services
docker-compose up -d

# View logs
docker-compose logs -f

# Start with debug tools (Kafka UI, Redis Commander)
docker-compose --profile debug up -d
```

**Service URLs:**
| Service | URL |
|---------|-----|
| NestJS Backend | http://localhost:3000 |
| Spring Auth | http://localhost:8081 |
| Elixir Realtime | http://localhost:4000 |
| Kafka UI | http://localhost:8080 |
| Redis Commander | http://localhost:8082 |

### Step 4: Run Services Individually (For Development)

```bash
# Terminal 1: Start infrastructure only
docker-compose up -d mongodb postgres mysql redis zookeeper kafka

# Terminal 2: NestJS Backend
cd backend
npm run start:dev

# Terminal 3: Spring Boot Auth
cd auth-service
./mvnw spring-boot:run -Dspring-boot.run.profiles=local

# Terminal 4: Elixir Realtime
cd realtime
mix phx.server

# Terminal 5: React Web
cd web
npm run dev

# Terminal 6: React Native Mobile
cd mobile
npx expo start
```

### Step 5: Verify Setup

```bash
# Check all services are healthy
curl http://localhost:3000/health        # Backend
curl http://localhost:8081/api/auth/actuator/health  # Auth
curl http://localhost:4000/health        # Realtime

# Check Spring Auth integration
curl http://localhost:3000/api/v1/auth/spring-health
```

---

## Part 2: AWS Production Deployment

### Prerequisites

```bash
# Install AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip && sudo ./aws/install

# Install Terraform
brew install terraform  # macOS
# or download from https://terraform.io

# Configure AWS credentials
aws configure
# Enter: AWS Access Key ID, Secret Access Key, Region (us-east-1)
```

### Step 1: Setup MongoDB Atlas

1. Go to https://cloud.mongodb.com
2. Create a new cluster (M10 or higher for production)
3. Configure network access (add AWS VPC CIDR)
4. Create database user
5. Get connection string:

```
mongodb+srv://username:password@cluster.mongodb.net/quckapp?retryWrites=true&w=majority
```

### Step 2: Create AWS Secrets

```bash
# Store secrets in AWS Secrets Manager
aws secretsmanager create-secret \
  --name quckapp/production/mongodb-uri \
  --secret-string "mongodb+srv://..."

aws secretsmanager create-secret \
  --name quckapp/production/jwt-secret \
  --secret-string "your-production-jwt-secret-256-bits"

aws secretsmanager create-secret \
  --name quckapp/production/db-password \
  --secret-string "your-strong-password"

# List all secrets
aws secretsmanager list-secrets --query 'SecretList[*].Name'
```

### Step 3: Deploy Infrastructure with Terraform

```bash
cd infrastructure/terraform

# Initialize Terraform
terraform init

# Create terraform.tfvars
cat > terraform.tfvars << EOF
aws_region          = "us-east-1"
environment         = "production"
app_name            = "quckapp"
domain_name         = "quckapp.yourdomain.com"
db_password         = "your-db-password"
acm_certificate_arn = "arn:aws:acm:us-east-1:123456789:certificate/xxx"
EOF

# Preview changes
terraform plan

# Apply infrastructure
terraform apply

# Save outputs
terraform output > ../outputs.txt
```

### Step 4: Build and Push Docker Images

```bash
# Login to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  123456789.dkr.ecr.us-east-1.amazonaws.com

# Build and push Backend
cd backend
docker build -t quckapp/backend:latest .
docker tag quckapp/backend:latest \
  123456789.dkr.ecr.us-east-1.amazonaws.com/quckapp/backend:latest
docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/quckapp/backend:latest

# Build and push Auth Service
cd ../auth-service
docker build -t quckapp/auth-service:latest .
docker tag quckapp/auth-service:latest \
  123456789.dkr.ecr.us-east-1.amazonaws.com/quckapp/auth-service:latest
docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/quckapp/auth-service:latest

# Build and push Realtime
cd ../realtime
docker build -t quckapp/realtime:latest .
docker tag quckapp/realtime:latest \
  123456789.dkr.ecr.us-east-1.amazonaws.com/quckapp/realtime:latest
docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/quckapp/realtime:latest
```

### Step 5: Create ECS Services

```bash
# Create ECS services using AWS CLI
aws ecs create-service \
  --cluster quckapp-cluster \
  --service-name quckapp-backend \
  --task-definition quckapp-backend:1 \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx],assignPublicIp=DISABLED}" \
  --load-balancers "targetGroupArn=arn:aws:elasticloadbalancing:...,containerName=backend,containerPort=3000"

# Repeat for auth-service and realtime
```

### Step 6: Configure DNS

```bash
# Get ALB DNS name
ALB_DNS=$(terraform output -raw alb_dns_name)

# Add CNAME record in your DNS provider
# api.quckapp.com -> $ALB_DNS
```

---

## Part 3: CI/CD Pipeline

### GitHub Actions Setup

1. Add secrets to GitHub repository:
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `AWS_ACCOUNT_ID`
   - `SLACK_WEBHOOK_URL` (optional)

2. The workflow file (`.github/workflows/deploy.yml`) will:
   - Run tests on every push
   - Build Docker images
   - Push to ECR
   - Deploy to ECS

### Deployment Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Push to   │────▶│   GitHub    │────▶│   Deploy    │
│   main      │     │   Actions   │     │   to AWS    │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │                   │
       │            ┌──────┴──────┐            │
       │            │             │            │
       │        ┌───▼───┐   ┌─────▼────┐  ┌────▼────┐
       │        │ Test  │   │  Build   │  │ Deploy  │
       │        │ Suite │   │  Docker  │  │  ECS    │
       │        └───────┘   └──────────┘  └─────────┘
```

---

## Part 4: Monitoring & Logging

### CloudWatch Setup

```bash
# Create log groups
aws logs create-log-group --log-group-name /ecs/quckapp-backend
aws logs create-log-group --log-group-name /ecs/quckapp-auth-service
aws logs create-log-group --log-group-name /ecs/quckapp-realtime

# Set retention
aws logs put-retention-policy \
  --log-group-name /ecs/quckapp-backend \
  --retention-in-days 30
```

### Useful CloudWatch Queries

```sql
-- Error rate by service
fields @timestamp, @message
| filter @message like /error/i
| stats count() as errors by bin(1h)

-- Response times
fields @timestamp, @message
| parse @message /duration=(?<duration>\d+)/
| stats avg(duration), max(duration), p99(duration) by bin(5m)

-- Auth failures
fields @timestamp, @message
| filter @message like /authentication failed/i
| stats count() by bin(1h)
```

### Health Check Endpoints

| Service | Health Endpoint |
|---------|-----------------|
| Backend | `/health` |
| Auth Service | `/api/auth/actuator/health` |
| Realtime | `/health` |

---

## Troubleshooting

### Common Issues

**1. Services can't connect to each other**
```bash
# Check security groups
aws ec2 describe-security-groups --group-ids sg-xxx

# Check ECS task networking
aws ecs describe-tasks --cluster quckapp-cluster --tasks task-id
```

**2. Database connection issues**
```bash
# Test RDS connectivity
psql -h quckapp-postgres.xxx.us-east-1.rds.amazonaws.com \
  -U postgres -d quckapp_auth

# Check security group rules
aws rds describe-db-instances --db-instance-identifier quckapp-postgres
```

**3. Kafka connection issues**
```bash
# Get MSK bootstrap brokers
aws kafka get-bootstrap-brokers --cluster-arn arn:aws:kafka:...

# Test connectivity
kafka-console-consumer --bootstrap-server b-1.xxx:9092 \
  --topic auth.events --from-beginning
```

**4. Container crashes**
```bash
# View ECS logs
aws logs tail /ecs/quckapp-backend --follow

# Describe stopped tasks
aws ecs describe-tasks --cluster quckapp-cluster \
  --tasks $(aws ecs list-tasks --cluster quckapp-cluster \
    --desired-status STOPPED --query 'taskArns[0]' --output text)
```

### Scaling

```bash
# Scale ECS service
aws ecs update-service \
  --cluster quckapp-cluster \
  --service quckapp-backend \
  --desired-count 4

# Auto-scaling setup
aws application-autoscaling register-scalable-target \
  --service-namespace ecs \
  --scalable-dimension ecs:service:DesiredCount \
  --resource-id service/quckapp-cluster/quckapp-backend \
  --min-capacity 2 \
  --max-capacity 10
```

---

## Quick Reference Commands

```bash
# ============ LOCAL ============
docker-compose up -d                    # Start all services
docker-compose logs -f backend          # View backend logs
docker-compose down -v                  # Stop and remove volumes

# ============ AWS ============
terraform plan                          # Preview changes
terraform apply                         # Deploy infrastructure
aws ecs update-service --force-new-deployment  # Redeploy

# ============ DEBUG ============
docker-compose exec backend sh          # Shell into container
aws logs tail /ecs/quckapp-backend     # View AWS logs
curl localhost:3000/health              # Health check
```

---

## Cost Estimation (AWS Production)

| Service | Monthly Cost (USD) |
|---------|-------------------|
| ECS Fargate (3 services x 2 tasks) | ~$150 |
| RDS Aurora Serverless | ~$50-200 |
| ElastiCache Redis | ~$50 |
| MSK Kafka | ~$200 |
| ALB | ~$20 |
| S3 + CloudFront | ~$20 |
| **Total** | **~$500-700/month** |

*Note: Costs vary based on usage. Use AWS Cost Explorer for accurate estimates.*
