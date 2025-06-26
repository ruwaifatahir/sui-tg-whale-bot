# 🚀 Node.js Starter

A modern Node.js starter template with TypeScript, Prisma, and database integration for building scalable applications.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- PNPM package manager
- Supabase account

### Installation

```bash
# Clone and install dependencies
pnpm install

# Set up environment variables
cp .env.example .env
```

## 🗄️ Database Configuration

### Supabase Setup

1. **Create Project**: Navigate to your [Supabase Dashboard](https://supabase.com/dashboard)
2. **Get Connection URLs**:
   - Go to **Project Settings** → **Database**
   - Copy the **Session pooler** URL as both `DATABASE_URL` and `DIRECT_URL`

### Environment Variables

Create a `.env` file in your project root:

```env
DATABASE_URL="postgresql://[user]:[password]@[host]:5432/[database]"
DIRECT_URL="postgresql://[user]:[password]@[host]:5432/[database]"
```

> **Note**: Replace `[YOUR-PASSWORD]` with your actual database password from Supabase settings.

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
pnpm start
```

## 🔧 Troubleshooting

| Issue                        | Solution                                                |
| ---------------------------- | ------------------------------------------------------- |
| **Connection Error (P1001)** | Disable VPN and retry                                   |
| **Schema Error (P4002)**     | Create a fresh Supabase project                         |
| **Migration Issues**         | Ensure DATABASE_URL and DIRECT_URL are correctly set    |
| **Prepared Statement Error** | Use Session pooler for both DATABASE_URL and DIRECT_URL |

## 📚 Resources

- [Supabase Database Setup Video](https://www.youtube.com/watch?v=jA2-IwR0zjk)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Node.js Documentation](https://nodejs.org/docs)

---

<div align="center">
  <sub>Built with ❤️ using TypeScript, Prisma, and Node.js</sub>
</div>
