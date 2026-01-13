#!/bin/bash
set -e

# =============================================================================
# QuckChat EC2 Setup Script
# =============================================================================
# This script automatically sets up the EC2 instance with:
# - Docker for container deployment
# - AWS CLI for ECR access
# - Redis (local)
# =============================================================================

exec > >(tee /var/log/user-data.log|logger -t user-data -s 2>/dev/console) 2>&1

echo "=========================================="
echo "Starting QuckChat Server Setup"
echo "=========================================="

# Update system
yum update -y

# Install Docker
echo "Installing Docker..."
yum install -y docker
systemctl start docker
systemctl enable docker
usermod -a -G docker ec2-user

# Install AWS CLI v2
echo "Installing AWS CLI..."
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
yum install -y unzip
unzip awscliv2.zip
./aws/install
rm -rf awscliv2.zip aws/

# Install Redis
echo "Installing Redis..."
yum install -y redis6
systemctl start redis6
systemctl enable redis6

# Create application directory
echo "Creating application directory..."
mkdir -p /opt/${app_name}
cd /opt/${app_name}

# Create environment file
echo "Creating environment file..."
cat > /opt/${app_name}/.env << 'ENVEOF'
%{ for key, value in environment_variables ~}
${key}=${value}
%{ endfor ~}
ENVEOF

# Set permissions
chown -R ec2-user:ec2-user /opt/${app_name}
chmod 600 /opt/${app_name}/.env

# Create Docker deployment script
cat > /opt/${app_name}/deploy-docker.sh << 'DEPLOYEOF'
#!/bin/bash
set -e

APP_NAME="${app_name}"
AWS_REGION="${aws_region}"
ECR_REPO="${ecr_repository}"
CONTAINER_PORT=${container_port}

echo "=========================================="
echo "Deploying $APP_NAME via Docker"
echo "=========================================="

# Login to ECR
echo "Logging in to ECR..."
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REPO

# Pull latest image
echo "Pulling latest image..."
docker pull $ECR_REPO:latest

# Stop existing container
echo "Stopping existing container..."
docker stop $APP_NAME 2>/dev/null || true
docker rm $APP_NAME 2>/dev/null || true

# Run new container
echo "Starting new container..."
docker run -d \
  --name $APP_NAME \
  --restart unless-stopped \
  -p $CONTAINER_PORT:$CONTAINER_PORT \
  -v /opt/$APP_NAME/.env:/app/.env:ro \
  --env-file /opt/$APP_NAME/.env \
  $ECR_REPO:latest

# Cleanup old images
echo "Cleaning up old images..."
docker image prune -af

# Check container health
echo "Waiting for container to start..."
sleep 10

if docker ps | grep -q $APP_NAME; then
  echo "=========================================="
  echo "Deployment successful!"
  echo "Container is running on port $CONTAINER_PORT"
  echo "=========================================="
else
  echo "ERROR: Container failed to start"
  docker logs $APP_NAME
  exit 1
fi
DEPLOYEOF

chmod +x /opt/${app_name}/deploy-docker.sh
chown ec2-user:ec2-user /opt/${app_name}/deploy-docker.sh

# Create health check script
cat > /opt/${app_name}/health-check.sh << 'HEALTHEOF'
#!/bin/bash
CONTAINER_PORT=${container_port}

response=$(curl -s -o /dev/null -w "%%{http_code}" http://localhost:$CONTAINER_PORT/health)

if [ "$response" == "200" ]; then
  echo "Health check passed"
  exit 0
else
  echo "Health check failed with status: $response"
  exit 1
fi
HEALTHEOF

chmod +x /opt/${app_name}/health-check.sh

# Create a simple health check server (temporary until app is deployed)
cat > /opt/${app_name}/health-server.js << 'HEALTHSERVEREOF'
const http = require('http');
const port = ${container_port};

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      message: 'EC2 instance ready for deployment',
      timestamp: new Date().toISOString()
    }));
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(port, () => {
  console.log('Health check server running on port ' + port);
});
HEALTHSERVEREOF

# Install Node.js for temporary health server
echo "Installing Node.js..."
curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
yum install -y nodejs

# Start temporary health check server
cd /opt/${app_name}
nohup node health-server.js > /var/log/health-server.log 2>&1 &

# Setup log rotation for Docker
cat > /etc/logrotate.d/docker-containers << 'LOGROTATEEOF'
/var/lib/docker/containers/*/*.log {
  rotate 7
  daily
  compress
  missingok
  delaycompress
  copytruncate
}
LOGROTATEEOF

echo "=========================================="
echo "Setup Complete!"
echo "=========================================="
echo ""
echo "Server is ready for Docker deployments"
echo ""
echo "To deploy manually:"
echo "  /opt/${app_name}/deploy-docker.sh"
echo ""
echo "Or push to GitHub main branch for automatic deployment"
echo "=========================================="
