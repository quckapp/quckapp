# Azure Kubernetes Service (AKS) Terraform Module

This module provisions an Azure Kubernetes Service (AKS) cluster with production-ready configurations for QuikApp environments.

## Features

- Multi-environment support (local, dev, qa, uat1-3, staging, prod, live)
- System and user node pools with autoscaling
- Azure CNI networking with Network Security Groups
- Azure AD RBAC integration
- Azure Key Vault secrets provider
- Azure Monitor and Log Analytics integration
- Private cluster support
- Application Gateway Ingress Controller (AGIC) support
- Workload Identity and OIDC
- Maintenance windows
- Azure Policy integration

## Usage

### Basic Usage (Development)

```hcl
module "aks_dev" {
  source = "./modules/aks"

  cluster_name        = "aks-quikapp-dev"
  resource_group_name = "rg-quikapp-dev"
  location            = "eastus"
  environment         = "dev"

  # Use smaller VMs for dev
  system_node_pool_vm_size = "Standard_D2s_v3"
  system_node_pool_count   = 2
  system_node_pool_min_count = 1
  system_node_pool_max_count = 3

  tags = {
    Project = "QuikApp"
    Team    = "Platform"
  }
}
```

### Production Usage

```hcl
module "aks_prod" {
  source = "./modules/aks"

  cluster_name        = "aks-quikapp-prod"
  resource_group_name = "rg-quikapp-prod"
  location            = "eastus"
  environment         = "prod"
  kubernetes_version  = "1.28"

  # Production-grade system pool
  system_node_pool_vm_size   = "Standard_D4s_v3"
  system_node_pool_count     = 3
  system_node_pool_min_count = 3
  system_node_pool_max_count = 5

  # User node pools
  user_node_pools = {
    workloads = {
      vm_size    = "Standard_D8s_v3"
      node_count = 5
      min_count  = 5
      max_count  = 50
      node_labels = {
        "workload-type" = "general"
      }
    }
    memory = {
      vm_size    = "Standard_E8s_v3"
      node_count = 2
      min_count  = 2
      max_count  = 10
      node_labels = {
        "workload-type" = "memory-intensive"
      }
      node_taints = ["workload=memory:NoSchedule"]
    }
  }

  # Azure AD integration
  azure_ad_rbac_enabled           = true
  azure_ad_admin_group_object_ids = ["xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"]
  local_account_disabled          = true

  # ACR integration
  acr_id = "/subscriptions/.../resourceGroups/.../providers/Microsoft.ContainerRegistry/registries/quikappacr"

  # Monitoring
  oms_agent_enabled          = true
  microsoft_defender_enabled = true

  tags = {
    Project     = "QuikApp"
    Environment = "Production"
    CostCenter  = "Platform"
  }
}
```

### Private Cluster

```hcl
module "aks_private" {
  source = "./modules/aks"

  cluster_name        = "aks-quikapp-secure"
  resource_group_name = "rg-quikapp-secure"
  location            = "eastus"
  environment         = "prod"

  # Enable private cluster
  private_cluster_enabled = true

  # Use existing VNet
  vnet_id   = "/subscriptions/.../resourceGroups/.../providers/Microsoft.Network/virtualNetworks/vnet-quikapp"
  subnet_id = "/subscriptions/.../resourceGroups/.../providers/Microsoft.Network/virtualNetworks/vnet-quikapp/subnets/aks-subnet"
}
```

### With Application Gateway Ingress Controller

```hcl
module "aks_agic" {
  source = "./modules/aks"

  cluster_name        = "aks-quikapp-agic"
  resource_group_name = "rg-quikapp-agic"
  location            = "eastus"
  environment         = "staging"

  # Enable AGIC
  ingress_application_gateway_enabled   = true
  ingress_application_gateway_subnet_id = "/subscriptions/.../subnets/appgw-subnet"
}
```

## Environment Configurations

| Environment | SKU Tier | System Pool | Recommended User Pools |
|-------------|----------|-------------|------------------------|
| local | Free | Standard_D2s_v3 x 1 | None |
| dev | Free | Standard_D2s_v3 x 2 | workloads (D4s_v3) |
| qa | Free | Standard_D4s_v3 x 2 | workloads (D4s_v3) |
| uat1/2/3 | Free | Standard_D4s_v3 x 2 | workloads (D8s_v3) |
| staging | Standard | Standard_D4s_v3 x 3 | workloads, memory |
| prod/live | Standard | Standard_D4s_v3 x 3 | workloads, memory, compute, spot |

## Node Pool Recommendations

### General Workloads
```hcl
workloads = {
  vm_size    = "Standard_D8s_v3"  # 8 vCPU, 32 GiB
  min_count  = 3
  max_count  = 20
  node_labels = { "workload-type" = "general" }
}
```

### Memory-Intensive (Elasticsearch, Redis)
```hcl
memory = {
  vm_size    = "Standard_E8s_v3"  # 8 vCPU, 64 GiB
  min_count  = 2
  max_count  = 10
  node_labels = { "workload-type" = "memory-intensive" }
  node_taints = ["workload=memory:NoSchedule"]
}
```

### Compute-Intensive (ML, Analytics)
```hcl
compute = {
  vm_size    = "Standard_F8s_v2"  # 8 vCPU, 16 GiB
  min_count  = 2
  max_count  = 10
  node_labels = { "workload-type" = "compute-intensive" }
  node_taints = ["workload=compute:NoSchedule"]
}
```

### Spot Instances (Batch Processing)
```hcl
spot = {
  vm_size        = "Standard_D8s_v3"
  min_count      = 0
  max_count      = 20
  priority       = "Spot"
  spot_max_price = -1
  eviction_policy = "Delete"
  node_labels = { "kubernetes.azure.com/scalesetpriority" = "spot" }
  node_taints = ["kubernetes.azure.com/scalesetpriority=spot:NoSchedule"]
}
```

## Azure DevOps Integration

After creating the cluster, configure Azure DevOps:

### 1. Create Kubernetes Service Connection

```bash
# Get cluster credentials
az aks get-credentials \
  --resource-group rg-quikapp-dev \
  --name aks-quikapp-dev \
  --admin
```

In Azure DevOps:
1. Project Settings → Service Connections → New
2. Select "Kubernetes"
3. Choose "Azure Subscription" authentication
4. Select the AKS cluster
5. Name it: `QuikApp-K8s-dev`

### 2. Configure Pipeline Variables

Use the module outputs to configure Azure DevOps variable groups:

```hcl
# Output for Azure DevOps
output "azure_devops_config" {
  value = module.aks_dev.azure_devops_service_connection_config
}
```

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|----------|
| cluster_name | Name of the AKS cluster | string | - | yes |
| resource_group_name | Resource group name | string | - | yes |
| location | Azure region | string | - | yes |
| environment | Environment (dev, qa, staging, prod, etc.) | string | - | yes |
| kubernetes_version | Kubernetes version | string | "1.28" | no |
| system_node_pool_vm_size | VM size for system pool | string | "Standard_D4s_v3" | no |
| system_node_pool_count | Initial node count | number | 2 | no |
| user_node_pools | Map of user node pools | map(object) | {} | no |
| azure_ad_rbac_enabled | Enable Azure AD RBAC | bool | true | no |
| private_cluster_enabled | Enable private cluster | bool | false | no |
| acr_id | ACR ID for pull access | string | null | no |

See `variables.tf` for the complete list of inputs.

## Outputs

| Name | Description |
|------|-------------|
| cluster_id | The ID of the AKS cluster |
| cluster_name | The name of the AKS cluster |
| cluster_fqdn | The FQDN of the AKS cluster |
| kube_config_raw | Raw kubeconfig (sensitive) |
| host | Kubernetes API server endpoint |
| cluster_identity | Cluster managed identity |
| kubelet_identity | Kubelet managed identity |
| oidc_issuer_url | OIDC issuer URL for workload identity |
| vnet_id | VNet ID (if created) |
| subnet_id | AKS subnet ID |
| kubectl_command | Command to configure kubectl |

See `outputs.tf` for the complete list of outputs.

## Requirements

| Name | Version |
|------|---------|
| terraform | >= 1.5.0 |
| azurerm | >= 3.80.0 |
| azuread | >= 2.45.0 |

## Providers

| Name | Version |
|------|---------|
| azurerm | >= 3.80.0 |
| azuread | >= 2.45.0 |

## Security Considerations

1. **Azure AD Integration**: Enable `azure_ad_rbac_enabled` and disable local accounts in production
2. **Private Cluster**: Use `private_cluster_enabled` for sensitive workloads
3. **Network Policy**: Enable Azure or Calico network policies
4. **Key Vault**: Use `key_vault_secrets_provider_enabled` for secret management
5. **Microsoft Defender**: Enable `microsoft_defender_enabled` in production
6. **Azure Policy**: Enable `azure_policy_enabled` for compliance

## Maintenance

The module configures maintenance windows on weekends by default:
- Saturday: 1:00 AM - 6:00 AM
- Sunday: 1:00 AM - 6:00 AM

Customize with `maintenance_window_allowed` and `maintenance_window_not_allowed` variables.

## Troubleshooting

### Cluster Not Accessible
```bash
# Refresh credentials
az aks get-credentials --resource-group <rg> --name <cluster> --overwrite-existing

# Check cluster health
az aks show --resource-group <rg> --name <cluster> --query "powerState"
```

### Node Pool Issues
```bash
# List node pools
az aks nodepool list --resource-group <rg> --cluster-name <cluster> -o table

# Scale node pool
az aks nodepool scale --resource-group <rg> --cluster-name <cluster> --name <pool> --node-count <n>
```

### Network Issues
```bash
# Check subnet delegation
az network vnet subnet show --resource-group <rg> --vnet-name <vnet> --name <subnet>

# Check NSG rules
az network nsg rule list --resource-group <rg> --nsg-name <nsg> -o table
```
