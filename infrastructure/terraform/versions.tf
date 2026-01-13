# =============================================================================
# TERRAFORM AND PROVIDER CONFIGURATION
# =============================================================================

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = ">= 3.80.0"
    }
    azuread = {
      source  = "hashicorp/azuread"
      version = ">= 2.45.0"
    }
    random = {
      source  = "hashicorp/random"
      version = ">= 3.5.0"
    }
  }

  # Backend configuration - uncomment and configure for remote state
  # backend "azurerm" {
  #   resource_group_name  = "rg-quikapp-tfstate"
  #   storage_account_name = "stquikapptfstate"
  #   container_name       = "tfstate"
  #   key                  = "quikapp.terraform.tfstate"
  # }
}

# =============================================================================
# PROVIDER CONFIGURATION
# =============================================================================

provider "azurerm" {
  features {
    key_vault {
      purge_soft_delete_on_destroy    = var.environment != "prod" && var.environment != "live"
      recover_soft_deleted_key_vaults = true
    }
    resource_group {
      prevent_deletion_if_contains_resources = var.environment == "prod" || var.environment == "live"
    }
  }

  # Uncomment to use specific subscription
  # subscription_id = var.subscription_id
}

provider "azuread" {
  # Uses default authentication
}
