# Foremark Deployment Guide

## Overview

Foremark is a prediction market exchange with a fully implemented CLOB (Central Limit Order Book) trading engine. The platform operates in two modes:

1. **Demo Mode** - Uses mock data when database is unavailable (current state)
2. **Production Mode** - Uses PostgreSQL with full trading capabilities

## Current Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (Next.js)                       │
├─────────────────────────────────────────────────────────────────┤
│  Market Pages │ Trading UI │ Portfolio │ Admin Dashboard        │
└───────────────┴─────────────┴───────────┴───────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       API Layer (/api/*)                         │
├─────────────────────────────────────────────────────────────────┤
│  /api/markets │ /api/trading/* │ /api/admin/* │ /api/auth/*     │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ DB Available? ──Yes──▶ PostgreSQL (Prisma ORM)          │    │
│  │       │                                                  │    │
│  │       No                                                 │    │
│  │       │                                                  │    │
│  │       └─────────────▶ Mock Store Data (Zustand)         │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Trading Engine                              │
├─────────────────────────────────────────────────────────────────┤
│  CLOB Matching │ Sharp Shield V2 │ DMM Service │ Settlement     │
│  Risk Defense  │ Fee Accounting  │ Oracle Lock │ Seed Bot       │
└─────────────────────────────────────────────────────────────────┘
```

## Production Deployment Steps

### 1. Database Setup (Supabase or Neon)

```bash
# Option A: Supabase (already configured)
# Dashboard: https://supabase.com/dashboard
# Your project: db.quyykbtmvzkcmrsvtgav.supabase.co

# Option B: Neon (alternative)
# Sign up at https://neon.tech
```

### 2. Environment Configuration

Create/update `.env.local` with production values:

```env
# Database
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require"
DIRECT_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require"

# NextAuth
NEXTAUTH_URL="https://foremark.bet"
NEXTAUTH_SECRET="<generate-with: openssl rand -base64 32>"

# Admin
ADMIN_INITIAL_EMAIL="admin@foremark.bet"
ADMIN_INITIAL_PASSWORD="<strong-password>"

# Cron Jobs (for Vercel)
CRON_SECRET="<generate-random-string>"
```

### 3. Database Migration

```bash
# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push

# Seed initial data (markets, categories)
npx ts-node prisma/seed.ts
```

### 4. Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
# or via CLI:
vercel env add DATABASE_URL
vercel env add NEXTAUTH_SECRET
# etc.
```

### 5. Configure Cron Jobs

In `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/trading-engine",
      "schedule": "* * * * *"
    }
  ]
}
```

### 6. Enable Trading

1. **Create Admin User**: First user with ADMIN_INITIAL_EMAIL becomes admin
2. **Create Categories**: Via admin dashboard at `/admin/categories`
3. **Create Markets**: Via admin dashboard at `/admin/markets/create`
4. **Enable Trading**: Change market status to "published"

## Trading Engine Components

### CLOB (Central Limit Order Book)
- **File**: `src/services/tradingEngineService.ts`
- Price-time priority matching
- Supports limit orders only (market orders convert to limit)
- Prices in cents (1-99)

### Sharp Shield V2 (Batch Processing)
- **File**: `src/services/tradingEngineServiceV2.ts`
- 200ms deterministic batches
- Prevents latency arbitrage
- 4-tier liquidity system

### DMM Service (Market Making)
- **File**: `src/services/dmmService.ts`
- 3 tiers: Standard, Premium, Institutional
- Uptime requirements: 90%, 95%, 99%
- Automatic compliance monitoring

### Seed Bot (Automated Liquidity)
- **File**: `src/services/seedBotServiceV2.ts`
- Chinese Wall compliant
- Kill switch on $1,000 rolling loss
- $50,000 global exposure cap

### Risk Defense
- **File**: `src/services/riskDefenseService.ts`
- Toxic flow detection
- Rapid fire prevention
- Spoofing detection
- Wash trading alerts

### Settlement
- **File**: `src/services/settlementService.ts`
- Normal resolution (winning payout)
- Void resolution (full refund)
- 7-year audit trail

## API Endpoints

### Public Markets API
```
GET /api/markets              # List all markets
GET /api/markets/:id          # Get market details
GET /api/trading/orderbook    # Get order book
```

### Trading API (Authenticated)
```
POST /api/trading/orders      # Place order
GET  /api/trading/orders      # Get user orders
DELETE /api/trading/orders    # Cancel order
GET /api/trading/positions    # Get user positions
```

### Admin API
```
GET  /api/admin/markets       # List markets (all statuses)
POST /api/admin/markets       # Create market
PUT  /api/admin/markets/:id   # Update market
POST /api/admin/settlement    # Settle market
```

## Fee Structure

| Type | Rate |
|------|------|
| Taker Fee | 1.00% (100 bps) |
| Maker Rebate | 0.25% (25 bps) |
| Venue Net | 0.75% (75 bps) |

## Liquidity Tiers (Sharp Shield)

| Tier | Effective Depth | Max Taker Bet |
|------|-----------------|---------------|
| 0 | < $1,000 | $100 |
| 1 | $1k - $10k | $500 |
| 2 | $10k - $100k | $2,000 |
| 3 | > $100k | $5,000 |

## Compliance (NT 2024)

- IGA sports markets: Pre-match only (locked 1 min before start)
- Oracle deadman switch: 30s feed timeout
- 7-year audit log retention
- Resolution source required for settlement

## Monitoring

Check trading engine health:
```bash
curl https://foremark.bet/api/cron/trading-engine \
  -H "Authorization: Bearer $CRON_SECRET" \
  -X POST
```

## Troubleshooting

### Database Connection Issues
```bash
# Test connection
npx prisma db pull

# Check connection string format
# Must include: ?sslmode=require
```

### Markets Not Loading
- Check browser console for errors
- API returns `source: 'mock'` when DB unavailable
- Ensure Prisma client is generated

### Orders Not Matching
- Check market status is "published"
- Verify oracle lock isn't active
- Confirm user has sufficient balance

## Support

- Issues: https://github.com/anthropics/claude-code/issues
- Documentation: This file
