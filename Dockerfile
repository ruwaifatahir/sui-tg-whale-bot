FROM node:18-slim

# Install necessary packages for Prisma
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

# Copy package files and prisma schema
COPY package.json ./
COPY pnpm-lock.yaml ./
COPY prisma ./prisma

# Install PNPM
RUN npm install -g pnpm

# Install all dependencies (including dev dependencies needed for build)
RUN pnpm install

# Copy source code and configuration files
COPY . .

# Build TypeScript
RUN pnpm run build

# Remove dev dependencies to reduce image size
RUN pnpm prune --prod

# Expose port (optional, for health checks)
EXPOSE 3000

# Start the bot
CMD ["pnpm", "start"] 