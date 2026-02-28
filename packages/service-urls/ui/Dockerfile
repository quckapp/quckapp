# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files from the service-urls frontend submodule
COPY packages/service-urls/package.json packages/service-urls/package-lock.json ./

RUN npm ci

# Copy source
COPY packages/service-urls/ .

# Build with relative API URL so nginx can proxy
ENV VITE_API_URL=/api/v1
RUN npm run build

# Runtime stage
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY packages/service-urls/ui/nginx.conf /etc/nginx/conf.d/default.conf
RUN sed -i 's/worker_processes.*/worker_processes 2;/' /etc/nginx/nginx.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1
