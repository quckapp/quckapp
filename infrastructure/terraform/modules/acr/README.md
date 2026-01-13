# Azure Container Registry (ACR) Terraform Module

This module provisions an Azure Container Registry with production-ready configurations for QuikApp environments.

## Features

- Multiple SKU tiers (Basic, Standard, Premium)
- Geo-replication for high availability (Premium)
- Private endpoint support
- Network rules and firewall
- Retention policies for untagged images
- Content trust (image signing)
- Customer-managed key encryption
- Webhooks for CI/CD integration
- Scope maps and tokens for fine-grained access
- Azure Monitor diagnostics

## Usage

### Basic Usage (Development)

```hcl
module "acr_dev" {
  source = "./modules/acr"

  name                = "quikappdev"
  resource_group_name = "rg-quikapp-dev"
  location            = "eastus"
  environment         = "dev"
  sku                 = "Basic"

  admin_enabled = true  # For easy local development

  tags = {
    Project = "QuikApp"
  }
}
```

### Standard Usage (QA/UAT)

```hcl
module "acr_qa" {
  source = "./modules/acr"

  name                = "quikappqa"
  resource_group_name = "rg-quikapp-qa"
  location            = "eastus"
  environment         = "qa"
  sku                 = "Standard"

  admin_enabled = false

  # Webhooks for CI/CD
  webhooks = {
    azure-devops = {
      service_uri = "https://dev.azure.com/quikapp/_apis/..."
      actions     = ["push"]
    }
  }

  tags = {
    Project = "QuikApp"
  }
}
```

### Production Usage (Premium with Geo-Replication)

```hcl
module "acr_prod" {
  source = "./modules/acr"

  name                = "quikappprod"
  resource_group_name = "rg-quikapp-prod"
  location            = "eastus"
  environment         = "prod"
  sku                 = "Premium"

  admin_enabled                 = false
  public_network_access_enabled = false
  zone_redundancy_enabled       = true

  # Geo-replication
  georeplications = [
    {
      location                  = "westus2"
      zone_redundancy_enabled   = true
      regional_endpoint_enabled = true
    },
    {
      location                  = "westeurope"
      zone_redundancy_enabled   = true
      regional_endpoint_enabled = true
    }
  ]

  # Private endpoint
  private_endpoint_enabled   = true
  private_endpoint_subnet_id = "/subscriptions/.../subnets/acr-subnet"

  # Retention policy
  retention_policy_enabled = true
  retention_policy_days    = 30

  # Content trust
  trust_policy_enabled = true

  # Network rules
  network_rule_set_enabled    = true
  network_rule_default_action = "Deny"
  allowed_subnet_ids          = ["/subscriptions/.../subnets/aks-subnet"]

  # Diagnostics
  diagnostic_settings_enabled    = true
  log_analytics_workspace_id     = "/subscriptions/.../workspaces/law-quikapp"

  tags = {
    Project     = "QuikApp"
    Environment = "Production"
    CostCenter  = "Platform"
  }
}
```

### With Customer-Managed Key Encryption

```hcl
module "acr_encrypted" {
  source = "./modules/acr"

  name                = "quikappencrypted"
  resource_group_name = "rg-quikapp-secure"
  location            = "eastus"
  environment         = "prod"
  sku                 = "Premium"

  # Encryption
  encryption_enabled            = true
  encryption_key_vault_key_id   = azurerm_key_vault_key.acr.id
  encryption_identity_client_id = azurerm_user_assigned_identity.acr.client_id

  identity_type = "UserAssigned"
  identity_ids  = [azurerm_user_assigned_identity.acr.id]
}
```

## SKU Comparison

| Feature | Basic | Standard | Premium |
|---------|-------|----------|---------|
| Storage | 10 GiB | 100 GiB | 500 GiB |
| Throughput | Low | Medium | High |
| Geo-replication | No | No | Yes |
| Private Link | No | No | Yes |
| Content Trust | No | No | Yes |
| Customer-managed keys | No | No | Yes |
| Zone redundancy | No | No | Yes |
| Retention policy | No | No | Yes |
| Dedicated data endpoints | No | No | Yes |

## Environment Recommendations

| Environment | SKU | Features |
|-------------|-----|----------|
| local/dev | Basic | Admin enabled, public access |
| qa | Standard | Webhooks, diagnostics |
| uat1/2/3 | Standard | Same as QA |
| staging | Premium | Private endpoint, retention policy |
| prod/live | Premium | Geo-replication, private endpoint, zone redundancy |

## Integrating with AKS

### Option 1: Attach ACR to AKS (Recommended)

```hcl
module "aks" {
  source = "./modules/aks"
  # ... other config ...

  acr_id = module.acr.id
}
```

### Option 2: Manual Role Assignment

```hcl
resource "azurerm_role_assignment" "aks_acr" {
  scope                = module.acr.id
  role_definition_name = "AcrPull"
  principal_id         = module.aks.kubelet_identity.object_id
}
```

### Option 3: Using Azure CLI

```bash
az aks update -n <aks-name> -g <rg-name> --attach-acr <acr-name>
```

## Azure DevOps Integration

### Creating Docker Registry Service Connection

1. Go to Project Settings → Service Connections
2. New Service Connection → Docker Registry
3. Select "Azure Container Registry"
4. Choose subscription and registry
5. Name it: `ACR-QuikApp-<env>`

### Pipeline Usage

```yaml
- task: Docker@2
  inputs:
    containerRegistry: 'ACR-QuikApp-prod'
    repository: 'backend-gateway'
    command: 'buildAndPush'
    Dockerfile: 'services/nestjs/backend-gateway/Dockerfile'
    tags: |
      $(Build.BuildId)
      latest
```

## GitHub Actions Integration

```yaml
- name: Login to ACR
  uses: azure/docker-login@v1
  with:
    login-server: ${{ secrets.ACR_LOGIN_SERVER }}
    username: ${{ secrets.ACR_USERNAME }}
    password: ${{ secrets.ACR_PASSWORD }}

- name: Build and push
  run: |
    docker build -t ${{ secrets.ACR_LOGIN_SERVER }}/myapp:${{ github.sha }} .
    docker push ${{ secrets.ACR_LOGIN_SERVER }}/myapp:${{ github.sha }}
```

## Webhook Configuration

### Azure DevOps

```hcl
webhooks = {
  azure-devops-push = {
    service_uri = "https://dev.azure.com/{org}/{project}/_apis/public/distributedtask/webhooks/{webhook}?api-version=6.0-preview"
    actions     = ["push"]
    custom_headers = {
      "Authorization" = "Basic ${base64encode(":${var.ado_pat}")}"
    }
  }
}
```

### GitHub Actions

```hcl
webhooks = {
  github-dispatch = {
    service_uri = "https://api.github.com/repos/{owner}/{repo}/dispatches"
    actions     = ["push"]
    custom_headers = {
      "Authorization" = "token ${var.github_token}"
      "Accept"        = "application/vnd.github.v3+json"
    }
  }
}
```

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|----------|
| name | Registry name (alphanumeric only) | string | - | yes |
| resource_group_name | Resource group name | string | - | yes |
| location | Azure region | string | - | yes |
| environment | Environment name | string | - | yes |
| sku | SKU tier (Basic, Standard, Premium) | string | "Standard" | no |
| admin_enabled | Enable admin user | bool | false | no |
| georeplications | Geo-replication config (Premium) | list(object) | [] | no |
| private_endpoint_enabled | Enable private endpoint | bool | false | no |
| retention_policy_days | Days to retain untagged manifests | number | 7 | no |

See `variables.tf` for the complete list.

## Outputs

| Name | Description |
|------|-------------|
| id | Registry ID |
| name | Registry name |
| login_server | Login server URL |
| admin_username | Admin username (if enabled) |
| admin_password | Admin password (if enabled) |
| identity | Managed identity info |
| docker_login_command | Azure CLI login command |
| aks_attach_command | Command to attach to AKS |

See `outputs.tf` for the complete list.

## Security Best Practices

1. **Disable admin account** in production - use Azure AD or managed identities
2. **Enable private endpoints** for production registries
3. **Use network rules** to restrict access to known subnets
4. **Enable retention policies** to automatically clean up old images
5. **Use content trust** for image signing in production
6. **Enable diagnostics** for audit logging
7. **Use geo-replication** for disaster recovery
8. **Implement RBAC** with scope maps for fine-grained access

## Troubleshooting

### Cannot pull images from AKS

```bash
# Check AKS-ACR integration
az aks check-acr --name <aks-name> --resource-group <rg> --acr <acr-name>

# Verify role assignment
az role assignment list --scope <acr-id> --query "[?principalId=='<kubelet-identity>']"
```

### Network connectivity issues

```bash
# Test from within AKS pod
kubectl run test --rm -it --image=mcr.microsoft.com/azure-cli -- az acr login --name <acr-name>
```

### Webhook not triggering

```bash
# Check webhook status
az acr webhook list --registry <acr-name> -o table

# Test webhook manually
az acr webhook ping --name <webhook-name> --registry <acr-name>
```
