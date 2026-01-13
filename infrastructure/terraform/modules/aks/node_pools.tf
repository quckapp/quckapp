# =============================================================================
# USER NODE POOLS
# =============================================================================

resource "azurerm_kubernetes_cluster_node_pool" "user" {
  for_each = var.user_node_pools

  name                  = each.key
  kubernetes_cluster_id = azurerm_kubernetes_cluster.aks.id
  vm_size               = each.value.vm_size
  node_count            = each.value.node_count
  min_count             = each.value.min_count
  max_count             = each.value.max_count
  enable_auto_scaling   = true
  os_disk_size_gb       = each.value.os_disk_size_gb
  os_disk_type          = each.value.os_disk_type
  vnet_subnet_id        = local.aks_subnet_id
  zones                 = each.value.availability_zones
  max_pods              = each.value.max_pods
  os_type               = each.value.os_type
  priority              = each.value.priority
  spot_max_price        = each.value.priority == "Spot" ? each.value.spot_max_price : null
  eviction_policy       = each.value.priority == "Spot" ? each.value.eviction_policy : null
  mode                  = "User"

  node_labels = merge(
    {
      "nodepool-type" = "user"
      "nodepool"      = each.key
      "environment"   = var.environment
    },
    each.value.node_labels
  )

  node_taints = each.value.node_taints

  upgrade_settings {
    max_surge = "10%"
  }

  tags = merge(local.tags, {
    NodePool = each.key
  })

  lifecycle {
    ignore_changes = [
      node_count,
    ]
  }
}

# =============================================================================
# PREDEFINED NODE POOL CONFIGURATIONS
# =============================================================================

# These locals provide common node pool configurations that can be used
# as defaults for different workload types

locals {
  # Standard workload node pools by environment
  standard_node_pools = {
    # Development environments
    dev = {
      workloads = {
        vm_size            = "Standard_D4s_v3"
        node_count         = 2
        min_count          = 1
        max_count          = 5
        os_disk_size_gb    = 128
        availability_zones = ["1", "2"]
        node_labels = {
          "workload-type" = "general"
        }
        node_taints = []
      }
    }

    # QA environments
    qa = {
      workloads = {
        vm_size            = "Standard_D4s_v3"
        node_count         = 2
        min_count          = 2
        max_count          = 6
        os_disk_size_gb    = 128
        availability_zones = ["1", "2", "3"]
        node_labels = {
          "workload-type" = "general"
        }
        node_taints = []
      }
    }

    # UAT environments
    uat = {
      workloads = {
        vm_size            = "Standard_D8s_v3"
        node_count         = 3
        min_count          = 2
        max_count          = 10
        os_disk_size_gb    = 256
        availability_zones = ["1", "2", "3"]
        node_labels = {
          "workload-type" = "general"
        }
        node_taints = []
      }
    }

    # Staging environment
    staging = {
      workloads = {
        vm_size            = "Standard_D8s_v3"
        node_count         = 3
        min_count          = 3
        max_count          = 15
        os_disk_size_gb    = 256
        availability_zones = ["1", "2", "3"]
        node_labels = {
          "workload-type" = "general"
        }
        node_taints = []
      }
      memory_optimized = {
        vm_size            = "Standard_E4s_v3"
        node_count         = 1
        min_count          = 1
        max_count          = 5
        os_disk_size_gb    = 256
        availability_zones = ["1", "2", "3"]
        node_labels = {
          "workload-type" = "memory-intensive"
        }
        node_taints = ["workload=memory:NoSchedule"]
      }
    }

    # Production/Live environment
    prod = {
      workloads = {
        vm_size            = "Standard_D16s_v3"
        node_count         = 5
        min_count          = 5
        max_count          = 50
        os_disk_size_gb    = 512
        availability_zones = ["1", "2", "3"]
        node_labels = {
          "workload-type" = "general"
        }
        node_taints = []
      }
      memory_optimized = {
        vm_size            = "Standard_E8s_v3"
        node_count         = 2
        min_count          = 2
        max_count          = 10
        os_disk_size_gb    = 512
        availability_zones = ["1", "2", "3"]
        node_labels = {
          "workload-type" = "memory-intensive"
        }
        node_taints = ["workload=memory:NoSchedule"]
      }
      compute_optimized = {
        vm_size            = "Standard_F8s_v2"
        node_count         = 2
        min_count          = 2
        max_count          = 10
        os_disk_size_gb    = 256
        availability_zones = ["1", "2", "3"]
        node_labels = {
          "workload-type" = "compute-intensive"
        }
        node_taints = ["workload=compute:NoSchedule"]
      }
      spot = {
        vm_size            = "Standard_D8s_v3"
        node_count         = 0
        min_count          = 0
        max_count          = 20
        os_disk_size_gb    = 256
        availability_zones = ["1", "2", "3"]
        priority           = "Spot"
        spot_max_price     = -1
        eviction_policy    = "Delete"
        node_labels = {
          "workload-type"                          = "batch"
          "kubernetes.azure.com/scalesetpriority" = "spot"
        }
        node_taints = ["kubernetes.azure.com/scalesetpriority=spot:NoSchedule"]
      }
    }
  }

  # VM size recommendations by workload type
  vm_size_recommendations = {
    general = {
      dev     = "Standard_D4s_v3"   # 4 vCPU, 16 GiB RAM
      staging = "Standard_D8s_v3"   # 8 vCPU, 32 GiB RAM
      prod    = "Standard_D16s_v3"  # 16 vCPU, 64 GiB RAM
    }
    memory_optimized = {
      dev     = "Standard_E4s_v3"   # 4 vCPU, 32 GiB RAM
      staging = "Standard_E8s_v3"   # 8 vCPU, 64 GiB RAM
      prod    = "Standard_E16s_v3"  # 16 vCPU, 128 GiB RAM
    }
    compute_optimized = {
      dev     = "Standard_F4s_v2"   # 4 vCPU, 8 GiB RAM
      staging = "Standard_F8s_v2"   # 8 vCPU, 16 GiB RAM
      prod    = "Standard_F16s_v2"  # 16 vCPU, 32 GiB RAM
    }
    gpu = {
      dev     = "Standard_NC6s_v3"  # 6 vCPU, 112 GiB RAM, 1x V100
      staging = "Standard_NC12s_v3" # 12 vCPU, 224 GiB RAM, 2x V100
      prod    = "Standard_NC24s_v3" # 24 vCPU, 448 GiB RAM, 4x V100
    }
  }
}
