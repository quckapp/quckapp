# Azure Key Vault Terraform Module

Terraform module for creating and managing Azure Key Vault with secrets, keys, certificates, RBAC, and private endpoints.

## Features

- Azure Key Vault with configurable SKU (Standard/Premium)
- RBAC authorization (recommended) or access policies
- Secrets management with user-provided and auto-generated secrets
- Cryptographic keys (RSA, RSA-HSM, EC, EC-HSM)
- Certificate import and management
- Private endpoint support with DNS zones
- Diagnostic settings for Log Analytics and Storage
- AKS CSI driver integration output
- Azure DevOps variable group integration

## Requirements

| Name | Version |
|------|---------|
| terraform | >= 1.5.0 |
| azurerm | >= 3.80.0 |
| random | >= 3.5.0 |

## Usage

### Basic Usage

```hcl
module "keyvault" {
  source = "./modules/keyvault"

  name                = "kv-quikapp-dev"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  environment         = "dev"

  tags = {
    Application = "QuikApp"
  }
}
```

### With Generated Secrets

```hcl
module "keyvault" {
  source = "./modules/keyvault"

  name                = "kv-quikapp-dev"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  environment         = "dev"

  # Auto-generate secrets with random passwords
  generated_secrets = {
    "jwt-secret" = {
      length       = 64
      special      = true
      content_type = "JWT signing key"
    }
    "jwt-refresh-secret" = {
      length       = 64
      special      = true
      content_type = "JWT refresh signing key"
    }
    "encryption-key" = {
      length       = 32
      special      = false
      content_type = "AES encryption key"
    }
  }
}
```

### With User-Provided Secrets

```hcl
module "keyvault" {
  source = "./modules/keyvault"

  name                = "kv-quikapp-dev"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  environment         = "dev"

  # Store existing secrets
  secrets = {
    "mongodb-connection-string" = {
      value        = var.mongodb_uri
      content_type = "MongoDB connection string"
      tags = {
        Service = "Database"
      }
    }
    "sendgrid-api-key" = {
      value        = var.sendgrid_api_key
      content_type = "SendGrid API key"
      tags = {
        Service = "Email"
      }
    }
  }
}
```

### With Cryptographic Keys

```hcl
module "keyvault" {
  source = "./modules/keyvault"

  name                = "kv-quikapp-prod"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  environment         = "prod"
  sku_name            = "premium"  # Required for HSM keys

  keys = {
    "data-encryption-key" = {
      key_type = "RSA"
      key_size = 4096
      key_opts = ["encrypt", "decrypt", "wrapKey", "unwrapKey"]
    }
    "signing-key" = {
      key_type = "EC"
      curve    = "P-256"
      key_opts = ["sign", "verify"]
    }
    "hsm-master-key" = {
      key_type = "RSA-HSM"
      key_size = 2048
      key_opts = ["encrypt", "decrypt", "wrapKey", "unwrapKey"]
    }
  }
}
```

### With RBAC Role Assignments

```hcl
module "keyvault" {
  source = "./modules/keyvault"

  name                = "kv-quikapp-prod"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  environment         = "prod"

  enable_rbac_authorization = true

  role_assignments = {
    "backend-api" = {
      principal_id         = module.aks.kubelet_identity_object_id
      role_definition_name = "Key Vault Secrets User"
      description          = "AKS workload identity for backend API"
    }
    "devops-pipeline" = {
      principal_id         = var.devops_service_principal_id
      role_definition_name = "Key Vault Secrets Officer"
      description          = "Azure DevOps pipeline for secret rotation"
    }
    "security-admin" = {
      principal_id         = var.security_admin_group_id
      role_definition_name = "Key Vault Administrator"
      description          = "Security team administrators"
    }
  }
}
```

### With Access Policies (Legacy)

```hcl
module "keyvault" {
  source = "./modules/keyvault"

  name                = "kv-quikapp-legacy"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  environment         = "dev"

  enable_rbac_authorization = false

  access_policies = [
    {
      object_id          = var.app_service_principal_id
      secret_permissions = ["Get", "List"]
      key_permissions    = ["Get", "List", "Decrypt", "Encrypt"]
    },
    {
      object_id          = var.admin_group_id
      secret_permissions = ["Get", "List", "Set", "Delete", "Purge", "Recover"]
      key_permissions    = ["Get", "List", "Create", "Delete", "Update", "Purge"]
      certificate_permissions = ["Get", "List", "Create", "Delete", "Update"]
    }
  ]
}
```

### With Private Endpoint

```hcl
module "keyvault" {
  source = "./modules/keyvault"

  name                = "kv-quikapp-prod"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  environment         = "prod"

  # Disable public access
  public_network_access_enabled = false
  network_acls_default_action   = "Deny"

  # Enable private endpoint
  private_endpoint_enabled   = true
  private_endpoint_subnet_id = module.vnet.private_endpoints_subnet_id

  # Use existing private DNS zone (optional)
  private_dns_zone_ids = [module.private_dns.keyvault_zone_id]
}
```

### Production Configuration

```hcl
module "keyvault_prod" {
  source = "./modules/keyvault"

  name                = "kv-quikapp-prod"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  environment         = "prod"

  # Premium SKU for HSM support
  sku_name = "premium"

  # Enhanced security
  purge_protection_enabled   = true
  soft_delete_retention_days = 90

  # Network restrictions
  public_network_access_enabled = false
  network_acls_default_action   = "Deny"
  network_acls_bypass           = "AzureServices"

  # Private endpoint
  private_endpoint_enabled   = true
  private_endpoint_subnet_id = module.vnet.private_endpoints_subnet_id

  # Generated secrets
  generated_secrets = {
    "jwt-secret"         = { length = 64 }
    "jwt-refresh-secret" = { length = 64 }
    "encryption-key"     = { length = 32, special = false }
    "api-key"            = { length = 48 }
  }

  # RBAC assignments
  role_assignments = {
    "aks-workload" = {
      principal_id         = module.aks.kubelet_identity_object_id
      role_definition_name = "Key Vault Secrets User"
    }
  }

  # Diagnostics
  diagnostic_settings_enabled    = true
  log_analytics_workspace_id     = module.log_analytics.id
  storage_account_id             = module.storage.id

  # Certificate contacts
  contacts = [
    {
      email = "security@quikapp.com"
      name  = "Security Team"
    }
  ]

  tags = {
    Application   = "QuikApp"
    CostCenter    = "Production"
    DataClass     = "Confidential"
  }
}
```

## Environment-Specific Configurations

| Setting | Dev | QA | Staging | Production |
|---------|-----|-----|---------|------------|
| SKU | standard | standard | standard | premium |
| Purge Protection | false | false | true | true |
| Soft Delete Days | 7 | 30 | 90 | 90 |
| Public Access | true | true | false | false |
| Private Endpoint | false | false | true | true |
| Network ACL Default | Allow | Allow | Deny | Deny |
| Diagnostics | optional | optional | required | required |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| name | Name of the Key Vault (globally unique) | `string` | n/a | yes |
| resource_group_name | Name of the resource group | `string` | n/a | yes |
| location | Azure region | `string` | n/a | yes |
| environment | Environment name | `string` | n/a | yes |
| sku_name | SKU (standard or premium) | `string` | `"standard"` | no |
| tenant_id | Azure AD tenant ID | `string` | `null` | no |
| enable_rbac_authorization | Use RBAC instead of access policies | `bool` | `true` | no |
| purge_protection_enabled | Enable purge protection | `bool` | `true` | no |
| soft_delete_retention_days | Soft delete retention (7-90) | `number` | `90` | no |
| public_network_access_enabled | Allow public access | `bool` | `true` | no |
| network_acls_default_action | Default network action | `string` | `"Allow"` | no |
| private_endpoint_enabled | Enable private endpoint | `bool` | `false` | no |
| private_endpoint_subnet_id | Subnet for private endpoint | `string` | `null` | no |
| secrets | Map of secrets to create | `map(object)` | `{}` | no |
| generated_secrets | Map of secrets to auto-generate | `map(object)` | `{}` | no |
| keys | Map of cryptographic keys | `map(object)` | `{}` | no |
| certificates | Map of certificates to import | `map(object)` | `{}` | no |
| role_assignments | RBAC role assignments | `map(object)` | `{}` | no |
| access_policies | Access policies (when not using RBAC) | `list(object)` | `[]` | no |
| diagnostic_settings_enabled | Enable diagnostics | `bool` | `true` | no |
| log_analytics_workspace_id | Log Analytics workspace ID | `string` | `null` | no |

## Outputs

| Name | Description |
|------|-------------|
| id | The ID of the Key Vault |
| name | The name of the Key Vault |
| vault_uri | The URI of the Key Vault |
| tenant_id | The tenant ID of the Key Vault |
| secret_ids | Map of secret names to their IDs |
| secret_uris | Map of secret names to their URIs |
| generated_secret_values | Map of generated secret values (sensitive) |
| key_ids | Map of key names to their IDs |
| certificate_ids | Map of certificate names to their IDs |
| private_endpoint_id | Private endpoint ID (if enabled) |
| private_endpoint_ip | Private endpoint IP address |
| aks_secret_provider_class | Example SecretProviderClass YAML for AKS |
| azure_devops_variable_group_config | Config for Azure DevOps variable group |
| role_definitions | Common role definitions for reference |
| summary | Summary of Key Vault configuration |

## SKU Comparison

| Feature | Standard | Premium |
|---------|----------|---------|
| Secrets | Yes | Yes |
| Keys (Software) | Yes | Yes |
| Keys (HSM-backed) | No | Yes |
| Certificates | Yes | Yes |
| Price | Lower | Higher |
| SLA | 99.9% | 99.9% |

## Integration Examples

### AKS Secret Store CSI Driver

```yaml
# Use the aks_secret_provider_class output as a template
apiVersion: secrets-store.csi.x-k8s.io/v1
kind: SecretProviderClass
metadata:
  name: azure-keyvault-secrets
spec:
  provider: azure
  parameters:
    usePodIdentity: "false"
    useVMManagedIdentity: "true"
    userAssignedIdentityID: "<AKS_KUBELET_IDENTITY_CLIENT_ID>"
    keyvaultName: "kv-quikapp-prod"
    tenantId: "<TENANT_ID>"
    objects: |
      array:
        - |
          objectName: "jwt-secret"
          objectType: secret
        - |
          objectName: "mongodb-connection-string"
          objectType: secret
  secretObjects:
    - secretName: app-secrets
      type: Opaque
      data:
        - objectName: "jwt-secret"
          key: JWT_SECRET
        - objectName: "mongodb-connection-string"
          key: MONGODB_URI
```

### Azure DevOps Variable Group

1. Navigate to **Pipelines > Library > Variable groups**
2. Create a new variable group
3. Enable **Link secrets from an Azure key vault as variables**
4. Select your Azure subscription
5. Select Key Vault from the dropdown
6. Add the secrets you want to use in pipelines

### GitHub Actions

```yaml
- name: Azure Login
  uses: azure/login@v1
  with:
    creds: ${{ secrets.AZURE_CREDENTIALS }}

- name: Get Key Vault Secrets
  uses: Azure/get-keyvault-secrets@v1
  with:
    keyvault: "kv-quikapp-prod"
    secrets: 'jwt-secret, mongodb-connection-string'
  id: keyvault-secrets

- name: Use secrets
  run: |
    echo "JWT_SECRET=${{ steps.keyvault-secrets.outputs.jwt-secret }}" >> $GITHUB_ENV
```

### Application Configuration (.NET)

```csharp
// Program.cs
builder.Configuration.AddAzureKeyVault(
    new Uri("https://kv-quikapp-prod.vault.azure.net/"),
    new DefaultAzureCredential());
```

### Application Configuration (Node.js)

```javascript
const { SecretClient } = require("@azure/keyvault-secrets");
const { DefaultAzureCredential } = require("@azure/identity");

const credential = new DefaultAzureCredential();
const client = new SecretClient(
  "https://kv-quikapp-prod.vault.azure.net",
  credential
);

const secret = await client.getSecret("jwt-secret");
```

## Security Best Practices

1. **Use RBAC Authorization**: Prefer RBAC over access policies for granular control
2. **Enable Purge Protection**: Prevents accidental permanent deletion
3. **Use Private Endpoints**: Disable public access in production
4. **Rotate Secrets Regularly**: Set expiration dates and implement rotation
5. **Enable Diagnostics**: Monitor all access with Log Analytics
6. **Use Managed Identities**: Avoid storing credentials in code
7. **Principle of Least Privilege**: Grant minimum required permissions
8. **Separate Key Vaults**: Use different vaults for different environments

## Troubleshooting

### Access Denied Errors

```bash
# Check current user/service principal permissions
az keyvault show --name kv-quikapp-dev --query "properties.enableRbacAuthorization"

# If using RBAC, check role assignments
az role assignment list --scope /subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.KeyVault/vaults/{kv-name}

# If using access policies, check policies
az keyvault show --name kv-quikapp-dev --query "properties.accessPolicies"
```

### Private Endpoint DNS Issues

```bash
# Verify private endpoint is provisioned
az network private-endpoint show --name kv-quikapp-prod-pe --resource-group quikapp-prod

# Check DNS resolution
nslookup kv-quikapp-prod.vault.azure.net

# Verify private DNS zone link
az network private-dns link vnet list --zone-name privatelink.vaultcore.azure.net --resource-group quikapp-prod
```

### Secret Not Found

```bash
# List all secrets
az keyvault secret list --vault-name kv-quikapp-dev --query "[].name"

# Check secret exists and is not disabled
az keyvault secret show --vault-name kv-quikapp-dev --name jwt-secret
```

## License

MIT License - see LICENSE file for details.
