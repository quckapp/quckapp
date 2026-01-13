# =============================================================================
# QuikApp Makefile
# Common development commands for the QuikApp microservices platform
# =============================================================================

.PHONY: help install build test lint clean docker-build docker-push docker-up docker-down \
        helm-lint helm-install helm-upgrade helm-uninstall k8s-apply k8s-delete \
        db-migrate db-seed logs shell docs docs-docker docs-redoc docs-mock docs-all \
        docs-stop docs-build docs-lint docs-bundle api-client api-client-generate api-client-build

# -----------------------------------------------------------------------------
# Variables
# -----------------------------------------------------------------------------
SHELL := /bin/bash
.DEFAULT_GOAL := help

# Project
PROJECT_NAME := quikapp
VERSION ?= $(shell git describe --tags --always --dirty 2>/dev/null || echo "dev")
GIT_COMMIT := $(shell git rev-parse --short HEAD 2>/dev/null || echo "unknown")
BUILD_DATE := $(shell date -u +"%Y-%m-%dT%H:%M:%SZ")

# Docker
DOCKER_REGISTRY ?= ghcr.io
DOCKER_REPO ?= $(DOCKER_REGISTRY)/quikapp
DOCKER_TAG ?= $(VERSION)
DOCKER_COMPOSE := docker compose
DOCKER_COMPOSE_FILE := docker-compose.yml
DOCKER_COMPOSE_SERVICES := docker-compose.services.yml

# Kubernetes
KUBE_NAMESPACE ?= quikapp
KUBE_CONTEXT ?= $(shell kubectl config current-context 2>/dev/null)
HELM_RELEASE := quikapp
HELM_CHART := ./infrastructure/helm/quikapp
HELM_VALUES ?= values.yaml

# Services by stack
NESTJS_SERVICES := backend-gateway notification-service realtime-service
SPRING_SERVICES := auth-service user-service permission-service audit-service admin-service
ELIXIR_SERVICES := presence-service message-service call-service notification-orchestrator huddle-service event-broadcast-service
GO_SERVICES := workspace-service channel-service thread-service search-service file-service media-service bookmark-service reminder-service attachment-service cdn-service
PYTHON_SERVICES := analytics-service ml-service moderation-service export-service integration-service sentiment-service insights-service smart-reply-service
ALL_SERVICES := $(NESTJS_SERVICES) $(SPRING_SERVICES) $(ELIXIR_SERVICES) $(GO_SERVICES) $(PYTHON_SERVICES)

# Colors
CYAN := \033[36m
GREEN := \033[32m
YELLOW := \033[33m
RED := \033[31m
RESET := \033[0m

# -----------------------------------------------------------------------------
# Help
# -----------------------------------------------------------------------------
help: ## Show this help message
	@echo ""
	@echo "$(CYAN)QuikApp Development Commands$(RESET)"
	@echo "=============================="
	@echo ""
	@echo "$(GREEN)Usage:$(RESET) make [target] [VARIABLE=value]"
	@echo ""
	@echo "$(YELLOW)Available targets:$(RESET)"
	@awk 'BEGIN {FS = ":.*##"; printf ""} /^[a-zA-Z_-]+:.*?##/ { printf "  $(CYAN)%-20s$(RESET) %s\n", $$1, $$2 }' $(MAKEFILE_LIST)
	@echo ""
	@echo "$(YELLOW)Variables:$(RESET)"
	@echo "  $(CYAN)VERSION$(RESET)          Docker image tag (default: git tag or 'dev')"
	@echo "  $(CYAN)DOCKER_REGISTRY$(RESET)  Docker registry (default: ghcr.io)"
	@echo "  $(CYAN)KUBE_NAMESPACE$(RESET)   Kubernetes namespace (default: quikapp)"
	@echo "  $(CYAN)HELM_VALUES$(RESET)      Helm values file (default: values.yaml)"
	@echo "  $(CYAN)SERVICE$(RESET)          Specific service name for targeted commands"
	@echo ""

# -----------------------------------------------------------------------------
# Installation & Setup
# -----------------------------------------------------------------------------
install: ## Install all dependencies for all stacks
	@echo "$(CYAN)Installing dependencies...$(RESET)"
	@$(MAKE) install-nestjs
	@$(MAKE) install-spring
	@$(MAKE) install-elixir
	@$(MAKE) install-go
	@$(MAKE) install-python
	@echo "$(GREEN)All dependencies installed!$(RESET)"

install-nestjs: ## Install NestJS dependencies
	@echo "$(CYAN)Installing NestJS dependencies...$(RESET)"
	@cd services/nestjs && pnpm install

install-spring: ## Install Spring Boot dependencies
	@echo "$(CYAN)Installing Spring Boot dependencies...$(RESET)"
	@cd services/spring && mvn dependency:go-offline -B

install-elixir: ## Install Elixir dependencies
	@echo "$(CYAN)Installing Elixir dependencies...$(RESET)"
	@cd services/elixir && mix deps.get

install-go: ## Install Go dependencies
	@echo "$(CYAN)Installing Go dependencies...$(RESET)"
	@cd services/go && go mod download

install-python: ## Install Python dependencies
	@echo "$(CYAN)Installing Python dependencies...$(RESET)"
	@cd services/python && pip install -r requirements.txt -r requirements-dev.txt

setup: ## Initial project setup (copy env files, install deps)
	@echo "$(CYAN)Setting up project...$(RESET)"
	@cp -n .env.example .env 2>/dev/null || true
	@$(MAKE) install
	@echo "$(GREEN)Project setup complete!$(RESET)"

# -----------------------------------------------------------------------------
# Build
# -----------------------------------------------------------------------------
build: ## Build all services
	@echo "$(CYAN)Building all services...$(RESET)"
	@$(MAKE) build-nestjs
	@$(MAKE) build-spring
	@$(MAKE) build-elixir
	@$(MAKE) build-go
	@$(MAKE) build-python
	@echo "$(GREEN)All services built!$(RESET)"

build-nestjs: ## Build NestJS services
	@echo "$(CYAN)Building NestJS services...$(RESET)"
	@cd services/nestjs && pnpm build

build-spring: ## Build Spring Boot services
	@echo "$(CYAN)Building Spring Boot services...$(RESET)"
	@cd services/spring && mvn package -DskipTests -B

build-elixir: ## Build Elixir services
	@echo "$(CYAN)Building Elixir services...$(RESET)"
	@cd services/elixir && MIX_ENV=prod mix compile

build-go: ## Build Go services
	@echo "$(CYAN)Building Go services...$(RESET)"
	@cd services/go && \
	for service in $(GO_SERVICES); do \
		echo "Building $$service..."; \
		CGO_ENABLED=0 go build -ldflags="-w -s" -o bin/$$service ./$$service; \
	done

build-python: ## Build Python services (compile check)
	@echo "$(CYAN)Checking Python services...$(RESET)"
	@cd services/python && python -m py_compile **/*.py 2>/dev/null || true

# -----------------------------------------------------------------------------
# Testing
# -----------------------------------------------------------------------------
test: ## Run all tests
	@echo "$(CYAN)Running all tests...$(RESET)"
	@$(MAKE) test-nestjs
	@$(MAKE) test-spring
	@$(MAKE) test-elixir
	@$(MAKE) test-go
	@$(MAKE) test-python
	@echo "$(GREEN)All tests completed!$(RESET)"

test-nestjs: ## Run NestJS tests
	@echo "$(CYAN)Running NestJS tests...$(RESET)"
	@cd services/nestjs && pnpm test

test-spring: ## Run Spring Boot tests
	@echo "$(CYAN)Running Spring Boot tests...$(RESET)"
	@cd services/spring && mvn test -B

test-elixir: ## Run Elixir tests
	@echo "$(CYAN)Running Elixir tests...$(RESET)"
	@cd services/elixir && mix test

test-go: ## Run Go tests
	@echo "$(CYAN)Running Go tests...$(RESET)"
	@cd services/go && go test -v -race ./...

test-python: ## Run Python tests
	@echo "$(CYAN)Running Python tests...$(RESET)"
	@cd services/python && pytest -v

test-coverage: ## Run tests with coverage
	@echo "$(CYAN)Running tests with coverage...$(RESET)"
	@cd services/nestjs && pnpm test:cov || true
	@cd services/spring && mvn test jacoco:report -B || true
	@cd services/elixir && mix test --cover || true
	@cd services/go && go test -coverprofile=coverage.out ./... || true
	@cd services/python && pytest --cov=. --cov-report=html || true

# -----------------------------------------------------------------------------
# Linting & Formatting
# -----------------------------------------------------------------------------
lint: ## Run linters for all stacks
	@echo "$(CYAN)Running linters...$(RESET)"
	@$(MAKE) lint-nestjs
	@$(MAKE) lint-spring
	@$(MAKE) lint-elixir
	@$(MAKE) lint-go
	@$(MAKE) lint-python
	@echo "$(GREEN)Linting completed!$(RESET)"

lint-nestjs: ## Lint NestJS code
	@echo "$(CYAN)Linting NestJS...$(RESET)"
	@cd services/nestjs && pnpm lint

lint-spring: ## Lint Spring Boot code
	@echo "$(CYAN)Linting Spring Boot...$(RESET)"
	@cd services/spring && mvn checkstyle:check -B

lint-elixir: ## Lint Elixir code
	@echo "$(CYAN)Linting Elixir...$(RESET)"
	@cd services/elixir && mix format --check-formatted && mix credo --strict

lint-go: ## Lint Go code
	@echo "$(CYAN)Linting Go...$(RESET)"
	@cd services/go && golangci-lint run ./...

lint-python: ## Lint Python code
	@echo "$(CYAN)Linting Python...$(RESET)"
	@cd services/python && ruff check . && black --check .

format: ## Format code for all stacks
	@echo "$(CYAN)Formatting code...$(RESET)"
	@cd services/nestjs && pnpm format || true
	@cd services/elixir && mix format || true
	@cd services/go && gofmt -w . || true
	@cd services/python && black . && ruff check --fix . || true
	@echo "$(GREEN)Formatting completed!$(RESET)"

# -----------------------------------------------------------------------------
# Docker Commands
# -----------------------------------------------------------------------------
docker-build: ## Build all Docker images
	@echo "$(CYAN)Building Docker images...$(RESET)"
	@for service in $(ALL_SERVICES); do \
		echo "Building $$service..."; \
		$(MAKE) docker-build-service SERVICE=$$service; \
	done
	@echo "$(GREEN)All Docker images built!$(RESET)"

docker-build-service: ## Build a specific service Docker image (SERVICE=name)
ifndef SERVICE
	$(error SERVICE is not set. Usage: make docker-build-service SERVICE=backend-gateway)
endif
	@echo "$(CYAN)Building $(SERVICE)...$(RESET)"
	@STACK=$$($(MAKE) -s get-stack SERVICE=$(SERVICE)); \
	docker build \
		-f infrastructure/docker/samples/Dockerfile.$$STACK \
		-t $(DOCKER_REPO)/$(SERVICE):$(DOCKER_TAG) \
		--build-arg VERSION=$(VERSION) \
		--build-arg BUILD_DATE=$(BUILD_DATE) \
		--build-arg GIT_COMMIT=$(GIT_COMMIT) \
		./services/$$STACK/$(SERVICE)

docker-push: ## Push all Docker images to registry
	@echo "$(CYAN)Pushing Docker images...$(RESET)"
	@for service in $(ALL_SERVICES); do \
		echo "Pushing $$service..."; \
		docker push $(DOCKER_REPO)/$$service:$(DOCKER_TAG); \
	done
	@echo "$(GREEN)All Docker images pushed!$(RESET)"

docker-push-service: ## Push a specific service Docker image (SERVICE=name)
ifndef SERVICE
	$(error SERVICE is not set. Usage: make docker-push-service SERVICE=backend-gateway)
endif
	@echo "$(CYAN)Pushing $(SERVICE)...$(RESET)"
	@docker push $(DOCKER_REPO)/$(SERVICE):$(DOCKER_TAG)

docker-up: ## Start all services with Docker Compose
	@echo "$(CYAN)Starting services...$(RESET)"
	@$(DOCKER_COMPOSE) -f $(DOCKER_COMPOSE_FILE) up -d
	@echo "$(GREEN)Services started!$(RESET)"

docker-up-infra: ## Start infrastructure only (databases, cache, etc.)
	@echo "$(CYAN)Starting infrastructure...$(RESET)"
	@$(DOCKER_COMPOSE) -f $(DOCKER_COMPOSE_FILE) up -d \
		mongodb mysql postgres redis elasticsearch kafka zookeeper minio nginx
	@echo "$(GREEN)Infrastructure started!$(RESET)"

docker-up-monitoring: ## Start monitoring stack
	@echo "$(CYAN)Starting monitoring...$(RESET)"
	@$(DOCKER_COMPOSE) -f $(DOCKER_COMPOSE_FILE) --profile monitoring up -d
	@echo "$(GREEN)Monitoring started!$(RESET)"

docker-down: ## Stop all services
	@echo "$(CYAN)Stopping services...$(RESET)"
	@$(DOCKER_COMPOSE) -f $(DOCKER_COMPOSE_FILE) down
	@echo "$(GREEN)Services stopped!$(RESET)"

docker-down-volumes: ## Stop all services and remove volumes
	@echo "$(RED)Stopping services and removing volumes...$(RESET)"
	@$(DOCKER_COMPOSE) -f $(DOCKER_COMPOSE_FILE) down -v
	@echo "$(GREEN)Services stopped and volumes removed!$(RESET)"

docker-logs: ## View logs (SERVICE=name for specific service)
ifdef SERVICE
	@$(DOCKER_COMPOSE) -f $(DOCKER_COMPOSE_FILE) logs -f $(SERVICE)
else
	@$(DOCKER_COMPOSE) -f $(DOCKER_COMPOSE_FILE) logs -f
endif

docker-ps: ## List running containers
	@$(DOCKER_COMPOSE) -f $(DOCKER_COMPOSE_FILE) ps

docker-shell: ## Open shell in a service container (SERVICE=name)
ifndef SERVICE
	$(error SERVICE is not set. Usage: make docker-shell SERVICE=backend-gateway)
endif
	@$(DOCKER_COMPOSE) -f $(DOCKER_COMPOSE_FILE) exec $(SERVICE) sh

docker-clean: ## Remove all QuikApp containers, images, and volumes
	@echo "$(RED)Cleaning Docker resources...$(RESET)"
	@$(DOCKER_COMPOSE) -f $(DOCKER_COMPOSE_FILE) down -v --rmi local
	@docker image prune -f --filter "label=org.opencontainers.image.vendor=QuikApp"
	@echo "$(GREEN)Docker resources cleaned!$(RESET)"

# -----------------------------------------------------------------------------
# Kubernetes / Helm Commands
# -----------------------------------------------------------------------------
helm-deps: ## Update Helm chart dependencies
	@echo "$(CYAN)Updating Helm dependencies...$(RESET)"
	@helm dependency update $(HELM_CHART)
	@cd $(HELM_CHART)/charts/infrastructure && helm dependency update
	@cd $(HELM_CHART)/charts/monitoring && helm dependency update
	@echo "$(GREEN)Dependencies updated!$(RESET)"

helm-lint: ## Lint Helm charts
	@echo "$(CYAN)Linting Helm charts...$(RESET)"
	@helm lint $(HELM_CHART)
	@helm lint $(HELM_CHART) -f $(HELM_CHART)/values-development.yaml
	@helm lint $(HELM_CHART) -f $(HELM_CHART)/values-production.yaml
	@echo "$(GREEN)Helm charts are valid!$(RESET)"

helm-template: ## Render Helm templates locally
	@echo "$(CYAN)Rendering Helm templates...$(RESET)"
	@helm template $(HELM_RELEASE) $(HELM_CHART) \
		-f $(HELM_CHART)/$(HELM_VALUES) \
		--namespace $(KUBE_NAMESPACE)

helm-install: ## Install Helm chart to Kubernetes
	@echo "$(CYAN)Installing Helm chart...$(RESET)"
	@helm install $(HELM_RELEASE) $(HELM_CHART) \
		-f $(HELM_CHART)/$(HELM_VALUES) \
		--namespace $(KUBE_NAMESPACE) \
		--create-namespace \
		--wait
	@echo "$(GREEN)Helm chart installed!$(RESET)"

helm-upgrade: ## Upgrade Helm release
	@echo "$(CYAN)Upgrading Helm release...$(RESET)"
	@helm upgrade $(HELM_RELEASE) $(HELM_CHART) \
		-f $(HELM_CHART)/$(HELM_VALUES) \
		--namespace $(KUBE_NAMESPACE) \
		--wait
	@echo "$(GREEN)Helm release upgraded!$(RESET)"

helm-uninstall: ## Uninstall Helm release
	@echo "$(RED)Uninstalling Helm release...$(RESET)"
	@helm uninstall $(HELM_RELEASE) --namespace $(KUBE_NAMESPACE)
	@echo "$(GREEN)Helm release uninstalled!$(RESET)"

helm-status: ## Show Helm release status
	@helm status $(HELM_RELEASE) --namespace $(KUBE_NAMESPACE)

helm-history: ## Show Helm release history
	@helm history $(HELM_RELEASE) --namespace $(KUBE_NAMESPACE)

helm-rollback: ## Rollback Helm release to previous revision
	@echo "$(YELLOW)Rolling back Helm release...$(RESET)"
	@helm rollback $(HELM_RELEASE) --namespace $(KUBE_NAMESPACE)
	@echo "$(GREEN)Rollback complete!$(RESET)"

k8s-namespace: ## Create Kubernetes namespace
	@kubectl create namespace $(KUBE_NAMESPACE) --dry-run=client -o yaml | kubectl apply -f -

k8s-pods: ## List pods in namespace
	@kubectl get pods -n $(KUBE_NAMESPACE)

k8s-services: ## List services in namespace
	@kubectl get services -n $(KUBE_NAMESPACE)

k8s-logs: ## View pod logs (SERVICE=name)
ifndef SERVICE
	$(error SERVICE is not set. Usage: make k8s-logs SERVICE=backend-gateway)
endif
	@kubectl logs -f deployment/$(SERVICE) -n $(KUBE_NAMESPACE)

k8s-shell: ## Open shell in pod (SERVICE=name)
ifndef SERVICE
	$(error SERVICE is not set. Usage: make k8s-shell SERVICE=backend-gateway)
endif
	@kubectl exec -it deployment/$(SERVICE) -n $(KUBE_NAMESPACE) -- sh

k8s-port-forward: ## Port forward a service (SERVICE=name PORT=local:remote)
ifndef SERVICE
	$(error SERVICE is not set. Usage: make k8s-port-forward SERVICE=backend-gateway PORT=3000:3000)
endif
ifndef PORT
	$(error PORT is not set. Usage: make k8s-port-forward SERVICE=backend-gateway PORT=3000:3000)
endif
	@kubectl port-forward svc/$(SERVICE) $(PORT) -n $(KUBE_NAMESPACE)

k8s-describe: ## Describe a pod (SERVICE=name)
ifndef SERVICE
	$(error SERVICE is not set. Usage: make k8s-describe SERVICE=backend-gateway)
endif
	@kubectl describe deployment/$(SERVICE) -n $(KUBE_NAMESPACE)

# -----------------------------------------------------------------------------
# Database Commands
# -----------------------------------------------------------------------------
db-up: ## Start databases only
	@echo "$(CYAN)Starting databases...$(RESET)"
	@$(DOCKER_COMPOSE) -f $(DOCKER_COMPOSE_FILE) up -d mongodb mysql postgres redis
	@echo "$(GREEN)Databases started!$(RESET)"

db-migrate: ## Run database migrations
	@echo "$(CYAN)Running database migrations...$(RESET)"
	@echo "Running Spring Boot migrations..."
	@cd services/spring && mvn flyway:migrate -B || true
	@echo "Running Elixir migrations..."
	@cd services/elixir && mix ecto.migrate || true
	@echo "Running Go migrations..."
	@cd services/go && go run cmd/migrate/main.go up || true
	@echo "Running Python migrations..."
	@cd services/python && alembic upgrade head || true
	@echo "$(GREEN)Migrations completed!$(RESET)"

db-seed: ## Seed databases with sample data
	@echo "$(CYAN)Seeding databases...$(RESET)"
	@$(DOCKER_COMPOSE) -f $(DOCKER_COMPOSE_FILE) exec mysql mysql -uroot -proot quikapp < database/init-scripts/mysql-init.sql || true
	@$(DOCKER_COMPOSE) -f $(DOCKER_COMPOSE_FILE) exec postgres psql -U quikapp -d quikapp -f /docker-entrypoint-initdb.d/postgres-init.sql || true
	@$(DOCKER_COMPOSE) -f $(DOCKER_COMPOSE_FILE) exec mongodb mongosh --eval 'load("/docker-entrypoint-initdb.d/mongo-init.js")' || true
	@echo "$(GREEN)Database seeding completed!$(RESET)"

db-reset: ## Reset all databases (WARNING: destroys data)
	@echo "$(RED)Resetting all databases...$(RESET)"
	@$(DOCKER_COMPOSE) -f $(DOCKER_COMPOSE_FILE) down -v
	@$(MAKE) db-up
	@sleep 10
	@$(MAKE) db-migrate
	@$(MAKE) db-seed
	@echo "$(GREEN)Databases reset!$(RESET)"

db-shell-mysql: ## Open MySQL shell
	@$(DOCKER_COMPOSE) -f $(DOCKER_COMPOSE_FILE) exec mysql mysql -uroot -proot quikapp

db-shell-postgres: ## Open PostgreSQL shell
	@$(DOCKER_COMPOSE) -f $(DOCKER_COMPOSE_FILE) exec postgres psql -U quikapp -d quikapp

db-shell-mongo: ## Open MongoDB shell
	@$(DOCKER_COMPOSE) -f $(DOCKER_COMPOSE_FILE) exec mongodb mongosh quikapp

db-shell-redis: ## Open Redis CLI
	@$(DOCKER_COMPOSE) -f $(DOCKER_COMPOSE_FILE) exec redis redis-cli

# -----------------------------------------------------------------------------
# Development Commands
# -----------------------------------------------------------------------------
dev: ## Start development environment
	@echo "$(CYAN)Starting development environment...$(RESET)"
	@$(MAKE) docker-up-infra
	@echo "$(GREEN)Infrastructure ready! Start your services with their dev commands.$(RESET)"
	@echo ""
	@echo "$(YELLOW)Service URLs:$(RESET)"
	@echo "  MySQL:         localhost:3306"
	@echo "  PostgreSQL:    localhost:5432"
	@echo "  MongoDB:       localhost:27017"
	@echo "  Redis:         localhost:6379"
	@echo "  Elasticsearch: localhost:9200"
	@echo "  Kafka:         localhost:9092"
	@echo "  MinIO:         localhost:9000 (Console: 9001)"

dev-nestjs: ## Run NestJS services in development mode
	@echo "$(CYAN)Starting NestJS services in dev mode...$(RESET)"
	@cd services/nestjs && pnpm dev

dev-spring: ## Run Spring Boot services in development mode
	@echo "$(CYAN)Starting Spring Boot services in dev mode...$(RESET)"
	@cd services/spring && mvn spring-boot:run -Dspring-boot.run.profiles=dev

dev-elixir: ## Run Elixir services in development mode
	@echo "$(CYAN)Starting Elixir services in dev mode...$(RESET)"
	@cd services/elixir && iex -S mix phx.server

dev-go: ## Run Go services in development mode (SERVICE=name)
ifndef SERVICE
	$(error SERVICE is not set. Usage: make dev-go SERVICE=workspace-service)
endif
	@echo "$(CYAN)Starting $(SERVICE) in dev mode...$(RESET)"
	@cd services/go/$(SERVICE) && go run .

dev-python: ## Run Python services in development mode (SERVICE=name)
ifndef SERVICE
	$(error SERVICE is not set. Usage: make dev-python SERVICE=analytics-service)
endif
	@echo "$(CYAN)Starting $(SERVICE) in dev mode...$(RESET)"
	@cd services/python/$(SERVICE) && flask run --reload

watch: ## Watch for changes and rebuild (requires entr)
	@echo "$(CYAN)Watching for changes...$(RESET)"
	@find services -name "*.ts" -o -name "*.java" -o -name "*.ex" -o -name "*.go" -o -name "*.py" | \
		entr -r $(MAKE) build

# -----------------------------------------------------------------------------
# Utility Commands
# -----------------------------------------------------------------------------
clean: ## Clean all build artifacts
	@echo "$(CYAN)Cleaning build artifacts...$(RESET)"
	@rm -rf services/nestjs/dist services/nestjs/node_modules
	@rm -rf services/spring/target
	@rm -rf services/elixir/_build services/elixir/deps
	@rm -rf services/go/bin
	@rm -rf services/python/__pycache__ services/python/.pytest_cache
	@echo "$(GREEN)Clean completed!$(RESET)"

version: ## Show version information
	@echo "$(CYAN)QuikApp Version Information$(RESET)"
	@echo "Version:    $(VERSION)"
	@echo "Git Commit: $(GIT_COMMIT)"
	@echo "Build Date: $(BUILD_DATE)"

info: ## Show project information
	@echo "$(CYAN)QuikApp Project Information$(RESET)"
	@echo "=============================="
	@echo ""
	@echo "$(YELLOW)Services:$(RESET)"
	@echo "  NestJS:  $(words $(NESTJS_SERVICES)) services"
	@echo "  Spring:  $(words $(SPRING_SERVICES)) services"
	@echo "  Elixir:  $(words $(ELIXIR_SERVICES)) services"
	@echo "  Go:      $(words $(GO_SERVICES)) services"
	@echo "  Python:  $(words $(PYTHON_SERVICES)) services"
	@echo "  Total:   $(words $(ALL_SERVICES)) services"
	@echo ""
	@echo "$(YELLOW)Docker:$(RESET)"
	@echo "  Registry: $(DOCKER_REGISTRY)"
	@echo "  Tag:      $(DOCKER_TAG)"
	@echo ""
	@echo "$(YELLOW)Kubernetes:$(RESET)"
	@echo "  Context:   $(KUBE_CONTEXT)"
	@echo "  Namespace: $(KUBE_NAMESPACE)"

check-tools: ## Check required tools are installed
	@echo "$(CYAN)Checking required tools...$(RESET)"
	@command -v docker >/dev/null 2>&1 || { echo "$(RED)docker not found$(RESET)"; exit 1; }
	@command -v kubectl >/dev/null 2>&1 || { echo "$(YELLOW)kubectl not found$(RESET)"; }
	@command -v helm >/dev/null 2>&1 || { echo "$(YELLOW)helm not found$(RESET)"; }
	@command -v node >/dev/null 2>&1 || { echo "$(YELLOW)node not found$(RESET)"; }
	@command -v go >/dev/null 2>&1 || { echo "$(YELLOW)go not found$(RESET)"; }
	@command -v python3 >/dev/null 2>&1 || { echo "$(YELLOW)python3 not found$(RESET)"; }
	@command -v java >/dev/null 2>&1 || { echo "$(YELLOW)java not found$(RESET)"; }
	@command -v elixir >/dev/null 2>&1 || { echo "$(YELLOW)elixir not found$(RESET)"; }
	@echo "$(GREEN)Tool check completed!$(RESET)"

# -----------------------------------------------------------------------------
# Helper Functions
# -----------------------------------------------------------------------------
get-stack: ## Get the stack for a service (internal use)
ifndef SERVICE
	@echo "unknown"
else
	@if echo "$(NESTJS_SERVICES)" | grep -qw "$(SERVICE)"; then echo "nestjs"; \
	elif echo "$(SPRING_SERVICES)" | grep -qw "$(SERVICE)"; then echo "spring"; \
	elif echo "$(ELIXIR_SERVICES)" | grep -qw "$(SERVICE)"; then echo "elixir"; \
	elif echo "$(GO_SERVICES)" | grep -qw "$(SERVICE)"; then echo "go"; \
	elif echo "$(PYTHON_SERVICES)" | grep -qw "$(SERVICE)"; then echo "python"; \
	else echo "unknown"; fi
endif

# -----------------------------------------------------------------------------
# Compound Commands
# -----------------------------------------------------------------------------
all: install build test lint ## Install, build, test, and lint everything

ci: lint test ## Run CI checks (lint + test)

release: docker-build docker-push ## Build and push all Docker images

deploy-dev: ## Deploy to development environment
	@$(MAKE) helm-install HELM_VALUES=values-development.yaml KUBE_NAMESPACE=quikapp-dev

deploy-staging: ## Deploy to staging environment
	@$(MAKE) helm-upgrade HELM_VALUES=values-staging.yaml KUBE_NAMESPACE=quikapp-staging

deploy-prod: ## Deploy to production environment
	@echo "$(RED)Deploying to PRODUCTION...$(RESET)"
	@read -p "Are you sure? [y/N] " confirm && [ "$$confirm" = "y" ] || exit 1
	@$(MAKE) helm-upgrade HELM_VALUES=values-production.yaml KUBE_NAMESPACE=quikapp

# -----------------------------------------------------------------------------
# API Documentation
# -----------------------------------------------------------------------------
docs: ## Serve API documentation locally (Swagger UI)
	@echo "$(CYAN)Starting Swagger UI...$(RESET)"
	@node docs/openapi/serve.js

docs-docker: ## Run Swagger UI in Docker
	@echo "$(CYAN)Starting Swagger UI in Docker...$(RESET)"
	@$(DOCKER_COMPOSE) -f docs/openapi/docker-compose.yaml up -d swagger-ui
	@echo "$(GREEN)Swagger UI available at http://localhost:8080$(RESET)"

docs-redoc: ## Run Redoc documentation in Docker
	@echo "$(CYAN)Starting Redoc in Docker...$(RESET)"
	@$(DOCKER_COMPOSE) -f docs/openapi/docker-compose.yaml up -d redoc
	@echo "$(GREEN)Redoc available at http://localhost:8081$(RESET)"

docs-mock: ## Run API mock server (Prism)
	@echo "$(CYAN)Starting API mock server...$(RESET)"
	@$(DOCKER_COMPOSE) -f docs/openapi/docker-compose.yaml up -d prism
	@echo "$(GREEN)Mock server available at http://localhost:4010$(RESET)"

docs-all: ## Run all documentation services
	@echo "$(CYAN)Starting all documentation services...$(RESET)"
	@$(DOCKER_COMPOSE) -f docs/openapi/docker-compose.yaml up -d
	@echo "$(GREEN)Services started:$(RESET)"
	@echo "  - Swagger UI: http://localhost:8080"
	@echo "  - Redoc: http://localhost:8081"
	@echo "  - Mock Server: http://localhost:4010"

docs-stop: ## Stop all documentation services
	@echo "$(CYAN)Stopping documentation services...$(RESET)"
	@$(DOCKER_COMPOSE) -f docs/openapi/docker-compose.yaml down
	@echo "$(GREEN)Documentation services stopped$(RESET)"

docs-build: ## Build Swagger UI Docker image with bundled spec
	@echo "$(CYAN)Building Swagger UI image...$(RESET)"
	@docker build -t $(DOCKER_REPO)/swagger-ui:$(VERSION) -f docs/openapi/Dockerfile docs/openapi/
	@echo "$(GREEN)Image built: $(DOCKER_REPO)/swagger-ui:$(VERSION)$(RESET)"

docs-lint: ## Validate OpenAPI specification
	@echo "$(CYAN)Validating OpenAPI specification...$(RESET)"
	@docker run --rm -v "$(PWD)/docs/openapi:/spec" redocly/cli lint /spec/openapi.yaml
	@echo "$(GREEN)OpenAPI spec is valid!$(RESET)"

docs-bundle: ## Bundle OpenAPI spec into single file
	@echo "$(CYAN)Bundling OpenAPI specification...$(RESET)"
	@docker run --rm -v "$(PWD)/docs/openapi:/spec" redocly/cli bundle /spec/openapi.yaml -o /spec/bundled-openapi.yaml
	@echo "$(GREEN)Bundled spec: docs/openapi/bundled-openapi.yaml$(RESET)"

# -----------------------------------------------------------------------------
# API Client
# -----------------------------------------------------------------------------
api-client: api-client-generate api-client-build ## Generate and build the TypeScript API client

api-client-generate: ## Generate TypeScript types from OpenAPI spec
	@echo "$(CYAN)Generating TypeScript API client...$(RESET)"
	@cd packages/api-client && npm run generate
	@echo "$(GREEN)API client types generated!$(RESET)"

api-client-build: ## Build the TypeScript API client package
	@echo "$(CYAN)Building API client package...$(RESET)"
	@cd packages/api-client && npm run build
	@echo "$(GREEN)API client built!$(RESET)"

api-client-install: ## Install API client dependencies
	@echo "$(CYAN)Installing API client dependencies...$(RESET)"
	@cd packages/api-client && npm install
	@echo "$(GREEN)API client dependencies installed!$(RESET)"

api-client-lint: ## Lint API client code
	@echo "$(CYAN)Linting API client...$(RESET)"
	@cd packages/api-client && npm run lint
	@echo "$(GREEN)API client lint completed!$(RESET)"

api-client-typecheck: ## Type-check API client
	@echo "$(CYAN)Type-checking API client...$(RESET)"
	@cd packages/api-client && npm run typecheck
	@echo "$(GREEN)API client type-check completed!$(RESET)"
