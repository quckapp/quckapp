# =============================================================================
# QuikApp Terraform Makefile
# =============================================================================
# Usage:
#   make help              - Show available commands
#   make init ENV=dev      - Initialize environment
#   make plan ENV=dev      - Generate execution plan
#   make apply ENV=dev     - Apply changes
#   make destroy ENV=dev   - Destroy infrastructure
# =============================================================================

.PHONY: help init plan apply destroy fmt validate lint security cost \
        backend-init backend-apply backend-destroy \
        dev-init dev-plan dev-apply dev-destroy \
        qa-init qa-plan qa-apply qa-destroy \
        uat1-init uat1-plan uat1-apply uat1-destroy \
        uat2-init uat2-plan uat2-apply uat2-destroy \
        uat3-init uat3-plan uat3-apply uat3-destroy \
        staging-init staging-plan staging-apply staging-destroy \
        live-init live-plan live-apply live-destroy \
        prod-init prod-plan prod-apply prod-destroy \
        state-list state-show clean unlock

# -----------------------------------------------------------------------------
# Configuration
# -----------------------------------------------------------------------------

# Default environment (can be overridden: make plan ENV=prod)
ENV ?= dev

# Terraform version
TF_VERSION := 1.6.0

# Directories
BACKEND_DIR := backend
DEV_DIR := environments/dev
PROD_DIR := environments/prod

# Colors for output
RED := \033[0;31m
GREEN := \033[0;32m
YELLOW := \033[0;33m
BLUE := \033[0;34m
NC := \033[0m # No Color

# -----------------------------------------------------------------------------
# Help
# -----------------------------------------------------------------------------

help: ## Show this help message
	@echo ""
	@echo "$(BLUE)QuikApp Terraform Commands$(NC)"
	@echo "$(BLUE)===========================$(NC)"
	@echo ""
	@echo "$(YELLOW)Backend Commands:$(NC)"
	@echo "  make backend-init      Initialize backend infrastructure"
	@echo "  make backend-apply     Create S3 bucket and DynamoDB table"
	@echo "  make backend-destroy   Destroy backend (WARNING: loses all state!)"
	@echo ""
	@echo "$(YELLOW)Environment Commands:$(NC)"
	@echo "  make init ENV=dev      Initialize Terraform for environment"
	@echo "  make plan ENV=dev      Generate execution plan"
	@echo "  make apply ENV=dev     Apply infrastructure changes"
	@echo "  make destroy ENV=dev   Destroy infrastructure"
	@echo "  make refresh ENV=dev   Refresh state from infrastructure"
	@echo "  make output ENV=dev    Show outputs"
	@echo ""
	@echo "$(YELLOW)Shortcut Commands:$(NC)"
	@echo "  make dev-init          Initialize dev environment"
	@echo "  make dev-plan          Plan dev environment"
	@echo "  make dev-apply         Apply dev environment"
	@echo "  make prod-init         Initialize prod environment"
	@echo "  make prod-plan         Plan prod environment"
	@echo "  make prod-apply        Apply prod environment (requires approval)"
	@echo ""
	@echo "$(YELLOW)Validation Commands:$(NC)"
	@echo "  make fmt               Format all Terraform files"
	@echo "  make fmt-check         Check formatting without changes"
	@echo "  make validate ENV=dev  Validate configuration"
	@echo "  make lint              Run TFLint"
	@echo "  make security          Run security scan (tfsec)"
	@echo "  make cost ENV=dev      Estimate costs (requires Infracost)"
	@echo ""
	@echo "$(YELLOW)State Commands:$(NC)"
	@echo "  make state-list ENV=dev    List resources in state"
	@echo "  make state-show ENV=dev    Show state details"
	@echo "  make state-pull ENV=dev    Pull state to local file"
	@echo "  make unlock ENV=dev ID=xxx Force unlock state"
	@echo ""
	@echo "$(YELLOW)Utility Commands:$(NC)"
	@echo "  make clean             Remove temporary files"
	@echo "  make docs              Open documentation"
	@echo "  make version           Show Terraform version"
	@echo ""

# -----------------------------------------------------------------------------
# Backend Commands
# -----------------------------------------------------------------------------

backend-init: ## Initialize backend infrastructure
	@echo "$(BLUE)Initializing backend...$(NC)"
	cd $(BACKEND_DIR) && terraform init

backend-plan: ## Plan backend infrastructure
	@echo "$(BLUE)Planning backend...$(NC)"
	cd $(BACKEND_DIR) && terraform plan

backend-apply: ## Apply backend infrastructure
	@echo "$(BLUE)Creating backend infrastructure...$(NC)"
	cd $(BACKEND_DIR) && terraform apply
	@echo "$(GREEN)Backend created! Run 'make init ENV=<env>' to configure environments.$(NC)"

backend-destroy: ## Destroy backend infrastructure (DANGER!)
	@echo "$(RED)WARNING: This will destroy all Terraform state!$(NC)"
	@read -p "Type 'destroy-backend' to confirm: " confirm && \
	if [ "$$confirm" = "destroy-backend" ]; then \
		cd $(BACKEND_DIR) && terraform destroy; \
	else \
		echo "Aborted."; \
	fi

backend-output: ## Show backend outputs
	cd $(BACKEND_DIR) && terraform output

# -----------------------------------------------------------------------------
# Environment Commands (Generic)
# -----------------------------------------------------------------------------

init: _check-env ## Initialize environment (ENV=dev|prod)
	@echo "$(BLUE)Initializing $(ENV) environment...$(NC)"
	@if [ -f "environments/$(ENV)/backend.hcl" ]; then \
		cd environments/$(ENV) && terraform init -backend-config=backend.hcl; \
	else \
		cd environments/$(ENV) && terraform init; \
	fi

plan: _check-env ## Generate execution plan (ENV=dev|prod)
	@echo "$(BLUE)Planning $(ENV) environment...$(NC)"
	cd environments/$(ENV) && terraform plan -var-file=$(ENV).tfvars -out=tfplan

apply: _check-env ## Apply changes (ENV=dev|prod)
	@echo "$(BLUE)Applying $(ENV) environment...$(NC)"
	@if [ "$(ENV)" = "prod" ]; then \
		echo "$(YELLOW)Production deployment - please review carefully!$(NC)"; \
		cd environments/$(ENV) && terraform apply -var-file=$(ENV).tfvars; \
	else \
		cd environments/$(ENV) && terraform apply -var-file=$(ENV).tfvars -auto-approve; \
	fi

apply-plan: _check-env ## Apply saved plan (ENV=dev|prod)
	@echo "$(BLUE)Applying saved plan for $(ENV)...$(NC)"
	cd environments/$(ENV) && terraform apply tfplan

destroy: _check-env ## Destroy infrastructure (ENV=dev|prod)
	@echo "$(RED)WARNING: Destroying $(ENV) infrastructure!$(NC)"
	@if [ "$(ENV)" = "prod" ]; then \
		read -p "Type 'destroy-prod' to confirm: " confirm && \
		if [ "$$confirm" = "destroy-prod" ]; then \
			cd environments/$(ENV) && terraform destroy -var-file=$(ENV).tfvars; \
		else \
			echo "Aborted."; \
		fi \
	else \
		cd environments/$(ENV) && terraform destroy -var-file=$(ENV).tfvars; \
	fi

refresh: _check-env ## Refresh state (ENV=dev|prod)
	@echo "$(BLUE)Refreshing $(ENV) state...$(NC)"
	cd environments/$(ENV) && terraform refresh -var-file=$(ENV).tfvars

output: _check-env ## Show outputs (ENV=dev|prod)
	cd environments/$(ENV) && terraform output

console: _check-env ## Open Terraform console (ENV=dev|prod)
	cd environments/$(ENV) && terraform console -var-file=$(ENV).tfvars

graph: _check-env ## Generate dependency graph (ENV=dev|prod)
	cd environments/$(ENV) && terraform graph | dot -Tpng > graph.png
	@echo "$(GREEN)Graph saved to environments/$(ENV)/graph.png$(NC)"

# -----------------------------------------------------------------------------
# Environment Shortcuts
# -----------------------------------------------------------------------------

dev-init: ## Initialize dev environment
	@$(MAKE) init ENV=dev

dev-plan: ## Plan dev environment
	@$(MAKE) plan ENV=dev

dev-apply: ## Apply dev environment
	@$(MAKE) apply ENV=dev

dev-destroy: ## Destroy dev environment
	@$(MAKE) destroy ENV=dev

dev-output: ## Show dev outputs
	@$(MAKE) output ENV=dev

prod-init: ## Initialize prod environment
	@$(MAKE) init ENV=prod

prod-plan: ## Plan prod environment
	@$(MAKE) plan ENV=prod

prod-apply: ## Apply prod environment
	@$(MAKE) apply ENV=prod

prod-destroy: ## Destroy prod environment
	@$(MAKE) destroy ENV=prod

prod-output: ## Show prod outputs
	@$(MAKE) output ENV=prod

# QA shortcuts
qa-init: ## Initialize QA environment
	@$(MAKE) init ENV=qa

qa-plan: ## Plan QA environment
	@$(MAKE) plan ENV=qa

qa-apply: ## Apply QA environment
	@$(MAKE) apply ENV=qa

qa-destroy: ## Destroy QA environment
	@$(MAKE) destroy ENV=qa

# UAT1 shortcuts
uat1-init: ## Initialize UAT1 environment
	@$(MAKE) init ENV=uat1

uat1-plan: ## Plan UAT1 environment
	@$(MAKE) plan ENV=uat1

uat1-apply: ## Apply UAT1 environment
	@$(MAKE) apply ENV=uat1

uat1-destroy: ## Destroy UAT1 environment
	@$(MAKE) destroy ENV=uat1

# UAT2 shortcuts
uat2-init: ## Initialize UAT2 environment
	@$(MAKE) init ENV=uat2

uat2-plan: ## Plan UAT2 environment
	@$(MAKE) plan ENV=uat2

uat2-apply: ## Apply UAT2 environment
	@$(MAKE) apply ENV=uat2

uat2-destroy: ## Destroy UAT2 environment
	@$(MAKE) destroy ENV=uat2

# UAT3 shortcuts
uat3-init: ## Initialize UAT3 environment
	@$(MAKE) init ENV=uat3

uat3-plan: ## Plan UAT3 environment
	@$(MAKE) plan ENV=uat3

uat3-apply: ## Apply UAT3 environment
	@$(MAKE) apply ENV=uat3

uat3-destroy: ## Destroy UAT3 environment
	@$(MAKE) destroy ENV=uat3

# Staging shortcuts
staging-init: ## Initialize Staging environment
	@$(MAKE) init ENV=staging

staging-plan: ## Plan Staging environment
	@$(MAKE) plan ENV=staging

staging-apply: ## Apply Staging environment
	@$(MAKE) apply ENV=staging

staging-destroy: ## Destroy Staging environment
	@$(MAKE) destroy ENV=staging

# Live shortcuts
live-init: ## Initialize Live environment
	@$(MAKE) init ENV=live

live-plan: ## Plan Live environment
	@$(MAKE) plan ENV=live

live-apply: ## Apply Live environment (REQUIRES APPROVAL)
	@echo "$(RED)WARNING: Applying to LIVE environment!$(NC)"
	@read -p "Type 'apply-live' to confirm: " confirm && \
	if [ "$$confirm" = "apply-live" ]; then \
		$(MAKE) apply ENV=live; \
	else \
		echo "Aborted."; \
	fi

live-destroy: ## Destroy Live environment (BLOCKED)
	@echo "$(RED)ERROR: Cannot destroy Live environment via Makefile$(NC)"
	@echo "Use AWS Console or Terraform directly with extreme caution"
	@exit 1

# -----------------------------------------------------------------------------
# Validation Commands
# -----------------------------------------------------------------------------

fmt: ## Format all Terraform files
	@echo "$(BLUE)Formatting Terraform files...$(NC)"
	terraform fmt -recursive .
	@echo "$(GREEN)Done!$(NC)"

fmt-check: ## Check formatting without changes
	@echo "$(BLUE)Checking Terraform formatting...$(NC)"
	terraform fmt -check -recursive -diff .

validate: _check-env ## Validate configuration (ENV=dev|prod)
	@echo "$(BLUE)Validating $(ENV) configuration...$(NC)"
	cd environments/$(ENV) && terraform init -backend=false && terraform validate

validate-all: ## Validate all environments
	@echo "$(BLUE)Validating all configurations...$(NC)"
	@for env in dev prod; do \
		echo "Validating $$env..."; \
		cd environments/$$env && terraform init -backend=false && terraform validate && cd ../..; \
	done
	@echo "$(GREEN)All configurations valid!$(NC)"

lint: ## Run TFLint
	@echo "$(BLUE)Running TFLint...$(NC)"
	@if command -v tflint &> /dev/null; then \
		tflint --recursive; \
	else \
		echo "$(YELLOW)TFLint not installed. Install with: brew install tflint$(NC)"; \
	fi

security: ## Run security scan with tfsec
	@echo "$(BLUE)Running security scan...$(NC)"
	@if command -v tfsec &> /dev/null; then \
		tfsec .; \
	else \
		echo "$(YELLOW)tfsec not installed. Install with: brew install tfsec$(NC)"; \
	fi

security-sarif: ## Run security scan with SARIF output
	@echo "$(BLUE)Running security scan (SARIF output)...$(NC)"
	@if command -v tfsec &> /dev/null; then \
		tfsec . --format sarif > tfsec-results.sarif; \
		echo "$(GREEN)Results saved to tfsec-results.sarif$(NC)"; \
	else \
		echo "$(YELLOW)tfsec not installed.$(NC)"; \
	fi

checkov: ## Run Checkov security scan
	@echo "$(BLUE)Running Checkov...$(NC)"
	@if command -v checkov &> /dev/null; then \
		checkov -d .; \
	else \
		echo "$(YELLOW)Checkov not installed. Install with: pip install checkov$(NC)"; \
	fi

cost: _check-env ## Estimate costs with Infracost (ENV=dev|prod)
	@echo "$(BLUE)Estimating costs for $(ENV)...$(NC)"
	@if command -v infracost &> /dev/null; then \
		cd environments/$(ENV) && infracost breakdown --path .; \
	else \
		echo "$(YELLOW)Infracost not installed. See: https://www.infracost.io/docs/$(NC)"; \
	fi

cost-diff: _check-env ## Show cost difference (ENV=dev|prod)
	@echo "$(BLUE)Calculating cost difference for $(ENV)...$(NC)"
	@if command -v infracost &> /dev/null; then \
		cd environments/$(ENV) && infracost diff --path .; \
	else \
		echo "$(YELLOW)Infracost not installed.$(NC)"; \
	fi

# -----------------------------------------------------------------------------
# State Commands
# -----------------------------------------------------------------------------

state-list: _check-env ## List resources in state (ENV=dev|prod)
	cd environments/$(ENV) && terraform state list

state-show: _check-env ## Show state details (ENV=dev|prod, RESOURCE=xxx)
ifdef RESOURCE
	cd environments/$(ENV) && terraform state show $(RESOURCE)
else
	@echo "Usage: make state-show ENV=$(ENV) RESOURCE=aws_s3_bucket.media"
endif

state-pull: _check-env ## Pull state to local file (ENV=dev|prod)
	@echo "$(BLUE)Pulling state for $(ENV)...$(NC)"
	cd environments/$(ENV) && terraform state pull > state-$(ENV)-$$(date +%Y%m%d-%H%M%S).json
	@echo "$(GREEN)State saved!$(NC)"

state-mv: _check-env ## Move resource in state (ENV=dev|prod, FROM=xxx, TO=yyy)
ifdef FROM
ifdef TO
	cd environments/$(ENV) && terraform state mv $(FROM) $(TO)
else
	@echo "Usage: make state-mv ENV=$(ENV) FROM=old_name TO=new_name"
endif
else
	@echo "Usage: make state-mv ENV=$(ENV) FROM=old_name TO=new_name"
endif

state-rm: _check-env ## Remove resource from state (ENV=dev|prod, RESOURCE=xxx)
ifdef RESOURCE
	@echo "$(RED)Removing $(RESOURCE) from $(ENV) state...$(NC)"
	cd environments/$(ENV) && terraform state rm $(RESOURCE)
else
	@echo "Usage: make state-rm ENV=$(ENV) RESOURCE=aws_s3_bucket.media"
endif

state-import: _check-env ## Import resource to state (ENV=dev|prod, RESOURCE=xxx, ID=yyy)
ifdef RESOURCE
ifdef ID
	cd environments/$(ENV) && terraform import -var-file=$(ENV).tfvars $(RESOURCE) $(ID)
else
	@echo "Usage: make state-import ENV=$(ENV) RESOURCE=aws_s3_bucket.media ID=bucket-name"
endif
else
	@echo "Usage: make state-import ENV=$(ENV) RESOURCE=aws_s3_bucket.media ID=bucket-name"
endif

unlock: _check-env ## Force unlock state (ENV=dev|prod, ID=xxx)
ifdef ID
	@echo "$(YELLOW)Force unlocking state...$(NC)"
	cd environments/$(ENV) && terraform force-unlock $(ID)
else
	@echo "Usage: make unlock ENV=$(ENV) ID=lock-id"
endif

# -----------------------------------------------------------------------------
# Utility Commands
# -----------------------------------------------------------------------------

clean: ## Remove temporary files
	@echo "$(BLUE)Cleaning temporary files...$(NC)"
	find . -name "*.tfplan" -delete
	find . -name "tfplan" -delete
	find . -name "plan.out" -delete
	find . -name "*.tfstate.backup" -delete
	find . -name "graph.png" -delete
	find . -name "state-*.json" -delete
	find . -name "*.sarif" -delete
	@echo "$(GREEN)Clean complete!$(NC)"

clean-cache: ## Remove Terraform cache
	@echo "$(BLUE)Cleaning Terraform cache...$(NC)"
	find . -type d -name ".terraform" -exec rm -rf {} + 2>/dev/null || true
	find . -name ".terraform.lock.hcl" -delete 2>/dev/null || true
	@echo "$(GREEN)Cache cleaned!$(NC)"

docs: ## Open documentation
	@if [ -f "../docs/terraform/README.md" ]; then \
		echo "Opening documentation..."; \
		open ../docs/terraform/README.md 2>/dev/null || xdg-open ../docs/terraform/README.md 2>/dev/null || echo "See: docs/terraform/README.md"; \
	fi

version: ## Show Terraform version
	terraform version

providers: _check-env ## List providers (ENV=dev|prod)
	cd environments/$(ENV) && terraform providers

providers-lock: ## Update provider lock file
	@echo "$(BLUE)Updating provider locks...$(NC)"
	@for env in dev prod; do \
		echo "Locking providers for $$env..."; \
		cd environments/$$env && terraform providers lock -platform=linux_amd64 -platform=darwin_amd64 -platform=darwin_arm64 && cd ../..; \
	done

upgrade: _check-env ## Upgrade providers (ENV=dev|prod)
	@echo "$(BLUE)Upgrading providers for $(ENV)...$(NC)"
	cd environments/$(ENV) && terraform init -upgrade

# -----------------------------------------------------------------------------
# CI/CD Commands
# -----------------------------------------------------------------------------

ci-init: _check-env ## CI: Initialize without interaction
	cd environments/$(ENV) && terraform init -input=false -backend-config=backend.hcl

ci-plan: _check-env ## CI: Plan without interaction
	cd environments/$(ENV) && terraform plan -input=false -var-file=$(ENV).tfvars -out=tfplan

ci-apply: _check-env ## CI: Apply without interaction
	cd environments/$(ENV) && terraform apply -input=false -auto-approve tfplan

ci-validate: ## CI: Validate all configurations
	@for env in dev prod; do \
		cd environments/$$env && terraform init -backend=false && terraform validate && cd ../..; \
	done

# -----------------------------------------------------------------------------
# Internal Targets
# -----------------------------------------------------------------------------

_check-env:
ifndef ENV
	$(error ENV is required. Use: make <target> ENV=dev|prod)
endif
ifeq ($(filter $(ENV),dev qa uat1 uat2 uat3 staging live prod),)
	$(error ENV must be one of: dev, qa, uat1, uat2, uat3, staging, live, prod)
endif

# Default target
.DEFAULT_GOAL := help
