# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine

# Install build dependencies for native modules (bcrypt)
RUN apk add --no-cache python3 make g++

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
# Use --ignore-scripts to skip husky, then rebuild bcrypt manually
RUN npm ci --omit=dev --ignore-scripts && \
    npm rebuild bcrypt --build-from-source && \
    npm cache clean --force

# Remove build dependencies to reduce image size
RUN apk del python3 make g++

COPY --from=builder /app/dist ./dist

# Copy locales for i18n
COPY --from=builder /app/src/common/i18n/locales ./dist/locales

RUN mkdir -p uploads/images uploads/videos uploads/audio uploads/files && \
    mkdir -p logs

EXPOSE 3000

CMD ["node", "dist/main.js"]
