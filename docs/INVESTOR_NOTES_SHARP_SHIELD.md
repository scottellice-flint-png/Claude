# Sharp Shield Exchange Architecture
## Investor Technical Documentation

**Version:** 2.0
**Date:** February 2025
**Compliance:** NT 2024, IGA (AU), ASIC
**Stack:** Vercel (Next.js Node Runtime) + Supabase Postgres (ap-southeast-2)

---

## Executive Summary

Sharp Shield is a production-grade prediction market exchange implementing a Kalshi-style Central Limit Order Book (CLOB) with comprehensive protections against market manipulation, regulatory compliance features, and institutional-grade audit capabilities.

**Key Differentiators:**
- Single-book YES/NO model (NO is implicit at 100 - YES)
- Deterministic micro-batch processing (200ms batches)
- Push-based oracle locking for event safety
- Maker/taker fee model with rebates
- NT-grade hash-chained audit log with replay capability

---

## 1. Binary Payoff Model

### How It Works

Every market has exactly **one instrument**: YES shares.

| Concept | Implementation |
|---------|----------------|
| **YES Price** | 1-99 cents (represents probability) |
| **NO Price** | Always `100 - YES_PRICE` (implicit) |
| **Settlement** | YES = $1.00 if outcome occurs, $0 otherwise |
| **Invariant** | `P_YES + P_NO = 100 cents` (always true) |

### Order Book Structure

```
Single Book per Market:
┌─────────────────────────────────────┐
│           ORDER BOOK (YES)          │
├─────────────────────────────────────┤
│  BIDS (Buy YES)    │  ASKS (Sell YES) │
│  = Long YES        │  = Short YES     │
│  = Short NO        │  = Long NO       │
├─────────────────────────────────────┤
│  45¢ x 100 units   │  55¢ x 150 units │
│  44¢ x 200 units   │  56¢ x 100 units │
│  43¢ x 150 units   │  57¢ x 250 units │
└─────────────────────────────────────┘
```

### Why Single-Book?

1. **Simplicity**: No dual-book arbitrage conditions to manage
2. **Liquidity**: All liquidity in one place
3. **Regulatory**: Clear price discovery mechanism
4. **Kalshi Model**: Proven in production at scale

---

## 2. CLOB Price-Time Priority

### Matching Algorithm (match_orders_v6)

```sql
-- Deterministic matching with strict price-time priority
FOR v_counter_order IN
    SELECT * FROM orders
    WHERE "marketId" = v_order."marketId"
      AND side = v_opposite_side
      AND status IN ('open', 'partial')
      AND "userId" != v_order."userId"  -- No self-trading
      AND (price crosses)
    ORDER BY
        price_priority,      -- Best price first
        "createdAt" ASC      -- Time priority (FIFO)
    FOR UPDATE              -- Row-level locking
```

### Execution Rules

| Rule | Implementation |
|------|----------------|
| **Price Priority** | Best price (lowest ask, highest bid) matched first |
| **Time Priority** | For equal prices, earliest order wins |
| **Maker Price** | Trades execute at the resting order's price |
| **Self-Trade** | Blocked at SQL level (same userId) |
| **Partial Fills** | Supported with status transitions |

### Order States

```
pending → open → partial → filled
                 ↓
              cancelled
```

---

## 3. Sharp Shield Architecture

### Liquidity Tier System

Sharp Shield dynamically adjusts order size limits based on **effective depth**:

```
Effective Depth = MIN(bid_depth, ask_depth) within ±2% of mid-price
```

| Tier | Effective Depth | Max Taker | Max Maker |
|------|-----------------|-----------|-----------|
| 0 (Seed) | < $1,000 | $100 | $250 |
| 1 (Growth) | $1k - $10k | $500 | $1,000 |
| 2 (Mature) | $10k - $100k | $2,000 | $5,000 |
| 3 (Whale) | > $100k | $5,000 | $10,000 |

### Hysteresis Protection

Tier changes require 5 minutes of sustained threshold crossing:
- **Upgrade**: Must stay above threshold for 5 minutes
- **Downgrade**: Must stay below threshold for 5 minutes

This prevents rapid tier oscillation from flash liquidity.

### Toxic Flow Detection

When trade velocity exceeds thresholds:
- **5+ trades/2sec**: 2x spread widening
- **10+ trades/2sec**: 3x spread widening + risk event logged

---

## 4. Maker/Taker Economics

### Fee Schedule

| Party | Default Rate | Direction |
|-------|-------------|-----------|
| **Taker** | 1.00% (100 bps) | Pays fee |
| **Maker** | 0.25% (25 bps) | Receives rebate |
| **Venue** | 0.75% (75 bps) | Keeps margin |

### Double-Entry Ledger

Every trade creates three ledger entries:

```sql
-- Taker DEBIT (pays fee)
INSERT INTO fee_ledger (entryType, debitCents, ...) VALUES ('TAKER_FEE', 100, ...);

-- Maker CREDIT (receives rebate)
INSERT INTO fee_ledger (entryType, creditCents, ...) VALUES ('MAKER_REBATE', 25, ...);

-- Venue CREDIT (keeps difference)
INSERT INTO fee_ledger (entryType, creditCents, ...) VALUES ('VENUE_FEE', 75, ...);
```

**Invariant**: `SUM(debits) = SUM(credits)` (always balanced)

### Maker/Taker Determination

- **Taker**: Order that crosses the spread (market orders, aggressive limits)
- **Maker**: Order that adds to the book (resting limit orders)

Determination happens at crossing time, not order placement.

---

## 5. Deterministic Micro-Batching

### Why Micro-Batching?

1. **Fairness**: No latency advantage for co-located traders
2. **Determinism**: Identical replay across systems
3. **Efficiency**: Batch processing reduces DB round-trips
4. **Audit**: Every batch has a sequence number

### Batch Processing Flow

```
1. Orders arrive → pending_orders table (server_timestamp recorded)
2. Every 200ms → batch processor runs per market
3. Processor:
   - Locks market row (FOR UPDATE)
   - Checks oracle lock status
   - Assigns batch_sequence_number
   - Sorts orders by server_timestamp
   - Processes sequentially
   - Records results
```

### Batch Configuration

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Batch Window | 200ms | Balance between fairness and latency |
| Min Window | 100ms | Floor for high-activity periods |
| Max Window | 250ms | Ceiling for stability |
| Single Processor | Per market | No concurrent matching on same market |

---

## 6. Push-Based Oracle Locking

### Critical Safety Feature

Oracle locking protects against:
- **In-play betting** (IGA compliance for AU sports)
- **Stale odds** after events start
- **Announcement gaps** (economic data releases)
- **Feed failures** (deadman switch)

### Lock Triggers

| Event | Source | Action |
|-------|--------|--------|
| `match_started` | Sports feed | Immediate lock, cancel MM orders |
| `official_result` | Result feed | Lock, cancel all orders, prepare settlement |
| `high_volatility` | Price feed | Lock or widen spreads |
| `news_spike` | News feed | Temporary lock |
| `feed_stale` | Deadman switch | Auto-lock after timeout |

### Lock Flow

```
Oracle Event Received
        ↓
Lock Market (FOR UPDATE)
        ↓
Check if already locked
        ↓
Update oracle_lock_states
        ↓
Cancel MM orders (optional)
        ↓
Reject pending batch orders
        ↓
Log audit event
```

### Deadman Switch

If oracle heartbeat missing for 30 seconds:
1. Market auto-locks
2. All MM orders cancelled
3. `ORACLE_DEADMAN_SWITCH` audit event logged

---

## 7. Internal Quoter (Seed Bot)

### Chinese Wall Compliance

The internal market maker operates under strict information barriers:

```typescript
const ALLOWED_PUBLIC_ACCESS = [
  'orderBook',        // Public order book
  'liquidityState',   // Public liquidity metrics
  'marketStatus',     // Public market status
  'publicVolatility', // Public volatility indicator
];

// PROHIBITED:
// - User balances
// - Private order history
// - Pending order queue
// - Admin data
```

### Avellaneda-Stoikov Pricing

```
Reservation Price = mid_price - inventory_skew
Inventory Skew = γ × σ² × normalized_inventory

Optimal Spread = (γσ²/2) + (1/γ) × ln(1 + γ/κ)

where:
  γ = risk aversion (0.1)
  σ = volatility estimate (0.5)
  κ = order arrival rate (1.5)
```

### V2 Hardening Features

| Feature | Value | Purpose |
|---------|-------|---------|
| Order TTL | 3 seconds | Stale quote protection |
| Kill Switch | $1,000 rolling loss | Automatic halt |
| Rolling P&L Window | 5 minutes | Loss tracking |
| Global Exposure Cap | $50,000 | Total risk limit |
| Per-Market Cap | $5,000 | Concentration limit |
| Cooldown | 60 seconds | Recovery period after kill |

---

## 8. Replay-Based Auditability

### Hash-Chained Audit Log

Every audit event is cryptographically chained:

```
Event N:
  integrityHash = SHA256(canonical_payload || previousHash)
  previousHash = Event N-1's integrityHash
```

This creates a tamper-evident log where any modification breaks the chain.

### Canonical Payload

```typescript
const canonicalEvent = {
  eventType,
  occurredAtMs,
  actorType,
  actorId,
  marketId,
  orderId,
  reasonCode,
  beforeState,
  afterState,
  metadata,
};
// Sorted keys, nulls excluded
```

### replay_market_state Function

Reconstructs complete market state at any timestamp:

```sql
SELECT replay_market_state(
  '550e8400-e29b-41d4-a716-446655440000'::UUID,
  '2025-02-15 14:30:00'::TIMESTAMP
);

Returns:
{
  "tradeCount": 1247,
  "totalVolumeCents": 15847200,
  "positions": { "user1:outcome1": 50000, ... },
  "userBalanceDeltas": { "user1": -24500, ... },
  "orderBook": {
    "bids": [...],
    "asks": [...]
  },
  "invariantsValid": true,
  "invariantErrors": []
}
```

### Invariant Verification

1. **Position Sum = 0**: Every buy has a corresponding sell
2. **Balance Sum = 0**: Zero-sum game (excluding fees)
3. **Hash Chain Valid**: No tampered events

---

## 9. Infrastructure

### Deployment Stack

| Component | Service | Region |
|-----------|---------|--------|
| Application | Vercel (Node.js) | Global Edge |
| Database | Supabase Postgres | ap-southeast-2 (Sydney) |
| Connection | Pooled (Supavisor) | Auto-scaling |

### Database Optimization

- **Statement Timeout**: 30 seconds (prevents long-running queries)
- **Row Locks**: `FOR UPDATE` on critical paths
- **Indexes**: Optimized for CLOB queries
- **No Custom Pooling**: Uses Supabase's built-in pooler

### Fail-Closed Architecture

On anomaly detection:
1. Lock affected market(s)
2. Reject new orders
3. Log detailed audit event
4. Alert operations

---

## 10. Regulatory Compliance

### NT 2024 Requirements

| Requirement | Implementation |
|-------------|----------------|
| Best Execution | Price-time priority CLOB |
| Price Discovery | Single-book with public order book |
| Audit Trail | 7-year hash-chained log |
| Settlement | Deterministic binary payoff |
| Risk Controls | Sharp Shield tier limits |

### IGA (Interactive Gambling Act - AU)

| Requirement | Implementation |
|-------------|----------------|
| Pre-match Only (Sports) | Oracle lock on match_started |
| No In-play Betting | Automatic market suspension |
| Feed Latency | Max 500ms, deadman at 30s |

### ASIC Considerations

| Area | Implementation |
|------|----------------|
| Market Integrity | Self-trade prevention, abuse detection |
| Financial Reporting | Double-entry fee ledger |
| Client Money | Balance segregation (lockedBalanceCents) |

---

## Appendix A: API Reference

### Trading Endpoints

```
POST /api/trading/orders       - Create order
GET  /api/trading/orders       - List user orders
DELETE /api/trading/orders/:id - Cancel order
GET  /api/trading/orderbook    - Get order book
```

### Oracle Endpoints

```
POST /api/oracle/events        - Receive oracle events
POST /api/oracle/heartbeat     - Update heartbeat
```

### Admin Endpoints

```
POST   /api/admin/markets/:id/lock  - Lock market
DELETE /api/admin/markets/:id/lock  - Unlock market
POST   /api/admin/audit/replay      - Replay market state
GET    /api/admin/audit/verify      - Verify hash chain
```

### Cron Endpoints

```
POST /api/cron/trading-engine  - Run background workers
  - worker=batch    : Process order batches
  - worker=oracle   : Check deadman switches
  - worker=seedbot  : Run market maker
  - worker=all      : Run all workers
```

---

## Appendix B: Event Types

### Trading Events
- `ORDER_PLACED`
- `ORDER_MATCHED`
- `ORDER_CANCELLED`
- `TRADE_EXECUTED`

### Oracle Events
- `ORACLE_LOCK_TRIGGERED`
- `ORACLE_LOCK_RELEASED`
- `ORACLE_DEADMAN_SWITCH`
- `ORACLE_FEED_STALE`

### Risk Events
- `RAPID_FIRE`
- `TOXIC_FLOW`
- `REBATE_ABUSE_SUSPECTED`
- `SELF_TRADE_BLOCKED`

### Settlement Events
- `MARKET_RESOLVED`
- `MARKET_SETTLED`
- `MARKET_REFUNDED`

---

## Appendix C: Fee Calculation Example

```
Trade: 1000 units at 45¢
Trade Value: 1000 × 45 / 100 = 450 cents = $4.50

Taker Fee (1.00%):  450 × 100 / 10000 = 4.5 → 5 cents (rounded up)
Maker Rebate (0.25%): 450 × 25 / 10000 = 1.125 → 1 cent (rounded down)
Venue Fee: 5 - 1 = 4 cents

Result:
- Taker pays: $4.55 (trade + fee)
- Maker receives: $4.51 (trade + rebate)
- Venue keeps: $0.04
```

---

## Contact

For technical questions about this architecture, contact the engineering team.

**Document Classification:** Investor Technical Documentation
**Distribution:** Authorized investors and partners only
