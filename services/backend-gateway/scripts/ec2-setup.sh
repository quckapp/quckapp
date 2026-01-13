#!/bin/bash
# =============================================================================
# QuckChat EC2 Setup Script
# =============================================================================
# Run this script on your EC2 instance to set up Docker and the environment
# Usage: curl -sSL https://raw.githubusercontent.com/YOUR_REPO/main/scripts/ec2-setup.sh | bash
# Or: ssh into EC2 and run this script directly
# =============================================================================

set -e

echo "=========================================="
echo "QuckChat EC2 Setup Script"
echo "=========================================="

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ]; then
  SUDO="sudo"
else
  SUDO=""
fi

# Update system
echo "[1/7] Updating system packages..."
$SUDO yum update -y

# Install Docker
echo "[2/7] Installing Docker..."
$SUDO yum install -y docker
$SUDO systemctl start docker
$SUDO systemctl enable docker
$SUDO usermod -a -G docker ec2-user

# Install AWS CLI v2 (if not already installed)
echo "[3/7] Installing/Updating AWS CLI..."
if ! command -v aws &> /dev/null; then
  curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
  $SUDO yum install -y unzip
  unzip -q awscliv2.zip
  $SUDO ./aws/install
  rm -rf awscliv2.zip aws/
fi

# Install Redis
echo "[4/7] Installing Redis..."
$SUDO yum install -y redis6 || $SUDO amazon-linux-extras install redis6 -y || echo "Redis installation skipped"
$SUDO systemctl start redis6 || true
$SUDO systemctl enable redis6 || true

# Create application directory
echo "[5/7] Creating application directory..."
$SUDO mkdir -p /opt/quckchat
$SUDO chown ec2-user:ec2-user /opt/quckchat

# Create environment file template
echo "[6/7] Creating environment file template..."
cat > /opt/quckchat/.env.template << 'EOF'
# =============================================================================
# QuckChat Backend Environment Variables
# =============================================================================
# Copy this file to .env and fill in the values
# cp .env.template .env && nano .env
# =============================================================================

# Server
NODE_ENV=production
PORT=3000

# MongoDB Atlas
# Get this from MongoDB Atlas dashboard
MONGODB_URI=mongodb+srv://USER:PASSWORD@cluster.mongodb.net/quickchat?retryWrites=true&w=majority

# Redis (local)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_EXPIRES_IN=7d

# Encryption
ENCRYPTION_KEY=your-32-character-encryption-key

# AWS S3 (for file uploads)
AWS_REGION=ap-southeast-1
AWS_S3_BUCKET=quckchat-uploads

# Firebase (for push notifications) - Optional
# FIREBASE_PROJECT_ID=
# FIREBASE_PRIVATE_KEY=
# FIREBASE_CLIENT_EMAIL=
EOF

# Create deployment script
echo "[7/7] Creating deployment script..."
cat > /opt/quckchat/deploy.sh << 'EOF'
#!/bin/bash
# =============================================================================
# QuckChat Deployment Script
# =============================================================================
set -e

AWS_REGION="ap-southeast-1"
ECR_REPO="250560143886.dkr.ecr.ap-southeast-1.amazonaws.com/quckchat-backend"
CONTAINER_NAME="quckchat-backend"
CONTAINER_PORT=3000

echo "=========================================="
echo "Deploying QuckChat Backend"
echo "=========================================="

# Login to ECR
echo "[1/5] Logging in to ECR..."
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REPO

# Pull latest image
echo "[2/5] Pulling latest image..."
docker pull $ECR_REPO:latest

# Stop existing container
echo "[3/5] Stopping existing container..."
docker stop $CONTAINER_NAME 2>/dev/null || true
docker rm $CONTAINER_NAME 2>/dev/null || true

# Run new container
echo "[4/5] Starting new container..."
docker run -d \
  --name $CONTAINER_NAME \
  --restart unless-stopped \
  -p $CONTAINER_PORT:$CONTAINER_PORT \
  --env-file /opt/quckchat/.env \
  --add-host=host.docker.internal:host-gateway \
  $ECR_REPO:latest

# Cleanup old images
echo "[5/5] Cleaning up..."
docker image prune -af

# Wait for startup
echo "Waiting for container to start..."
sleep 10

# Health check
if docker ps | grep -q $CONTAINER_NAME; then
  echo "=========================================="
  echo "Deployment Successful!"
  echo "=========================================="
  echo "Container: $CONTAINER_NAME"
  echo "Port: $CONTAINER_PORT"
  echo "Status: $(docker inspect --format='{{.State.Status}}' $CONTAINER_NAME)"
  echo ""
  echo "Test with: curl http://localhost:$CONTAINER_PORT/health"
else
  echo "ERROR: Container failed to start"
  docker logs $CONTAINER_NAME
  exit 1
fi
EOF

chmod +x /opt/quckchat/deploy.sh

echo ""
echo "=========================================="
echo "Setup Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo ""
echo "1. Create your .env file:"
echo "   cp /opt/quckchat/.env.template /opt/quckchat/.env"
echo "   nano /opt/quckchat/.env"
echo ""
echo "2. Configure AWS credentials (for ECR access):"
echo "   aws configure"
echo ""
echo "3. Deploy the application:"
echo "   /opt/quckchat/deploy.sh"
echo ""
echo "4. Or wait for GitHub Actions to deploy automatically"
echo ""
echo "=========================================="

# Re-login to apply docker group
echo ""
echo "NOTE: Please logout and login again (or run 'newgrp docker')"
echo "      to use Docker without sudo"
