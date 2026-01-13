# Azure DevOps CD Pipelines

This directory contains Azure DevOps CD (Continuous Deployment) pipelines for QuikApp microservices.

## Environment Progression

```
Local/Mock → Dev → QA → UAT1 → UAT2 → UAT3 → Staging → Live
```

| Environment | Purpose | Approval | Cluster |
|-------------|---------|----------|---------|
| **Local/Mock** | Local Docker development | None | local |
| **Dev** | Development integration | None | aks-dev |
| **QA** | QA testing | QA Lead | aks-qa |
| **UAT1** | Partner/Customer acceptance | Product Owner | aks-uat |
| **UAT2** | Internal QA (debug enabled) | Product Owner | aks-uat |
| **UAT3** | Performance/Load testing | PO + Security | aks-uat |
| **Staging** | Pre-production | Release Manager | aks-staging |
| **Live** | Production | CAB + Release Manager | aks-prod |

## Pipeline Files

### Main Pipeline
- **`cd-main.yml`** - Multi-stage CD pipeline with all environments

### Tech Stack Pipelines
- **`spring-boot-cd.yml`** - Spring Boot services (auth, user, permission, audit, admin)
- **`nestjs-cd.yml`** - NestJS services (backend-gateway, notification, realtime)
- **`elixir-cd.yml`** - Elixir/Phoenix services (presence, message, call, huddle, etc.)
- **`go-cd.yml`** - Go/Gin services (workspace, channel, thread, search, file, media, etc.)
- **`python-cd.yml`** - Python/FastAPI services (analytics, ml, moderation, sentiment, etc.)

### Infrastructure Pipelines (Terraform)
- **`terraform-cd.yml`** - Single environment infrastructure deployment
- **`terraform-promote.yml`** - Multi-environment promotion pipeline (dev → qa → staging → prod)

### Templates
- **`templates/deploy-steps.yml`** - Standard deployment steps
- **`templates/deploy-canary.yml`** - Canary deployment for production
- **`templates/rollback.yml`** - Emergency rollback procedure
- **`templates/integration-tests.yml`** - Integration test runner
- **`templates/qa-tests.yml`** - QA test suite
- **`templates/security-tests.yml`** - Security scanning (OWASP ZAP, Trivy, Gitleaks)
- **`templates/performance-tests.yml`** - Performance benchmarks
- **`templates/load-tests.yml`** - Load testing with k6
- **`templates/smoke-tests.yml`** - Production smoke tests

### Terraform Templates
- **`templates/terraform-init.yml`** - Initialize Terraform with Azure backend
- **`templates/terraform-plan.yml`** - Create and publish execution plan
- **`templates/terraform-apply.yml`** - Apply infrastructure changes
- **`templates/terraform-destroy.yml`** - Destroy infrastructure (with safety blocks)
- **`templates/terraform-environment-stage.yml`** - Reusable environment deployment stage

## Setup Instructions

### 1. Create Service Connections

In Azure DevOps Project Settings → Service Connections, create:

| Name | Type | Purpose |
|------|------|---------|
| `QuikApp-local` | Azure Resource Manager | Local resources |
| `QuikApp-dev` | Azure Resource Manager | Dev subscription |
| `QuikApp-qa` | Azure Resource Manager | QA subscription |
| `QuikApp-uat` | Azure Resource Manager | UAT subscription |
| `QuikApp-staging` | Azure Resource Manager | Staging subscription |
| `QuikApp-production` | Azure Resource Manager | Production subscription |
| `GitHubServiceConnection` | GitHub | Repository access |
| `ACR-ServiceConnection` | Docker Registry | Container registry |

### 2. Create Variable Groups

Variable groups store environment-specific configuration. See `variable-groups.yml` for complete variable definitions synced with `.env.*.example` files.

#### 2.1 Required Variable Groups

Create the following variable groups in **Pipelines → Library → Variable groups**:

| Variable Group | Source | Description |
|----------------|--------|-------------|
| `QuikApp-Global-Variables` | - | Shared across all environments |
| `QuikApp-Local-Variables` | `.env.local.example` | Local Docker development |
| `QuikApp-Dev-Variables` | `.env.dev.example` | Development environment |
| `QuikApp-QA-Variables` | `.env.qa.example` | QA testing environment |
| `QuikApp-UAT1-Variables` | `.env.uat.example` | Partner acceptance testing |
| `QuikApp-UAT2-Variables` | `.env.uat.example` | Internal QA testing |
| `QuikApp-UAT3-Variables` | `.env.uat.example` | Performance/Load testing |
| `QuikApp-Staging-Variables` | `.env.staging.example` | Pre-production |
| `QuikApp-Live-Variables` | `.env.production.example` | Production |
| `QuikApp-SpringBoot-Variables` | - | Spring Boot tech stack |
| `QuikApp-NestJS-Variables` | - | NestJS tech stack |
| `QuikApp-Elixir-Variables` | - | Elixir tech stack |
| `QuikApp-Go-Variables` | - | Go tech stack |
| `QuikApp-Python-Variables` | - | Python tech stack |

#### 2.2 Creating a Variable Group

1. Navigate to **Pipelines → Library**
2. Click **+ Variable group**
3. Enter the variable group name (e.g., `QuikApp-Dev-Variables`)
4. Add variables from the corresponding section in `variable-groups.yml`
5. Mark sensitive values as **secret** (click the lock icon)
6. Click **Save**

#### 2.3 Variable Categories per Environment

Each environment variable group should include:

```yaml
# Environment Identification
environment          # Environment name (local, dev, qa, uat1, etc.)
nodeEnv              # Node environment (development/production)
aksCluster           # AKS cluster name
resourceGroup        # Azure resource group
namespace            # Kubernetes namespace

# Database Connections
mongodbUri           # MongoDB connection string
mysqlHost            # MySQL host
mysqlPort            # MySQL port
mysqlDatabase        # MySQL database name
mysqlUser            # MySQL username
mysqlPassword        # MySQL password (secret)
postgresHost         # PostgreSQL host
postgresPort         # PostgreSQL port
postgresDb           # PostgreSQL database
postgresUser         # PostgreSQL username
postgresPassword     # PostgreSQL password (secret)
redisHost            # Redis host
redisPort            # Redis port
redisPassword        # Redis password (secret)
elasticsearchUrl     # Elasticsearch URL

# Message Brokers
kafkaBrokers         # Kafka broker addresses
kafkaSaslEnabled     # SASL enabled (prod only)
kafkaSaslUsername    # SASL username (secret, prod only)
kafkaSaslPassword    # SASL password (secret, prod only)

# Storage
awsRegion            # AWS region
s3Bucket             # S3 bucket name
storageMode          # Storage mode (local/s3)
cdnUrl               # CDN URL (staging/prod only)

# Security
jwtSecret            # JWT signing secret (secret)
jwtExpiresIn         # JWT expiration time
jwtRefreshSecret     # Refresh token secret (secret)
jwtRefreshExpiresIn  # Refresh token expiration
encryptionKey        # Data encryption key (secret)
secretKeyBase        # Elixir secret key base (secret)

# CORS
corsOrigin           # Allowed CORS origins

# Logging
logLevel             # Log level (debug/info/warn)
logFormat            # Log format (json)
logPretty            # Pretty print logs

# Monitoring
sentryDsn            # Sentry DSN
sentryEnvironment    # Sentry environment name
datadogEnabled       # Datadog enabled
datadogApiKey        # Datadog API key (secret)
newrelicEnabled      # New Relic enabled
newrelicLicenseKey   # New Relic license key (secret)

# Tracing
otelEnabled          # OpenTelemetry enabled
otelExporterOtlpEndpoint  # OTLP endpoint
tracingSampleRate    # Trace sampling rate

# External Services
firebaseProjectId    # Firebase project ID
firebasePrivateKey   # Firebase private key (secret)
twilioAccountSid     # Twilio account SID (secret)
twilioAuthToken      # Twilio auth token (secret)
openaiApiKey         # OpenAI API key (secret)
```

#### 2.4 Environment-Specific Settings

| Setting | Local | Dev | QA | UAT1 | UAT2 | UAT3 | Staging | Live |
|---------|-------|-----|-----|------|------|------|---------|------|
| `nodeEnv` | development | development | development | production | production | production | production | production |
| `logLevel` | debug | debug | debug | info | debug | warn | info | warn |
| `tracingSampleRate` | 0 | 1.0 | 1.0 | 0.5 | 0.5 | 0.01 | 0.5 | 0.1 |
| `datadogEnabled` | false | true | false | false | false | false | true | true |
| `newrelicEnabled` | false | false | false | false | false | false | true | true |
| `otelEnabled` | false | true | false | false | false | false | true | true |

#### 2.5 Linking Azure Key Vault Secrets

For enhanced security, link sensitive variables to Azure Key Vault:

1. **Create Key Vault secrets** with naming convention `ENV-SECRET-NAME`:
   ```
   DEV-MONGODB-URI
   DEV-JWT-SECRET
   DEV-ENCRYPTION-KEY
   QA-MONGODB-URI
   STAGING-JWT-SECRET
   PROD-MONGODB-URI
   PROD-JWT-SECRET
   ```

2. **Link to Variable Group**:
   - Edit the variable group
   - Toggle **Link secrets from an Azure key vault as variables**
   - Select your Azure subscription
   - Select the Key Vault (e.g., `kv-quikapp`)
   - Click **+ Add** and select the secrets to link
   - Click **Save**

3. **Key Vault Access**:
   - Ensure the Azure DevOps service principal has `Get` and `List` permissions
   - Use Azure RBAC or Key Vault access policies

#### 2.6 Tech Stack Variable Groups

**QuikApp-SpringBoot-Variables:**
```yaml
javaVersion: '21'
mavenVersion: '3.9.5'
springProfile: '$(environment)'
jvmOpts: '-Xms256m -Xmx512m'
```

**QuikApp-NestJS-Variables:**
```yaml
nodeVersion: '20'
npmVersion: '10'
nestCliVersion: '10'
```

**QuikApp-Elixir-Variables:**
```yaml
elixirVersion: '1.15'
otpVersion: '26'
mixEnv: 'prod'
erlVmArgs: '+P 1000000 +Q 65536'
```

**QuikApp-Go-Variables:**
```yaml
goVersion: '1.21'
goPrivate: 'github.com/quikapp/*'
cgoEnabled: '0'
```

**QuikApp-Python-Variables:**
```yaml
pythonVersion: '3.11'
pipVersion: '23.3'
uvicornWorkers: '4'
```

#### 2.7 Grant Pipeline Permissions

After creating variable groups:

1. Click on the variable group
2. Go to **Pipeline permissions**
3. Click **+** and add the pipelines that need access:
   - `Spring Boot CD`
   - `NestJS CD`
   - `Elixir CD`
   - `Go CD`
   - `Python CD`

#### 2.8 Security Best Practices

1. **Mark secrets**: Always mark passwords, keys, and tokens as secret
2. **Use Key Vault**: Link sensitive values to Azure Key Vault for audit trails
3. **Rotate secrets**: Implement secret rotation policies
4. **Least privilege**: Only grant pipeline permissions to required variable groups
5. **No hardcoded secrets**: Never commit actual values to `variable-groups.yml`
6. **Audit logs**: Enable Azure DevOps audit logs for variable group changes

### 3. Configure Environments

In Azure DevOps Pipelines → Environments, create:

| Environment | Approvers | Checks |
|-------------|-----------|--------|
| `quikapp-local-mock` | None | None |
| `quikapp-dev` | None | None |
| `quikapp-qa` | QA Lead | None |
| `quikapp-uat1` | Product Owner | None |
| `quikapp-uat2` | Product Owner | None |
| `quikapp-uat3` | Product Owner, Security Team | None |
| `quikapp-staging` | Release Manager | None |
| `quikapp-production` | CAB, Release Manager, CTO | Business hours check |

#### Adding Approval Gates

1. Navigate to **Pipelines → Environments**
2. Select the environment (e.g., `quikapp-qa`)
3. Click **Approvals and checks**
4. Add **Approvals**:
   - Add approvers by email or group
   - Set timeout (e.g., 1440 minutes = 24 hours)
   - Configure approval policies (any one, all, specific order)

#### Adding Business Hours Check (Production)

1. Select `quikapp-production` environment
2. Add **Business Hours** check
3. Configure allowed deployment windows:
   - Monday-Thursday: 9:00 AM - 4:00 PM
   - Friday: 9:00 AM - 12:00 PM
   - Weekends: Blocked (emergency only)

### 4. Import Pipelines

In Azure DevOps Pipelines, create new pipelines pointing to:

1. `infrastructure/azure-pipelines/spring-boot-cd.yml`
2. `infrastructure/azure-pipelines/nestjs-cd.yml`
3. `infrastructure/azure-pipelines/elixir-cd.yml`
4. `infrastructure/azure-pipelines/go-cd.yml`
5. `infrastructure/azure-pipelines/python-cd.yml`

## Usage

### Manual Deployment

1. Go to Pipelines → Select the tech stack pipeline
2. Click "Run pipeline"
3. Select service name and environments
4. Click "Run"

### Automatic Deployment

Pipelines are triggered automatically when CI pipelines complete:
- `develop` branch → deploys to Dev
- `main` branch → deploys to Staging
- Tags (`v*`) → deploys to Production (with approvals)

## Rollback

To rollback a deployment:

1. Go to the failed deployment run
2. The rollback is automatic on failure
3. For manual rollback, run:
   ```bash
   kubectl rollout undo deployment/<service-name> -n <namespace>
   ```

## Monitoring

- Each deployment publishes test results to Azure DevOps
- Security scan reports are attached as artifacts
- Load test results include latency percentiles
- Slack notifications sent on deployment completion/failure

## Troubleshooting

### Pipeline not triggering
- Check webhook configuration in GitHub
- Verify CI pipeline completes successfully

### Deployment fails
- Check AKS cluster connectivity
- Verify service connection permissions
- Review pod logs: `kubectl logs -n <namespace> -l app=<service>`

### Variable group access denied
- Verify pipeline has permissions to the variable group
- Check that secrets are properly linked from Key Vault
- Ensure service principal has Key Vault access

### Approval timeout
- Approvers receive email notifications
- Approvals can be done via Azure DevOps UI or Teams
- Check spam folder for approval emails

### Environment variables not resolving
- Verify variable group is linked in pipeline YAML
- Check variable naming matches (case-sensitive)
- Ensure secret variables are not empty in Key Vault

---

## Terraform Infrastructure Pipelines

The Terraform pipelines deploy Azure infrastructure including AKS, ACR, and Key Vault.

### Pipeline Overview

| Pipeline | Purpose | Trigger |
|----------|---------|---------|
| `terraform-cd.yml` | Single environment deployment | Manual / On push to `infrastructure/terraform/**` |
| `terraform-promote.yml` | Multi-environment promotion | Manual only |

### Architecture Deployed

```
┌─────────────────────────────────────────────────────────────────┐
│                     Azure Resource Group                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   Virtual Network                        │   │
│  │  ┌─────────────────┐    ┌────────────────────────────┐  │   │
│  │  │   AKS Subnet    │    │  Private Endpoints Subnet  │  │   │
│  │  │  ┌───────────┐  │    │  ┌─────────┐ ┌──────────┐  │  │   │
│  │  │  │    AKS    │  │    │  │   ACR   │ │   Key    │  │  │   │
│  │  │  │  Cluster  │  │    │  │ Private │ │  Vault   │  │  │   │
│  │  │  └───────────┘  │    │  │Endpoint │ │ Private  │  │  │   │
│  │  └─────────────────┘    │  └─────────┘ └──────────┘  │  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │     ACR      │  │  Key Vault   │  │   Log Analytics      │  │
│  │  Container   │  │   Secrets    │  │     Workspace        │  │
│  │  Registry    │  │    Keys      │  │    Monitoring        │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Terraform Setup

#### 1. Create Terraform State Storage

Before running the pipeline, create storage for Terraform state:

```bash
# Create resource group for state
az group create --name rg-quikapp-tfstate --location eastus

# Create storage account
az storage account create \
  --name stquikapptfstate \
  --resource-group rg-quikapp-tfstate \
  --location eastus \
  --sku Standard_LRS \
  --encryption-services blob

# Create container
az storage container create \
  --name tfstate \
  --account-name stquikapptfstate
```

#### 2. Create Terraform Variable Groups

Create the following variable groups in **Pipelines → Library**:

**`quikapp-terraform-common`** (Required):
```yaml
azureServiceConnection: 'quikapp-azure-connection'  # Your Azure service connection name
tfStateResourceGroup: 'rg-quikapp-tfstate'
tfStateStorageAccount: 'stquikapptfstate'
tfStateContainer: 'tfstate'
terraformVersion: '1.5.7'
```

**Environment-specific groups** (Optional overrides):
- `quikapp-terraform-dev`
- `quikapp-terraform-qa`
- `quikapp-terraform-staging`
- `quikapp-terraform-prod`

#### 3. Create Terraform Environments

Create environments for approval gates in **Pipelines → Environments**:

| Environment | Approvers | Purpose |
|-------------|-----------|---------|
| `terraform-dev` | None | Auto-deploy to dev |
| `terraform-qa` | None | Auto-deploy to QA |
| `terraform-staging-approval` | Platform Team | Staging approval gate |
| `terraform-prod-approval` | Platform Lead, CTO | Production approval gate |
| `terraform-prod-destroy` | CTO, Security | Destroy protection |

#### 4. Import Terraform Pipelines

1. Go to **Pipelines → New Pipeline**
2. Select your repository
3. Choose **Existing Azure Pipelines YAML file**
4. Select `infrastructure/azure-pipelines/terraform-cd.yml`
5. Save and run
6. Repeat for `terraform-promote.yml`

### Using terraform-cd.yml

Single environment deployment with plan/apply/destroy actions.

#### Parameters

| Parameter | Options | Description |
|-----------|---------|-------------|
| `environment` | dev, qa, uat1-3, staging, prod, live | Target environment |
| `action` | plan, apply, destroy | Terraform action |
| `autoApprove` | true/false | Skip approval for dev/qa |
| `destroyConfirm` | environment name | Confirm destroy (must match environment) |

#### Examples

**Plan only (review changes):**
```yaml
# Run with:
#   environment: dev
#   action: plan
```

**Deploy to Dev (auto-approve):**
```yaml
# Run with:
#   environment: dev
#   action: apply
#   autoApprove: true
```

**Deploy to Production (requires approval):**
```yaml
# Run with:
#   environment: prod
#   action: apply
#   autoApprove: false
```

**Destroy Dev environment:**
```yaml
# Run with:
#   environment: dev
#   action: destroy
#   destroyConfirm: dev
```

### Using terraform-promote.yml

Progressive deployment through multiple environments.

#### Parameters

| Parameter | Options | Description |
|-----------|---------|-------------|
| `startEnvironment` | dev, qa, staging, prod | Start deployment from |
| `stopEnvironment` | dev, qa, staging, prod | Stop deployment at |

#### Examples

**Full promotion (dev → prod):**
```yaml
# Run with:
#   startEnvironment: dev
#   stopEnvironment: prod
```

**Deploy only to staging:**
```yaml
# Run with:
#   startEnvironment: staging
#   stopEnvironment: staging
```

**Dev and QA only:**
```yaml
# Run with:
#   startEnvironment: dev
#   stopEnvironment: qa
```

### Pipeline Stages

#### terraform-cd.yml Flow

```
Validate → Plan → Apply (or ApplyWithApproval) → Outputs
                    ↓
               Destroy (if action=destroy)
```

#### terraform-promote.yml Flow

```
Validate → Dev Plan → Dev Apply → QA Plan → QA Apply →
           Staging Plan → Staging Apply (approval) →
           Prod Plan → Prod Apply (approval) → Summary
```

### Terraform Outputs

After successful deployment, the pipeline displays:

```
==========================================
KEY OUTPUTS
==========================================
AKS Cluster: aks-quikapp-dev
ACR Login Server: acrquikappdev.azurecr.io
Key Vault URI: https://kv-quikapp-dev.vault.azure.net/

Get AKS credentials:
az aks get-credentials --resource-group rg-quikapp-dev --name aks-quikapp-dev
```

### Post-Deployment Steps

After infrastructure deployment:

1. **Get AKS Credentials:**
   ```bash
   az aks get-credentials --resource-group rg-quikapp-dev --name aks-quikapp-dev
   ```

2. **Login to ACR:**
   ```bash
   az acr login --name acrquikappdev
   ```

3. **Verify Key Vault Access:**
   ```bash
   az keyvault secret list --vault-name kv-quikapp-dev
   ```

4. **Update Application Variable Groups:**
   Update `QuikApp-Dev-Variables` with new infrastructure values:
   - `aksCluster`: from terraform output
   - `resourceGroup`: from terraform output
   - Key Vault secrets linked automatically

### Terraform Environment Configurations

| Feature | Dev | QA | Staging | Production |
|---------|-----|-----|---------|------------|
| AKS SKU | Free | Free | Standard | Standard |
| AKS Nodes | 1-3 | 1-3 | 2-5 | 3-10 |
| ACR SKU | Basic | Basic | Standard | Premium |
| ACR Geo-Replication | No | No | No | Yes |
| Key Vault SKU | Standard | Standard | Standard | Premium |
| Purge Protection | No | No | Yes | Yes |
| Private Endpoints | No | No | Yes | Yes |
| Log Retention | 14 days | 30 days | 60 days | 90 days |

### Terraform Troubleshooting

#### State Lock Error
```bash
# View locks
az storage blob show \
  --account-name stquikapptfstate \
  --container-name tfstate \
  --name quikapp-dev.tfstate

# Force unlock (use with caution)
terraform force-unlock <LOCK_ID>
```

#### Plan Shows Unexpected Changes
```bash
# Refresh state
terraform refresh -var-file=environments/dev.tfvars

# Import existing resource
terraform import -var-file=environments/dev.tfvars \
  module.aks[0].azurerm_kubernetes_cluster.aks \
  /subscriptions/.../resourceGroups/.../providers/Microsoft.ContainerService/managedClusters/aks-quikapp-dev
```

#### Key Vault Soft-Deleted
```bash
# List soft-deleted vaults
az keyvault list-deleted

# Recover vault
az keyvault recover --name kv-quikapp-dev

# Purge vault (if needed)
az keyvault purge --name kv-quikapp-dev --location eastus
```

#### AKS Version Not Available
```bash
# List available versions
az aks get-versions --location eastus --output table

# Update kubernetes_version in tfvars
```

#### Service Connection Permission Denied
1. Check service principal has required roles:
   - Contributor on subscription/resource group
   - User Access Administrator (for RBAC assignments)
2. Verify service connection in Azure DevOps:
   - Project Settings → Service connections → Edit → Verify

#### Pipeline Agent Cannot Reach Azure
1. Check agent network connectivity
2. Verify firewall rules allow Azure CLI/Terraform
3. Try Microsoft-hosted agents if using self-hosted

---

## Kubernetes Deployment Pipelines

The Kubernetes pipelines deploy microservices to AKS using Kustomize.

### Pipeline Overview

| Pipeline | Purpose | Trigger |
|----------|---------|---------|
| `kubernetes-cd.yml` | Single environment K8s deployment | Manual / On CI completion |
| `kubernetes-promote.yml` | Multi-environment promotion | Manual only |

### Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        AKS Cluster                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                  quikapp Namespace                        │   │
│  │                                                           │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐      │   │
│  │  │  Gateway    │  │   Auth      │  │   User      │      │   │
│  │  │  (NestJS)   │  │  (Spring)   │  │  (Spring)   │      │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘      │   │
│  │                                                           │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐      │   │
│  │  │ Workspace   │  │  Channel    │  │  Search     │      │   │
│  │  │    (Go)     │  │    (Go)     │  │    (Go)     │      │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘      │   │
│  │                                                           │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐      │   │
│  │  │  Presence   │  │  Message    │  │   Call      │      │   │
│  │  │  (Elixir)   │  │  (Elixir)   │  │  (Elixir)   │      │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘      │   │
│  │                                                           │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐      │   │
│  │  │ Analytics   │  │     ML      │  │ Moderation  │      │   │
│  │  │  (Python)   │  │  (Python)   │  │  (Python)   │      │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘      │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Kubernetes Pipeline Files

#### Main Pipelines
- **`kubernetes-cd.yml`** - Deploy, preview, rollback, restart, or scale
- **`kubernetes-promote.yml`** - Promote through environments with approvals

#### Templates
- **`templates/kubernetes-deploy.yml`** - Kustomize build and deploy
- **`templates/kubernetes-healthcheck.yml`** - Post-deployment verification
- **`templates/kubernetes-canary.yml`** - Canary deployment strategy

### Kubernetes Setup

#### 1. Create AKS Service Connections

Create Kubernetes service connections in **Project Settings → Service connections**:

| Service Connection | AKS Cluster | Environments |
|-------------------|-------------|--------------|
| `quikapp-aks-dev` | aks-quikapp-dev | dev |
| `quikapp-aks-qa` | aks-quikapp-qa | qa |
| `quikapp-aks-uat` | aks-quikapp-uat | uat1, uat2, uat3 |
| `quikapp-aks-staging` | aks-quikapp-staging | staging |
| `quikapp-aks-prod` | aks-quikapp-prod | prod, live |

**To create a Kubernetes service connection:**
1. Go to **Project Settings → Service connections**
2. Click **New service connection → Kubernetes**
3. Select **Azure Subscription** authentication
4. Choose your subscription and AKS cluster
5. Set namespace to `quikapp` or environment-specific
6. Name it (e.g., `quikapp-aks-dev`)
7. Grant access to all pipelines

#### 2. Create Kubernetes Variable Groups

Create the following in **Pipelines → Library**:

**`quikapp-kubernetes-common`:**
```yaml
acrName: 'quikapp'
acrLoginServer: 'quikapp.azurecr.io'
defaultImageTag: 'latest'
kustomizeVersion: '5.0.0'
deploymentTimeout: '600'
healthCheckEndpoint: '/health'
```

**`quikapp-kubernetes-nonprod`** (dev, qa):
```yaml
defaultCpuRequest: '50m'
defaultMemoryRequest: '128Mi'
defaultMinReplicas: '1'
defaultMaxReplicas: '3'
cpuTargetUtilization: '80'
```

**`quikapp-kubernetes-preprod`** (uat, staging):
```yaml
defaultCpuRequest: '100m'
defaultMemoryRequest: '256Mi'
defaultMinReplicas: '2'
defaultMaxReplicas: '8'
cpuTargetUtilization: '70'
```

**`quikapp-kubernetes-prod`** (prod, live):
```yaml
defaultCpuRequest: '200m'
defaultMemoryRequest: '512Mi'
defaultMinReplicas: '3'
defaultMaxReplicas: '20'
cpuTargetUtilization: '60'
enablePodDisruptionBudget: 'true'
```

#### 3. Create Kubernetes Environments

Create environments in **Pipelines → Environments**:

| Environment | Approvers | Purpose |
|-------------|-----------|---------|
| `quikapp-dev` | None | Auto-deploy |
| `quikapp-qa` | QA Lead | QA approval |
| `quikapp-uat1` | Product Owner | Partner testing |
| `quikapp-uat2` | Product Owner | Internal QA |
| `quikapp-uat3` | Product Owner | Load testing |
| `quikapp-staging` | Release Manager | Pre-prod |
| `quikapp-prod` | CAB, CTO | Production |
| `quikapp-live` | CAB, CTO | Production alias |

#### 4. Import Kubernetes Pipelines

1. **Pipelines → New Pipeline**
2. Select repository
3. Choose **Existing Azure Pipelines YAML file**
4. Select `infrastructure/azure-pipelines/kubernetes-cd.yml`
5. Save and run
6. Repeat for `kubernetes-promote.yml`

### Using kubernetes-cd.yml

Deploy, preview, rollback, restart, or scale services.

#### Parameters

| Parameter | Options | Description |
|-----------|---------|-------------|
| `environment` | dev, qa, uat1-3, staging, prod, live | Target environment |
| `action` | deploy, preview, rollback, restart, scale | Deployment action |
| `services` | service names or "all" | Services to deploy |
| `imageTag` | tag name | Image tag (optional) |
| `rollbackRevision` | revision number | Rollback target (0 = previous) |
| `replicaCount` | number | Scale replica count |

#### Examples

**Deploy all services to dev:**
```yaml
# Run with:
#   environment: dev
#   action: deploy
#   services: all
```

**Deploy specific service with custom tag:**
```yaml
# Run with:
#   environment: qa
#   action: deploy
#   services: backend-gateway,auth-service
#   imageTag: v1.2.3
```

**Preview changes (dry run):**
```yaml
# Run with:
#   environment: staging
#   action: preview
#   services: all
```

**Rollback to previous version:**
```yaml
# Run with:
#   environment: prod
#   action: rollback
#   services: backend-gateway
```

**Rollback to specific revision:**
```yaml
# Run with:
#   environment: prod
#   action: rollback
#   services: auth-service
#   rollbackRevision: 5
```

**Restart deployments (rolling restart):**
```yaml
# Run with:
#   environment: qa
#   action: restart
#   services: realtime-service,presence-service
```

**Scale service:**
```yaml
# Run with:
#   environment: staging
#   action: scale
#   services: backend-gateway
#   replicaCount: 5
```

### Using kubernetes-promote.yml

Promote deployments through environments with approvals.

#### Parameters

| Parameter | Options | Description |
|-----------|---------|-------------|
| `sourceEnvironment` | dev, qa, staging | Source environment |
| `targetEnvironments` | array of environments | Targets to deploy |
| `services` | service names or "all" | Services to promote |
| `imageTag` | tag name | Image tag to promote |
| `skipTests` | true/false | Skip integration tests |
| `useCanary` | true/false | Use canary for staging/prod |

#### Examples

**Promote from dev to qa:**
```yaml
# Run with:
#   sourceEnvironment: dev
#   targetEnvironments: [qa]
#   services: all
#   imageTag: v1.2.3
```

**Promote through staging to prod:**
```yaml
# Run with:
#   sourceEnvironment: qa
#   targetEnvironments: [staging, prod]
#   services: all
#   imageTag: v1.2.3
#   useCanary: true
```

**Promote specific services:**
```yaml
# Run with:
#   sourceEnvironment: dev
#   targetEnvironments: [qa, staging]
#   services: backend-gateway,auth-service
#   imageTag: v1.2.3
```

### Pipeline Stages

#### kubernetes-cd.yml Flow

```
Validate → Deploy → Verify
    │
    └── Preview (if action=preview)
    └── Rollback (if action=rollback)
    └── Restart (if action=restart)
    └── Scale (if action=scale)
```

#### kubernetes-promote.yml Flow

```
Validate Images → Deploy Dev → Health Check →
                  Deploy QA → Health Check → Integration Tests →
                  [Approval] → Deploy Staging → Health Check →
                  [Approval] → Deploy Prod (Canary) → Health Check →
                  Summary
```

### Kustomize Overlays

The pipeline uses Kustomize overlays for environment configuration:

| Environment | Overlay | Namespace | Replicas | Resources |
|-------------|---------|-----------|----------|-----------|
| dev | `overlays/dev` | quikapp-dev | 1 | Minimal |
| qa | `overlays/qa` | quikapp-qa | 1-2 | Low |
| staging | `overlays/staging` | quikapp-staging | 2 | Moderate |
| prod | `overlays/prod` | quikapp | 3+ | Full |

### Deployment Strategies

#### Standard Deployment (dev, qa)
- Direct rolling update
- Immediate deployment

#### Canary Deployment (staging, prod)
- Deploy canary replica first
- Monitor for errors (5 minutes)
- Promote to main deployment
- Cleanup canary

### Health Checks

Post-deployment verification includes:

1. **Pod Status** - All pods running
2. **Unhealthy Pods** - Check for crashes/restarts
3. **Service Endpoints** - Services have endpoints
4. **HPA Status** - Autoscaler operational
5. **PDB Status** - Disruption budgets applied
6. **Recent Events** - No error events

### Services Reference

| Service | Tech | Port | Health Endpoint |
|---------|------|------|-----------------|
| backend-gateway | NestJS | 3000 | /health |
| auth-service | Spring | 8080 | /actuator/health |
| user-service | Spring | 8080 | /actuator/health |
| workspace-service | Go | 8080 | /health |
| channel-service | Go | 8080 | /health |
| presence-service | Elixir | 4000 | /health |
| message-service | Elixir | 4000 | /health |
| analytics-service | Python | 8000 | /health |
| ml-service | Python | 8000 | /health |

### Kubernetes Troubleshooting

#### Deployment Timeout
```bash
# Check pod status
kubectl get pods -n quikapp-dev -o wide

# Check deployment status
kubectl rollout status deployment/backend-gateway -n quikapp-dev

# View events
kubectl get events -n quikapp-dev --sort-by=.lastTimestamp
```

#### ImagePullBackOff
```bash
# Verify image exists in ACR
az acr repository show-tags --name quikapp --repository backend-gateway

# Check pod details
kubectl describe pod <pod-name> -n quikapp-dev

# Verify ACR pull secret
kubectl get secrets -n quikapp-dev
```

#### CrashLoopBackOff
```bash
# View pod logs
kubectl logs -f <pod-name> -n quikapp-dev

# View previous container logs
kubectl logs --previous <pod-name> -n quikapp-dev

# Check resource constraints
kubectl top pods -n quikapp-dev
```

#### Service Endpoints Empty
```bash
# Check service selector
kubectl describe service backend-gateway -n quikapp-dev

# Check pod labels
kubectl get pods -n quikapp-dev --show-labels

# Check endpoints
kubectl get endpoints backend-gateway -n quikapp-dev
```

#### HPA Not Scaling
```bash
# Check HPA status
kubectl get hpa -n quikapp-dev

# Describe HPA
kubectl describe hpa backend-gateway-hpa -n quikapp-dev

# Check metrics server
kubectl get --raw "/apis/metrics.k8s.io/v1beta1/pods" | jq
```

#### Network Policy Blocking Traffic
```bash
# List network policies
kubectl get networkpolicies -n quikapp-dev

# Test connectivity
kubectl exec -it <pod> -n quikapp-dev -- curl http://auth-service/health
```

#### Rollback Issues
```bash
# Check rollout history
kubectl rollout history deployment/backend-gateway -n quikapp-dev

# Rollback manually
kubectl rollout undo deployment/backend-gateway -n quikapp-dev

# Rollback to specific revision
kubectl rollout undo deployment/backend-gateway -n quikapp-dev --to-revision=3
```

### Best Practices

1. **Always preview first** - Use `action: preview` before deploying to staging/prod
2. **Use specific image tags** - Avoid `latest` in production
3. **Monitor canary** - Watch metrics during canary deployment
4. **Keep PDBs** - Ensure pod disruption budgets for availability
5. **Review health checks** - Verify all services pass health checks
6. **Document rollbacks** - Keep track of rollback reasons

---

## Docker CI Pipeline

The Docker CI pipeline builds and pushes container images to Azure Container Registry.

### Pipeline Overview

| Pipeline | Purpose | Trigger |
|----------|---------|---------|
| `docker-ci.yml` | Build and push Docker images | On push to services/**, PR to main/develop |

### Build Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Docker CI Pipeline                           │
│                                                                  │
│  ┌─────────────┐                                                │
│  │   Detect    │ ← Detect changed services                      │
│  │   Changes   │                                                │
│  └──────┬──────┘                                                │
│         │                                                        │
│         ▼                                                        │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Parallel Build Stages                        │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐     │   │
│  │  │  Spring  │ │  NestJS  │ │    Go    │ │  Elixir  │     │   │
│  │  │   Boot   │ │          │ │          │ │          │     │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘     │   │
│  │  ┌──────────┐                                             │   │
│  │  │  Python  │                                             │   │
│  │  └──────────┘                                             │   │
│  └──────────────────────────────────────────────────────────┘   │
│         │                                                        │
│         ▼                                                        │
│  ┌─────────────┐                                                │
│  │   Summary   │ → Build manifest artifact                      │
│  └─────────────┘                                                │
└─────────────────────────────────────────────────────────────────┘
```

### Pipeline Files

#### Main Pipeline
- **`docker-ci.yml`** - Main CI pipeline with change detection and parallel builds

#### Build Templates
- **`templates/docker-build-springboot.yml`** - Spring Boot image build
- **`templates/docker-build-nestjs.yml`** - NestJS image build
- **`templates/docker-build-go.yml`** - Go image build
- **`templates/docker-build-elixir.yml`** - Elixir image build
- **`templates/docker-build-python.yml`** - Python image build

#### Dockerfiles
- **`docker/springboot/Dockerfile`** - Multi-stage Spring Boot build
- **`docker/nestjs/Dockerfile`** - Multi-stage NestJS build
- **`docker/go/Dockerfile`** - Multi-stage Go build (scratch base)
- **`docker/elixir/Dockerfile`** - Multi-stage Elixir/Phoenix build
- **`docker/python/Dockerfile`** - Multi-stage Python/FastAPI build

### CI Setup

#### 1. Create ACR Service Connection

Create a Docker Registry service connection in **Project Settings → Service connections**:

1. Click **New service connection**
2. Select **Docker Registry**
3. Select **Azure Container Registry**
4. Choose your subscription and ACR (quikapp)
5. Name it `quikapp-acr-connection`
6. Grant access to all pipelines

#### 2. Create CI Variable Groups

Create the following in **Pipelines → Library**:

**`quikapp-ci-common`:**
```yaml
acrName: 'quikapp'
acrLoginServer: 'quikapp.azurecr.io'
acrServiceConnection: 'quikapp-acr-connection'
defaultImageTag: 'latest'
trivySeverity: 'HIGH,CRITICAL'
```

**Tech stack variable groups** (optional overrides):
- `quikapp-ci-springboot` - Java/Maven versions
- `quikapp-ci-nestjs` - Node.js version
- `quikapp-ci-go` - Go version
- `quikapp-ci-elixir` - Elixir/OTP versions
- `quikapp-ci-python` - Python version

#### 3. Import CI Pipeline

1. **Pipelines → New Pipeline**
2. Select repository
3. Choose **Existing Azure Pipelines YAML file**
4. Select `infrastructure/azure-pipelines/docker-ci.yml`
5. Save and run

### Using docker-ci.yml

Build and push Docker images to ACR.

#### Parameters

| Parameter | Options | Description |
|-----------|---------|-------------|
| `services` | service names, "all", or "changed" | Services to build |
| `pushImages` | true/false | Push to ACR |
| `tagStrategy` | auto, semver, commit, custom | Image tag strategy |
| `customTag` | tag name | Custom tag (when tagStrategy=custom) |
| `platforms` | linux/amd64, linux/amd64,linux/arm64 | Target platforms |
| `scanImages` | true/false | Run Trivy security scan |

#### Tag Strategy

| Strategy | Branch | Tag |
|----------|--------|-----|
| auto | main | latest |
| auto | develop | dev |
| auto | feature/xyz | feature-xyz |
| auto | release/1.2.3 | 1.2.3 |
| auto | hotfix/fix | hotfix-fix |
| semver | v1.2.3 (tag) | 1.2.3 |
| commit | any | commit SHA |
| custom | any | customTag parameter |

#### Examples

**Build changed services only (default):**
```yaml
# Triggered automatically on push
# Run with defaults - builds only changed services
```

**Build all services:**
```yaml
# Run with:
#   services: all
#   pushImages: true
#   tagStrategy: auto
```

**Build specific services:**
```yaml
# Run with:
#   services: backend-gateway,auth-service,user-service
#   pushImages: true
#   tagStrategy: auto
```

**Build with custom tag:**
```yaml
# Run with:
#   services: all
#   pushImages: true
#   tagStrategy: custom
#   customTag: v1.2.3-rc1
```

**Build without pushing (test only):**
```yaml
# Run with:
#   services: backend-gateway
#   pushImages: false
#   scanImages: true
```

**Build for PR (no push):**
```yaml
# Triggered automatically on PR
# pushImages: false by default for PRs
```

### Build Process

Each tech stack follows this process:

1. **Setup** - Install language/runtime
2. **Cache** - Restore dependency cache
3. **Test** - Run unit tests
4. **Build** - Build application
5. **Docker Build** - Build container image
6. **Security Scan** - Trivy vulnerability scan
7. **Push** - Push to ACR (if enabled)

### Services Reference

| Service | Tech Stack | Dockerfile |
|---------|-----------|------------|
| auth-service | Spring Boot | docker/springboot/Dockerfile |
| user-service | Spring Boot | docker/springboot/Dockerfile |
| permission-service | Spring Boot | docker/springboot/Dockerfile |
| audit-service | Spring Boot | docker/springboot/Dockerfile |
| admin-service | Spring Boot | docker/springboot/Dockerfile |
| backend-gateway | NestJS | docker/nestjs/Dockerfile |
| notification-service | NestJS | docker/nestjs/Dockerfile |
| realtime-service | NestJS | docker/nestjs/Dockerfile |
| workspace-service | Go | docker/go/Dockerfile |
| channel-service | Go | docker/go/Dockerfile |
| thread-service | Go | docker/go/Dockerfile |
| search-service | Go | docker/go/Dockerfile |
| file-service | Go | docker/go/Dockerfile |
| media-service | Go | docker/go/Dockerfile |
| presence-service | Elixir | docker/elixir/Dockerfile |
| message-service | Elixir | docker/elixir/Dockerfile |
| call-service | Elixir | docker/elixir/Dockerfile |
| huddle-service | Elixir | docker/elixir/Dockerfile |
| analytics-service | Python | docker/python/Dockerfile |
| ml-service | Python | docker/python/Dockerfile |
| moderation-service | Python | docker/python/Dockerfile |
| sentiment-service | Python | docker/python/Dockerfile |

### Security Scanning

Trivy scans each image for vulnerabilities:

- Scans for HIGH and CRITICAL severity issues
- Generates SARIF report as artifact
- Does not fail build (warning only)
- Reports published to Azure DevOps

### CI Troubleshooting

#### Build Fails - Dependency Download
```bash
# Clear pipeline cache
# Re-run with fresh cache
```

#### ACR Push Fails - Authentication
```bash
# Verify service connection
# Check ACR permissions
az acr show --name quikapp --query loginServer
az acr repository list --name quikapp
```

#### Trivy Scan Timeout
```bash
# Increase scan timeout in pipeline
# Check image size
docker images | grep quikapp
```

#### No Services Detected
```bash
# Check git diff
git diff --name-only HEAD~1

# Force build all
# Run with services: all
```

#### Image Size Too Large
```bash
# Check Dockerfile layers
docker history quikapp.azurecr.io/service:tag

# Use multi-stage builds
# Add .dockerignore
```

### Best Practices

1. **Use change detection** - Only build changed services
2. **Tag properly** - Use semantic versioning for releases
3. **Scan images** - Always run security scans
4. **Cache dependencies** - Enable pipeline caching
5. **Multi-stage builds** - Keep images small
6. **Non-root users** - Run containers as non-root
7. **Health checks** - Include HEALTHCHECK in Dockerfiles
