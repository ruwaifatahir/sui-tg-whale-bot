# 🚀 Sui Telegram Whale Bot

A modern Telegram bot for tracking whale transactions on the Sui blockchain, built with TypeScript, Prisma, and Redis.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- PNPM package manager
- PostgreSQL database
- Redis server

### Installation

```bash
# Clone and install dependencies
pnpm install

# Set up environment variables
cp .env.example .env
```

## 🗄️ Database Configuration

### Database Setup

1. Set up a PostgreSQL database (e.g., using Supabase or any other provider)
2. Configure the connection URLs in your `.env` file

### Environment Variables

Create a `.env` file in your project root:

```env
# Bot Configuration
BOT_TOKEN=your_telegram_bot_token
NODE_ENV=production

# Database Configuration
DATABASE_URL="postgresql://[user]:[password]@[host]:5432/[database]"
DIRECT_URL="postgresql://[user]:[password]@[host]:5432/[database]"

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
```

### Database Migration

```bash
# Initialize Prisma (if needed)
pnpm prisma init

# Run migrations
pnpm db:migrate [migration-name]

# Generate Prisma client (after schema changes)
pnpm db:generate
```

## 🏃‍♂️ Running the Application

```bash
# Development mode
pnpm dev

# Production mode
pnpm build
pnpm start
```

## 🐳 Docker Deployment

### Using Docker Compose (Recommended)

The easiest way to run the bot with all its dependencies:

```bash
# Start all services (bot, PostgreSQL, Redis)
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

### Manual Docker Build

```bash
# Build the Docker image
docker build -t sui-tg-whale-bot .

# Run the container
docker run -d --name whale-bot --env-file .env sui-tg-whale-bot
```

### GitHub Actions Deployment

This project includes GitHub Actions workflows for automatic Docker image building and publishing:

1. Set up the following secrets in your GitHub repository:
   - `DOCKER_USERNAME`: Your Docker Hub username
   - `DOCKER_PASSWORD`: Your Docker Hub password/token

2. Push to the `main` branch to trigger the workflow

3. The Docker image will be published to Docker Hub as: `[your-username]/sui-tg-whale-bot:latest`

## 🔧 Troubleshooting

| Issue                        | Solution                                                |
| ---------------------------- | ------------------------------------------------------- |
| **Connection Error (P1001)** | Disable VPN and retry                                   |
| **Schema Error (P4002)**     | Create a fresh database                                 |
| **Migration Issues**         | Ensure DATABASE_URL and DIRECT_URL are correctly set    |
| **Prepared Statement Error** | Use connection pooling for DATABASE_URL                 |

## 📚 Resources

- [Prisma Documentation](https://www.prisma.io/docs)
- [Telegraf Documentation](https://telegraf.js.org/)
- [Sui Documentation](https://docs.sui.io)

---

<div align="center">
  <sub>Built with ❤️ using TypeScript, Prisma, and Telegraf</sub>
</div>
