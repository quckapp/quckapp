# QuckChat CI/CD Setup Guide

This guide walks you through setting up automated deployments for QuckChat using GitHub Actions, AWS ECR, and EC2.

## Architecture Overview

```
┌──────────────┐     ┌───────────────┐     ┌─────────────┐     ┌──────────────┐
│   GitHub     │────▶│ GitHub Actions│────▶│  AWS ECR    │────▶│   AWS EC2    │
│   (Push)     │     │ (Build/Test)  │     │  (Images)   │     │  (Docker)    │
└──────────────┘     └───────────────┘     └─────────────┘     └──────────────┘
                                                                      │
                                                                      ▼
                                                               ┌──────────────┐
                                                               │ MongoDB Atlas│
                                                               └──────────────┘
```

## Prerequisites

- AWS Account
- GitHub Repository
- MongoDB Atlas Account (free tier)
- Terraform installed locally

## Step 1: Set Up MongoDB Atlas

1. Go to https://mongodb.com/atlas
2. Create a free M0 cluster
3. Create a database user
4. Add `0.0.0.0/0` to IP whitelist (for testing)
5. Copy the connection string

## Step 2: Create AWS Resources

### 2.1 Create IAM User for GitHub Actions

1. Go to AWS Console → IAM → Users → Create User
2. Name: `github-actions-quckchat`
3. Attach policies:
   - `AmazonEC2ContainerRegistryFullAccess`
   - `AmazonEC2FullAccess` (or create custom policy)
4. Create access keys and save them

### 2.2 Create EC2 Key Pair

1. Go to AWS Console → EC2 → Key Pairs
2. Create key pair: `quckchat-key`
3. Download the `.pem` file
4. Save it securely (you'll need the contents for GitHub Secrets)

### 2.3 Deploy Infrastructure with Terraform

```bash
cd terraform

# Initialize Terraform
terraform init

# Edit the configuration
nano environments/free-tier.tfvars
```

Update `free-tier.tfvars`:
```hcl
# Required changes:
ec2_key_name      = "quckchat-key"
mongodb_atlas_uri = "mongodb+srv://user:pass@cluster.mongodb.net/quickchat"
allowed_ssh_cidrs = ["YOUR_IP/32"]  # Get your IP: curl ifconfig.me
```

Deploy:
```bash
# Preview changes
terraform plan -var-file="environments/free-tier.tfvars"

# Apply (creates all resources)
terraform apply -var-file="environments/free-tier.tfvars"

# Save the outputs!
terraform output
```

## Step 3: Configure GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions

Add these secrets:

| Secret Name | Value |
|-------------|-------|
| `AWS_ACCESS_KEY_ID` | Your IAM user access key |
| `AWS_SECRET_ACCESS_KEY` | Your IAM user secret key |
| `EC2_HOST` | EC2 public IP (from terraform output) |
| `EC2_USER` | `ec2-user` |
| `EC2_SSH_KEY` | Contents of `quckchat-key.pem` file |
| `SLACK_WEBHOOK_URL` | Slack incoming webhook URL (see below) |

### How to get EC2_SSH_KEY value:

```bash
# On Windows (PowerShell)
Get-Content quckchat-key.pem

# On Mac/Linux
cat quckchat-key.pem
```

Copy the entire output including:
```
-----BEGIN RSA PRIVATE KEY-----
...
-----END RSA PRIVATE KEY-----
```

### How to set up Slack Webhook:

1. Go to https://api.slack.com/apps
2. Click **Create New App** → **From scratch**
3. Name: `QuckChat Deployments`, pick your workspace
4. Click **Incoming Webhooks** in the sidebar
5. Toggle **Activate Incoming Webhooks** to ON
6. Click **Add New Webhook to Workspace**
7. Select the channel for notifications (e.g., `#deployments`)
8. Copy the webhook URL (looks like: `https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX`)
9. Add it as `SLACK_WEBHOOK_URL` secret in GitHub

### Slack Notification Examples:

**Success Notification:**
```
┌─────────────────────────────────────────┐
│ ✅ Deployment Successful                │
├─────────────────────────────────────────┤
│ Repository: your-username/quickchat     │
│ Branch: main                            │
│ Commit: abc1234                         │
│ Author: your-username                   │
│                                         │
│ Status: Backend deployed to EC2         │
└─────────────────────────────────────────┘
```

**Failure Notification:**
```
┌─────────────────────────────────────────┐
│ ❌ Deployment Failed                    │
├─────────────────────────────────────────┤
│ Repository: your-username/quickchat     │
│ Branch: main                            │
│ Failed Job: Deploy                      │
│ Error: Health check failed              │
│                                         │
│ [View Logs] button                      │
└─────────────────────────────────────────┘
```

## Step 4: Trigger a Deployment

### Option 1: Push to main branch

```bash
git add .
git commit -m "Initial CI/CD setup"
git push origin main
```

### Option 2: Manual trigger

Go to GitHub → Actions → Backend CI/CD → Run workflow

## Step 5: Verify Deployment

```bash
# Check if the app is running
curl http://YOUR_EC2_IP:3000/health

# SSH into EC2 to check logs
ssh -i quckchat-key.pem ec2-user@YOUR_EC2_IP

# View Docker logs
docker logs quckchat-dev-backend

# View all running containers
docker ps
```

## Workflow Explained

The CI/CD pipeline (`.github/workflows/backend-ci-cd.yml`) does the following:

### On every push/PR:
1. **Test** - Installs dependencies, runs linting and tests

### On push to main/master:
2. **Build & Push** - Builds Docker image and pushes to ECR
3. **Deploy** - SSHs into EC2 and deploys the new container
4. **Health Check** - Verifies the deployment succeeded

## Troubleshooting

### Deployment Failed

```bash
# SSH into EC2
ssh -i quckchat-key.pem ec2-user@YOUR_EC2_IP

# Check Docker logs
docker logs quckchat-dev-backend

# Check if container is running
docker ps -a

# Manual deploy
/opt/quckchat-dev/deploy-docker.sh
```

### ECR Login Failed

```bash
# On EC2, test ECR login manually
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin YOUR_ECR_URL
```

### Health Check Failed

1. Check if the backend has a `/health` endpoint
2. Verify the container is running: `docker ps`
3. Check logs: `docker logs quckchat-dev-backend`

## File Structure

```
.github/
└── workflows/
    └── backend-ci-cd.yml    # CI/CD workflow

terraform/
├── main-free-tier.tf        # Free tier infrastructure
├── environments/
│   └── free-tier.tfvars     # Configuration
└── modules/
    ├── ec2/                 # EC2 instance
    ├── ecr/                 # Container registry
    └── s3/                  # File storage
```

## Estimated Costs

| Service | Cost |
|---------|------|
| EC2 t2.micro | Free (750 hrs/month first year) |
| ECR | ~$0.10/GB/month |
| S3 | Free (5GB first year) |
| Data Transfer | Free (15GB/month) |
| **Total** | **~$0-5/month** |

## Next Steps

1. **Add custom domain** - Set up Route 53 and SSL
2. **Add monitoring** - CloudWatch alarms
3. **Scale up** - Move to ECS when needed
