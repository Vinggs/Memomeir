# Production Dockerfile for Memomeir (Web Dashboard + WhatsApp Bot All-in-One)
FROM node:22-slim

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build frontend production bundle
RUN npm run build

# Expose default port
ENV NODE_ENV=production
ENV PORT=4000
ENV AUTO_START_BOT=true

EXPOSE 4000

# Start Express server & WhatsApp bot
CMD ["node", "server/server.js"]
