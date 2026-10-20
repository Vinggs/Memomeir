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

# Hugging Face Spaces runs as user with UID 1000
RUN useradd -m -u 1000 user || true
RUN chown -R 1000:1000 /app
USER 1000

# Default environment
ENV NODE_ENV=production
ENV PORT=7860
ENV AUTO_START_BOT=true

EXPOSE 7860

# Start Express server & WhatsApp bot
CMD ["node", "server/server.js"]
