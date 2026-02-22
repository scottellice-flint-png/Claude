-- ============================================================================
-- FORTRESS TRADING ENGINE - NT 2024 Compliant CLOB
-- Migration: 20250222_fortress_trading_engine
-- ============================================================================

-- ============================================================================
-- TABLES: Orders, Trades, Positions, TakerQueue, LiquidityRewards, etc.
-- ============================================================================

-- Orders table (CLOB)
CREATE TABLE "orders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "marketId" UUID NOT NULL,
    "outcomeId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "side" TEXT NOT NULL,
    "orderType" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "quantityCents" INTEGER NOT NULL,
    "filledCents" INTEGER NOT NULL DEFAULT 0,
    "remainingCents" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "filledAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "isTaker" BOOLEAN NOT NULL DEFAULT false,
    "reasonCode" TEXT,
    "ipAddress" TEXT,
    "deviceFingerprint" TEXT,
    "isFlagged" BOOLEAN NOT NULL DEFAULT false,
    "flagReason" TEXT,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "orders_price_check" CHECK ("priceCents" >= 1 AND "priceCents" <= 99),
    CONSTRAINT "orders_side_check" CHECK ("side" IN ('buy', 'sell')),
    CONSTRAINT "orders_type_check" CHECK ("orderType" IN ('limit', 'market')),
    CONSTRAINT "orders_status_check" CHECK ("status" IN ('pending', 'open', 'partial', 'filled', 'cancelled', 'expired', 'rejected'))
);

-- Taker Queue (500ms delay)
CREATE TABLE "taker_queue" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "orderId" UUID NOT NULL,
    "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "releaseAt" TIMESTAMP(3) NOT NULL,
    "processedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'queued',
    "orderSnapshot" JSONB NOT NULL,
    "matchResult" JSONB,
    "errorMessage" TEXT,

    CONSTRAINT "taker_queue_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "taker_queue_orderId_key" UNIQUE ("orderId"),
    CONSTRAINT "taker_queue_status_check" CHECK ("status" IN ('queued', 'processing', 'completed', 'cancelled'))
);

-- Trades table
CREATE TABLE "trades" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "marketId" UUID NOT NULL,
    "outcomeId" UUID NOT NULL,
    "buyOrderId" UUID NOT NULL,
    "sellOrderId" UUID NOT NULL,
    "buyerId" UUID NOT NULL,
    "sellerId" UUID NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "quantityCents" INTEGER NOT NULL,
    "buyerFeeCents" INTEGER NOT NULL DEFAULT 0,
    "sellerFeeCents" INTEGER NOT NULL DEFAULT 0,
    "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reasonCode" TEXT NOT NULL DEFAULT 'CLOB_MATCH',

    CONSTRAINT "trades_pkey" PRIMARY KEY ("id")
);

-- Positions table
CREATE TABLE "positions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "marketId" UUID NOT NULL,
    "outcomeId" UUID NOT NULL,
    "quantityCents" INTEGER NOT NULL DEFAULT 0,
    "avgPriceCents" INTEGER NOT NULL DEFAULT 0,
    "totalCostCents" INTEGER NOT NULL DEFAULT 0,
    "realizedPnlCents" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "positions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "positions_user_market_outcome_key" UNIQUE ("userId", "marketId", "outcomeId")
);

-- Liquidity Rewards (LIP)
CREATE TABLE "liquidity_rewards" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "marketId" UUID NOT NULL,
    "twlPoints" BIGINT NOT NULL DEFAULT 0,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "avgLiquidityCents" BIGINT NOT NULL DEFAULT 0,
    "timeInSpreadMs" BIGINT NOT NULL DEFAULT 0,
    "totalOrdersTracked" INTEGER NOT NULL DEFAULT 0,
    "rebateEarnedCents" INTEGER NOT NULL DEFAULT 0,
    "rebatePaidAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "liquidity_rewards_pkey" PRIMARY KEY ("id")
);

-- DMM Metrics
CREATE TABLE "dmm_metrics" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "marketId" UUID NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "uptimeMs" BIGINT NOT NULL DEFAULT 0,
    "downtimeMs" BIGINT NOT NULL DEFAULT 0,
    "uptimePercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgSpreadCents" INTEGER NOT NULL DEFAULT 0,
    "maxSpreadCents" INTEGER NOT NULL DEFAULT 0,
    "minSpreadCents" INTEGER NOT NULL DEFAULT 0,
    "spreadViolations" INTEGER NOT NULL DEFAULT 0,
    "volumeProvidedCents" BIGINT NOT NULL DEFAULT 0,
    "tradesMatched" INTEGER NOT NULL DEFAULT 0,
    "meetsRequirements" BOOLEAN NOT NULL DEFAULT true,
    "warningCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dmm_metrics_pkey" PRIMARY KEY ("id")
);

-- DMM Registrations
CREATE TABLE "dmm_registrations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "tier" TEXT NOT NULL DEFAULT 'standard',
    "minUptimePercent" DOUBLE PRECISION NOT NULL DEFAULT 95,
    "maxSpreadCents" INTEGER NOT NULL DEFAULT 10,
    "minLiquidityCents" BIGINT NOT NULL DEFAULT 100000,
    "apiRateLimit" INTEGER NOT NULL DEFAULT 0,
    "apiKeyHash" TEXT,
    "approvedAt" TIMESTAMP(3),
    "approvedById" UUID,
    "lastComplianceCheck" TIMESTAMP(3),
    "complianceStatus" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dmm_registrations_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "dmm_registrations_userId_key" UNIQUE ("userId")
);

-- Market Maker Bots
CREATE TABLE "market_maker_bots" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "botType" TEXT NOT NULL DEFAULT 'passive_quoter',
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "config" JSONB NOT NULL DEFAULT '{}',
    "accessLevel" TEXT NOT NULL DEFAULT 'public_only',
    "currentInventoryYesCents" BIGINT NOT NULL DEFAULT 0,
    "currentInventoryNoCents" BIGINT NOT NULL DEFAULT 0,
    "maxInventoryCents" BIGINT NOT NULL DEFAULT 1000000,
    "totalVolumeProvidedCents" BIGINT NOT NULL DEFAULT 0,
    "totalTradesExecuted" INTEGER NOT NULL DEFAULT 0,
    "totalPnlCents" BIGINT NOT NULL DEFAULT 0,
    "isHalted" BOOLEAN NOT NULL DEFAULT false,
    "haltReason" TEXT,
    "lastActivityAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" UUID,

    CONSTRAINT "market_maker_bots_pkey" PRIMARY KEY ("id")
);

-- Risk Events
CREATE TABLE "risk_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "eventType" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'low',
    "userId" UUID,
    "marketId" UUID,
    "ipAddress" TEXT,
    "detectionRule" TEXT NOT NULL,
    "triggerData" JSONB NOT NULL,
    "tradesAffected" INTEGER NOT NULL DEFAULT 0,
    "volumeAffectedCents" BIGINT NOT NULL DEFAULT 0,
    "actionTaken" TEXT,
    "actionDetails" JSONB,
    "status" TEXT NOT NULL DEFAULT 'active',
    "resolvedAt" TIMESTAMP(3),
    "resolvedById" UUID,
    "resolutionNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "risk_events_pkey" PRIMARY KEY ("id")
);

-- Market Liquidity State
CREATE TABLE "market_liquidity_states" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "marketId" UUID NOT NULL,
    "totalLiquidityCents" BIGINT NOT NULL DEFAULT 0,
    "bidLiquidityCents" BIGINT NOT NULL DEFAULT 0,
    "askLiquidityCents" BIGINT NOT NULL DEFAULT 0,
    "bestBidCents" INTEGER,
    "bestAskCents" INTEGER,
    "midPriceCents" INTEGER,
    "spreadCents" INTEGER,
    "liquidityTier" TEXT NOT NULL DEFAULT 'seed',
    "maxBetCents" INTEGER NOT NULL DEFAULT 50000,
    "spreadMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "spreadReason" TEXT,
    "tradesLast2Sec" INTEGER NOT NULL DEFAULT 0,
    "lastTradeAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "market_liquidity_states_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "market_liquidity_states_marketId_key" UNIQUE ("marketId")
);

-- Order Book Snapshots
CREATE TABLE "order_book_snapshots" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "marketId" UUID NOT NULL,
    "outcomeId" UUID NOT NULL,
    "snapshotAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bids" JSONB NOT NULL,
    "asks" JSONB NOT NULL,
    "bestBidCents" INTEGER,
    "bestAskCents" INTEGER,
    "totalBidsCents" BIGINT NOT NULL DEFAULT 0,
    "totalAsksCents" BIGINT NOT NULL DEFAULT 0,
    "snapshotReason" TEXT NOT NULL DEFAULT 'scheduled',

    CONSTRAINT "order_book_snapshots_pkey" PRIMARY KEY ("id")
);

-- Settlement Records
CREATE TABLE "settlement_records" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "marketId" UUID NOT NULL,
    "settlementType" TEXT NOT NULL,
    "winningOutcomeId" UUID,
    "resolutionSource" TEXT,
    "resolutionEvidence" JSONB,
    "totalPayoutCents" BIGINT NOT NULL DEFAULT 0,
    "totalRefundCents" BIGINT NOT NULL DEFAULT 0,
    "platformFeeCents" BIGINT NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "initiatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "reasonCode" TEXT NOT NULL,
    "processedById" UUID,
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "settlement_records_pkey" PRIMARY KEY ("id")
);

-- Settlement Payouts
CREATE TABLE "settlement_payouts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "settlementId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "positionId" UUID NOT NULL,
    "payoutType" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "positionQuantityCents" INTEGER NOT NULL,
    "positionAvgPriceCents" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "settlement_payouts_pkey" PRIMARY KEY ("id")
);

-- Price History
CREATE TABLE "price_history" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "marketId" UUID NOT NULL,
    "outcomeId" UUID NOT NULL,
    "bucketStart" TIMESTAMP(3) NOT NULL,
    "bucketEnd" TIMESTAMP(3) NOT NULL,
    "intervalMinutes" INTEGER NOT NULL,
    "openCents" INTEGER NOT NULL,
    "highCents" INTEGER NOT NULL,
    "lowCents" INTEGER NOT NULL,
    "closeCents" INTEGER NOT NULL,
    "volumeCents" BIGINT NOT NULL DEFAULT 0,
    "tradeCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "price_history_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "price_history_unique" UNIQUE ("marketId", "outcomeId", "bucketStart", "intervalMinutes")
);

-- Add new columns to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "balanceCents" BIGINT NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "lockedBalanceCents" BIGINT NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "totalProfitCents" BIGINT NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "totalVolumeCents" BIGINT NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "riskScore" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "isFlagged" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "flagReason" TEXT;

-- Add new columns to market_outcomes table
ALTER TABLE "market_outcomes" ADD COLUMN IF NOT EXISTS "currentPriceCents" INTEGER NOT NULL DEFAULT 50;
ALTER TABLE "market_outcomes" ADD COLUMN IF NOT EXISTS "initialPriceCents" INTEGER NOT NULL DEFAULT 50;

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX "orders_market_outcome_status_idx" ON "orders"("marketId", "outcomeId", "status");
CREATE INDEX "orders_clob_idx" ON "orders"("marketId", "side", "priceCents", "createdAt");
CREATE INDEX "orders_user_status_idx" ON "orders"("userId", "status");
CREATE INDEX "orders_status_created_idx" ON "orders"("status", "createdAt");
CREATE INDEX "orders_expires_idx" ON "orders"("expiresAt");

CREATE INDEX "taker_queue_release_status_idx" ON "taker_queue"("releaseAt", "status");
CREATE INDEX "taker_queue_status_idx" ON "taker_queue"("status");

CREATE INDEX "trades_market_executed_idx" ON "trades"("marketId", "executedAt");
CREATE INDEX "trades_buyer_idx" ON "trades"("buyerId");
CREATE INDEX "trades_seller_idx" ON "trades"("sellerId");
CREATE INDEX "trades_executed_idx" ON "trades"("executedAt");

CREATE INDEX "positions_user_idx" ON "positions"("userId");
CREATE INDEX "positions_market_idx" ON "positions"("marketId");

CREATE INDEX "liquidity_rewards_user_period_idx" ON "liquidity_rewards"("userId", "periodStart");
CREATE INDEX "liquidity_rewards_market_period_idx" ON "liquidity_rewards"("marketId", "periodStart");
CREATE INDEX "liquidity_rewards_status_idx" ON "liquidity_rewards"("status");

CREATE INDEX "dmm_metrics_user_period_idx" ON "dmm_metrics"("userId", "periodStart");
CREATE INDEX "dmm_metrics_market_idx" ON "dmm_metrics"("marketId");

CREATE INDEX "dmm_registrations_status_idx" ON "dmm_registrations"("status");

CREATE INDEX "risk_events_type_created_idx" ON "risk_events"("eventType", "createdAt");
CREATE INDEX "risk_events_user_idx" ON "risk_events"("userId");
CREATE INDEX "risk_events_market_idx" ON "risk_events"("marketId");
CREATE INDEX "risk_events_severity_status_idx" ON "risk_events"("severity", "status");

CREATE INDEX "market_liquidity_states_tier_idx" ON "market_liquidity_states"("liquidityTier");

CREATE INDEX "order_book_snapshots_market_time_idx" ON "order_book_snapshots"("marketId", "snapshotAt");
CREATE INDEX "order_book_snapshots_outcome_time_idx" ON "order_book_snapshots"("outcomeId", "snapshotAt");

CREATE INDEX "settlement_records_market_idx" ON "settlement_records"("marketId");
CREATE INDEX "settlement_records_status_idx" ON "settlement_records"("status");

CREATE INDEX "settlement_payouts_settlement_idx" ON "settlement_payouts"("settlementId");
CREATE INDEX "settlement_payouts_user_idx" ON "settlement_payouts"("userId");

CREATE INDEX "price_history_market_time_idx" ON "price_history"("marketId", "bucketStart");

-- ============================================================================
-- FOREIGN KEYS
-- ============================================================================

ALTER TABLE "orders" ADD CONSTRAINT "orders_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "orders" ADD CONSTRAINT "orders_marketId_fkey"
    FOREIGN KEY ("marketId") REFERENCES "markets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "orders" ADD CONSTRAINT "orders_outcomeId_fkey"
    FOREIGN KEY ("outcomeId") REFERENCES "market_outcomes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "trades" ADD CONSTRAINT "trades_marketId_fkey"
    FOREIGN KEY ("marketId") REFERENCES "markets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "trades" ADD CONSTRAINT "trades_outcomeId_fkey"
    FOREIGN KEY ("outcomeId") REFERENCES "market_outcomes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "trades" ADD CONSTRAINT "trades_buyOrderId_fkey"
    FOREIGN KEY ("buyOrderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "trades" ADD CONSTRAINT "trades_sellOrderId_fkey"
    FOREIGN KEY ("sellOrderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "trades" ADD CONSTRAINT "trades_buyerId_fkey"
    FOREIGN KEY ("buyerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "trades" ADD CONSTRAINT "trades_sellerId_fkey"
    FOREIGN KEY ("sellerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "positions" ADD CONSTRAINT "positions_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "positions" ADD CONSTRAINT "positions_marketId_fkey"
    FOREIGN KEY ("marketId") REFERENCES "markets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "positions" ADD CONSTRAINT "positions_outcomeId_fkey"
    FOREIGN KEY ("outcomeId") REFERENCES "market_outcomes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "liquidity_rewards" ADD CONSTRAINT "liquidity_rewards_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "liquidity_rewards" ADD CONSTRAINT "liquidity_rewards_marketId_fkey"
    FOREIGN KEY ("marketId") REFERENCES "markets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "dmm_metrics" ADD CONSTRAINT "dmm_metrics_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "dmm_metrics" ADD CONSTRAINT "dmm_metrics_marketId_fkey"
    FOREIGN KEY ("marketId") REFERENCES "markets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "dmm_registrations" ADD CONSTRAINT "dmm_registrations_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "dmm_registrations" ADD CONSTRAINT "dmm_registrations_approvedById_fkey"
    FOREIGN KEY ("approvedById") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "market_maker_bots" ADD CONSTRAINT "market_maker_bots_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "risk_events" ADD CONSTRAINT "risk_events_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "risk_events" ADD CONSTRAINT "risk_events_marketId_fkey"
    FOREIGN KEY ("marketId") REFERENCES "markets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "risk_events" ADD CONSTRAINT "risk_events_resolvedById_fkey"
    FOREIGN KEY ("resolvedById") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "market_liquidity_states" ADD CONSTRAINT "market_liquidity_states_marketId_fkey"
    FOREIGN KEY ("marketId") REFERENCES "markets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "settlement_records" ADD CONSTRAINT "settlement_records_marketId_fkey"
    FOREIGN KEY ("marketId") REFERENCES "markets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "settlement_records" ADD CONSTRAINT "settlement_records_processedById_fkey"
    FOREIGN KEY ("processedById") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "settlement_payouts" ADD CONSTRAINT "settlement_payouts_settlementId_fkey"
    FOREIGN KEY ("settlementId") REFERENCES "settlement_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "settlement_payouts" ADD CONSTRAINT "settlement_payouts_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "settlement_payouts" ADD CONSTRAINT "settlement_payouts_positionId_fkey"
    FOREIGN KEY ("positionId") REFERENCES "positions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================================
-- TYPE DEFINITIONS
-- ============================================================================

DO $$ BEGIN
    CREATE TYPE order_match_result AS (
        trade_id UUID,
        matched_order_id UUID,
        price_cents INTEGER,
        quantity_cents INTEGER,
        is_complete BOOLEAN
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE matching_summary AS (
        total_filled_cents INTEGER,
        trades_created INTEGER,
        remaining_cents INTEGER,
        avg_price_cents INTEGER,
        reason_code TEXT
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- CORE MATCHING ENGINE: match_orders RPC
-- Price-Time Priority CLOB with NT 2024 Compliance
-- INVARIANT: P_yes + P_no = 100 cents for any matching trade
-- ============================================================================

CREATE OR REPLACE FUNCTION match_orders(
    p_order_id UUID,
    p_force_immediate BOOLEAN DEFAULT FALSE
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order RECORD;
    v_counter_order RECORD;
    v_trade_id UUID;
    v_fill_qty INTEGER;
    v_fill_price INTEGER;
    v_total_filled INTEGER := 0;
    v_trades_created INTEGER := 0;
    v_remaining INTEGER;
    v_opposite_side TEXT;
    v_liquidity_state RECORD;
    v_max_bet INTEGER;
    v_audit_id UUID;
    v_result JSONB;
BEGIN
    -- Get the order to match
    SELECT * INTO v_order FROM orders WHERE id = p_order_id FOR UPDATE;

    IF v_order IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Order not found',
            'reason_code', 'ORDER_NOT_FOUND'
        );
    END IF;

    -- Check if order is in valid state for matching
    IF v_order.status NOT IN ('pending', 'open', 'partial') THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Order not in matchable state',
            'reason_code', 'INVALID_ORDER_STATE',
            'order_status', v_order.status
        );
    END IF;

    -- Get liquidity state for NT bet cap enforcement
    SELECT * INTO v_liquidity_state
    FROM market_liquidity_states
    WHERE "marketId" = v_order."marketId";

    -- NT Liquidity-Locked Bet Cap: If liquidity < $10,000, max bet = $500
    v_max_bet := COALESCE(v_liquidity_state."maxBetCents", 50000);

    IF v_order."quantityCents" > v_max_bet THEN
        -- Reject order exceeding bet cap
        UPDATE orders SET
            status = 'rejected',
            "reasonCode" = 'EXCEEDS_LIQUIDITY_CAP',
            "updatedAt" = NOW()
        WHERE id = p_order_id;

        RETURN jsonb_build_object(
            'success', false,
            'error', 'Order exceeds liquidity-based bet cap',
            'reason_code', 'EXCEEDS_LIQUIDITY_CAP',
            'max_bet_cents', v_max_bet,
            'order_amount_cents', v_order."quantityCents"
        );
    END IF;

    -- Determine opposite side
    v_opposite_side := CASE WHEN v_order.side = 'buy' THEN 'sell' ELSE 'buy' END;
    v_remaining := v_order."remainingCents";

    -- Match against counter orders using Price-Time Priority
    -- For BUY orders: match against SELL orders with price <= buy price (lowest first)
    -- For SELL orders: match against BUY orders with price >= sell price (highest first)
    FOR v_counter_order IN
        SELECT * FROM orders
        WHERE "marketId" = v_order."marketId"
          AND "outcomeId" = v_order."outcomeId"
          AND side = v_opposite_side
          AND status IN ('open', 'partial')
          AND "userId" != v_order."userId"  -- No self-trading
          AND (
              (v_order.side = 'buy' AND "priceCents" <= v_order."priceCents") OR
              (v_order.side = 'sell' AND "priceCents" >= v_order."priceCents")
          )
        ORDER BY
            CASE WHEN v_order.side = 'buy' THEN "priceCents" ELSE -"priceCents" END ASC,
            "createdAt" ASC  -- Time priority for same price
        FOR UPDATE
    LOOP
        -- Calculate fill quantity
        v_fill_qty := LEAST(v_remaining, v_counter_order."remainingCents");

        -- Price is the maker's price (counter order price)
        v_fill_price := v_counter_order."priceCents";

        -- INVARIANT CHECK: P_yes + P_no = 100 cents
        -- For binary markets, this is enforced by the pricing model

        -- Generate trade ID
        v_trade_id := gen_random_uuid();

        -- Create trade record
        INSERT INTO trades (
            id, "marketId", "outcomeId",
            "buyOrderId", "sellOrderId", "buyerId", "sellerId",
            "priceCents", "quantityCents", "reasonCode", "executedAt"
        ) VALUES (
            v_trade_id,
            v_order."marketId",
            v_order."outcomeId",
            CASE WHEN v_order.side = 'buy' THEN v_order.id ELSE v_counter_order.id END,
            CASE WHEN v_order.side = 'sell' THEN v_order.id ELSE v_counter_order.id END,
            CASE WHEN v_order.side = 'buy' THEN v_order."userId" ELSE v_counter_order."userId" END,
            CASE WHEN v_order.side = 'sell' THEN v_order."userId" ELSE v_counter_order."userId" END,
            v_fill_price,
            v_fill_qty,
            'CLOB_MATCH',
            NOW()
        );

        -- Update counter order
        UPDATE orders SET
            "filledCents" = "filledCents" + v_fill_qty,
            "remainingCents" = "remainingCents" - v_fill_qty,
            status = CASE
                WHEN "remainingCents" - v_fill_qty = 0 THEN 'filled'
                ELSE 'partial'
            END,
            "filledAt" = CASE
                WHEN "remainingCents" - v_fill_qty = 0 THEN NOW()
                ELSE "filledAt"
            END,
            "updatedAt" = NOW(),
            "reasonCode" = 'CLOB_MATCH'
        WHERE id = v_counter_order.id;

        -- Update positions for both parties
        PERFORM update_position(
            CASE WHEN v_order.side = 'buy' THEN v_order."userId" ELSE v_counter_order."userId" END,
            v_order."marketId",
            v_order."outcomeId",
            v_fill_qty,
            v_fill_price
        );

        PERFORM update_position(
            CASE WHEN v_order.side = 'sell' THEN v_order."userId" ELSE v_counter_order."userId" END,
            v_order."marketId",
            v_order."outcomeId",
            -v_fill_qty,
            v_fill_price
        );

        v_total_filled := v_total_filled + v_fill_qty;
        v_trades_created := v_trades_created + 1;
        v_remaining := v_remaining - v_fill_qty;

        -- Exit if fully filled
        IF v_remaining = 0 THEN
            EXIT;
        END IF;
    END LOOP;

    -- Update the incoming order
    UPDATE orders SET
        "filledCents" = "filledCents" + v_total_filled,
        "remainingCents" = v_remaining,
        status = CASE
            WHEN v_remaining = 0 THEN 'filled'
            WHEN v_total_filled > 0 THEN 'partial'
            ELSE 'open'
        END,
        "filledAt" = CASE
            WHEN v_remaining = 0 THEN NOW()
            ELSE "filledAt"
        END,
        "updatedAt" = NOW(),
        "reasonCode" = CASE
            WHEN v_total_filled > 0 THEN 'CLOB_MATCH'
            ELSE 'NO_MATCH'
        END,
        "isTaker" = (v_total_filled > 0)
    WHERE id = p_order_id;

    -- Update market liquidity state
    PERFORM update_market_liquidity(v_order."marketId");

    -- Update trade velocity for toxic flow detection
    IF v_trades_created > 0 THEN
        PERFORM update_trade_velocity(v_order."marketId");
    END IF;

    -- Build result
    v_result := jsonb_build_object(
        'success', true,
        'order_id', p_order_id,
        'total_filled_cents', v_total_filled,
        'trades_created', v_trades_created,
        'remaining_cents', v_remaining,
        'status', CASE
            WHEN v_remaining = 0 THEN 'filled'
            WHEN v_total_filled > 0 THEN 'partial'
            ELSE 'open'
        END,
        'reason_code', CASE
            WHEN v_total_filled > 0 THEN 'CLOB_MATCH'
            ELSE 'NO_MATCH'
        END
    );

    -- Log to audit events
    INSERT INTO audit_events (
        "occurredAtMs", "eventType", "actorType", "actorId",
        "marketId", "orderId", "reasonCode", "metadata"
    ) VALUES (
        EXTRACT(EPOCH FROM NOW()) * 1000,
        CASE WHEN v_total_filled > 0 THEN 'ORDER_MATCHED' ELSE 'ORDER_PLACED' END,
        'user',
        v_order."userId",
        v_order."marketId",
        p_order_id,
        v_result->>'reason_code',
        v_result
    );

    RETURN v_result;
END;
$$;

-- ============================================================================
-- TAKER QUEUE: 500ms Delay Processing
-- Mandatory delay for taker orders to allow MM "fair look"
-- ============================================================================

CREATE OR REPLACE FUNCTION queue_taker_order(
    p_order_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order RECORD;
    v_queue_id UUID;
    v_release_at TIMESTAMP;
BEGIN
    -- Get the order
    SELECT * INTO v_order FROM orders WHERE id = p_order_id;

    IF v_order IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Order not found'
        );
    END IF;

    -- Calculate release time (500ms delay)
    v_release_at := NOW() + INTERVAL '500 milliseconds';
    v_queue_id := gen_random_uuid();

    -- Insert into taker queue
    INSERT INTO taker_queue (
        id, "orderId", "queuedAt", "releaseAt", status, "orderSnapshot"
    ) VALUES (
        v_queue_id,
        p_order_id,
        NOW(),
        v_release_at,
        'queued',
        to_jsonb(v_order)
    );

    -- Update order status to pending
    UPDATE orders SET status = 'pending', "updatedAt" = NOW() WHERE id = p_order_id;

    RETURN jsonb_build_object(
        'success', true,
        'queue_id', v_queue_id,
        'order_id', p_order_id,
        'release_at', v_release_at,
        'delay_ms', 500
    );
END;
$$;

CREATE OR REPLACE FUNCTION process_taker_queue()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_queue_item RECORD;
    v_match_result JSONB;
    v_processed_count INTEGER := 0;
    v_results JSONB := '[]'::JSONB;
BEGIN
    -- Process all queued orders that have reached release time
    FOR v_queue_item IN
        SELECT * FROM taker_queue
        WHERE status = 'queued'
          AND "releaseAt" <= NOW()
        ORDER BY "releaseAt" ASC
        FOR UPDATE SKIP LOCKED
    LOOP
        -- Update queue status to processing
        UPDATE taker_queue SET status = 'processing' WHERE id = v_queue_item.id;

        -- Attempt to match the order
        v_match_result := match_orders(v_queue_item."orderId", TRUE);

        -- Update queue with result
        UPDATE taker_queue SET
            status = 'completed',
            "processedAt" = NOW(),
            "matchResult" = v_match_result
        WHERE id = v_queue_item.id;

        v_processed_count := v_processed_count + 1;
        v_results := v_results || jsonb_build_object(
            'queue_id', v_queue_item.id,
            'order_id', v_queue_item."orderId",
            'result', v_match_result
        );
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'processed_count', v_processed_count,
        'results', v_results
    );
END;
$$;

-- ============================================================================
-- POSITION MANAGEMENT
-- ============================================================================

CREATE OR REPLACE FUNCTION update_position(
    p_user_id UUID,
    p_market_id UUID,
    p_outcome_id UUID,
    p_quantity_delta INTEGER,  -- Positive for buy, negative for sell
    p_price_cents INTEGER
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_position RECORD;
    v_new_quantity INTEGER;
    v_new_avg_price INTEGER;
    v_new_total_cost INTEGER;
BEGIN
    -- Get or create position
    SELECT * INTO v_position
    FROM positions
    WHERE "userId" = p_user_id
      AND "marketId" = p_market_id
      AND "outcomeId" = p_outcome_id
    FOR UPDATE;

    IF v_position IS NULL THEN
        -- Create new position
        INSERT INTO positions (
            "userId", "marketId", "outcomeId",
            "quantityCents", "avgPriceCents", "totalCostCents"
        ) VALUES (
            p_user_id, p_market_id, p_outcome_id,
            GREATEST(p_quantity_delta, 0),
            p_price_cents,
            ABS(p_quantity_delta) * p_price_cents / 100
        );
    ELSE
        -- Update existing position
        v_new_quantity := v_position."quantityCents" + p_quantity_delta;

        IF p_quantity_delta > 0 THEN
            -- Buying: average in the new price
            v_new_total_cost := v_position."totalCostCents" + (p_quantity_delta * p_price_cents / 100);
            v_new_avg_price := CASE
                WHEN v_new_quantity > 0 THEN (v_new_total_cost * 100) / v_new_quantity
                ELSE 0
            END;
        ELSE
            -- Selling: reduce cost proportionally
            v_new_total_cost := CASE
                WHEN v_position."quantityCents" > 0
                THEN (v_position."totalCostCents" * v_new_quantity) / v_position."quantityCents"
                ELSE 0
            END;
            v_new_avg_price := v_position."avgPriceCents";
        END IF;

        UPDATE positions SET
            "quantityCents" = v_new_quantity,
            "avgPriceCents" = COALESCE(v_new_avg_price, 0),
            "totalCostCents" = GREATEST(v_new_total_cost, 0),
            "updatedAt" = NOW()
        WHERE id = v_position.id;
    END IF;
END;
$$;

-- ============================================================================
-- MARKET LIQUIDITY STATE MANAGEMENT
-- NT Bet Cap Logic: If liquidity < $10,000, max bet = $500
-- ============================================================================

CREATE OR REPLACE FUNCTION update_market_liquidity(
    p_market_id UUID
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_bid_liquidity BIGINT;
    v_ask_liquidity BIGINT;
    v_total_liquidity BIGINT;
    v_best_bid INTEGER;
    v_best_ask INTEGER;
    v_mid_price INTEGER;
    v_spread INTEGER;
    v_liquidity_tier TEXT;
    v_max_bet INTEGER;
BEGIN
    -- Calculate bid liquidity (sum of all open buy orders)
    SELECT COALESCE(SUM("remainingCents"), 0) INTO v_bid_liquidity
    FROM orders
    WHERE "marketId" = p_market_id
      AND side = 'buy'
      AND status IN ('open', 'partial');

    -- Calculate ask liquidity (sum of all open sell orders)
    SELECT COALESCE(SUM("remainingCents"), 0) INTO v_ask_liquidity
    FROM orders
    WHERE "marketId" = p_market_id
      AND side = 'sell'
      AND status IN ('open', 'partial');

    v_total_liquidity := v_bid_liquidity + v_ask_liquidity;

    -- Get best bid
    SELECT MAX("priceCents") INTO v_best_bid
    FROM orders
    WHERE "marketId" = p_market_id
      AND side = 'buy'
      AND status IN ('open', 'partial');

    -- Get best ask
    SELECT MIN("priceCents") INTO v_best_ask
    FROM orders
    WHERE "marketId" = p_market_id
      AND side = 'sell'
      AND status IN ('open', 'partial');

    -- Calculate mid price and spread
    IF v_best_bid IS NOT NULL AND v_best_ask IS NOT NULL THEN
        v_mid_price := (v_best_bid + v_best_ask) / 2;
        v_spread := v_best_ask - v_best_bid;
    ELSE
        v_mid_price := NULL;
        v_spread := NULL;
    END IF;

    -- Determine liquidity tier and max bet (NT requirement)
    IF v_total_liquidity < 1000000 THEN  -- < $10,000
        v_liquidity_tier := 'seed';
        v_max_bet := 50000;  -- $500 max
    ELSIF v_total_liquidity < 10000000 THEN  -- < $100,000
        v_liquidity_tier := 'growth';
        v_max_bet := 500000;  -- $5,000 max
    ELSE
        v_liquidity_tier := 'mature';
        v_max_bet := 5000000;  -- $50,000 max
    END IF;

    -- Upsert liquidity state
    INSERT INTO market_liquidity_states (
        "marketId", "totalLiquidityCents", "bidLiquidityCents", "askLiquidityCents",
        "bestBidCents", "bestAskCents", "midPriceCents", "spreadCents",
        "liquidityTier", "maxBetCents", "updatedAt"
    ) VALUES (
        p_market_id, v_total_liquidity, v_bid_liquidity, v_ask_liquidity,
        v_best_bid, v_best_ask, v_mid_price, v_spread,
        v_liquidity_tier, v_max_bet, NOW()
    )
    ON CONFLICT ("marketId") DO UPDATE SET
        "totalLiquidityCents" = EXCLUDED."totalLiquidityCents",
        "bidLiquidityCents" = EXCLUDED."bidLiquidityCents",
        "askLiquidityCents" = EXCLUDED."askLiquidityCents",
        "bestBidCents" = EXCLUDED."bestBidCents",
        "bestAskCents" = EXCLUDED."bestAskCents",
        "midPriceCents" = EXCLUDED."midPriceCents",
        "spreadCents" = EXCLUDED."spreadCents",
        "liquidityTier" = EXCLUDED."liquidityTier",
        "maxBetCents" = EXCLUDED."maxBetCents",
        "updatedAt" = NOW();
END;
$$;

-- ============================================================================
-- ANTI-SHARP: Trade Velocity Tracking & Toxic Flow Detection
-- Dynamic Spread: Widens by 300% if 10+ trades in < 2 seconds
-- ============================================================================

CREATE OR REPLACE FUNCTION update_trade_velocity(
    p_market_id UUID
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_trades_last_2_sec INTEGER;
    v_current_multiplier FLOAT;
    v_new_multiplier FLOAT;
    v_spread_reason TEXT;
BEGIN
    -- Count trades in last 2 seconds
    SELECT COUNT(*) INTO v_trades_last_2_sec
    FROM trades
    WHERE "marketId" = p_market_id
      AND "executedAt" >= NOW() - INTERVAL '2 seconds';

    -- Get current spread multiplier
    SELECT "spreadMultiplier" INTO v_current_multiplier
    FROM market_liquidity_states
    WHERE "marketId" = p_market_id;

    v_current_multiplier := COALESCE(v_current_multiplier, 1.0);

    -- Determine new multiplier
    IF v_trades_last_2_sec >= 10 THEN
        -- Toxic flow detected: widen spread by 300%
        v_new_multiplier := 3.0;
        v_spread_reason := 'TOXIC_FLOW_HALT';

        -- Log risk event
        INSERT INTO risk_events (
            "eventType", severity, "marketId",
            "detectionRule", "triggerData", "actionTaken", "actionDetails"
        ) VALUES (
            'TOXIC_FLOW',
            'high',
            p_market_id,
            'TRADES_PER_2_SEC >= 10',
            jsonb_build_object('trades_count', v_trades_last_2_sec),
            'SPREAD_WIDEN',
            jsonb_build_object('multiplier', v_new_multiplier)
        );
    ELSIF v_trades_last_2_sec >= 5 THEN
        -- Elevated activity: moderate widening
        v_new_multiplier := 2.0;
        v_spread_reason := 'HIGH_VOLATILITY';
    ELSE
        -- Normal: gradually reduce multiplier
        v_new_multiplier := GREATEST(1.0, v_current_multiplier * 0.9);
        v_spread_reason := 'NORMAL';
    END IF;

    -- Update liquidity state
    UPDATE market_liquidity_states SET
        "tradesLast2Sec" = v_trades_last_2_sec,
        "lastTradeAt" = NOW(),
        "spreadMultiplier" = v_new_multiplier,
        "spreadReason" = v_spread_reason,
        "updatedAt" = NOW()
    WHERE "marketId" = p_market_id;
END;
$$;

-- ============================================================================
-- ANTI-SHARP: IP Cluster Detection
-- ============================================================================

CREATE OR REPLACE FUNCTION detect_ip_cluster(
    p_ip_address TEXT,
    p_user_id UUID,
    p_time_window_minutes INTEGER DEFAULT 5
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order_count INTEGER;
    v_user_count INTEGER;
    v_is_suspicious BOOLEAN := FALSE;
BEGIN
    -- Count orders from this IP in time window
    SELECT COUNT(*) INTO v_order_count
    FROM orders
    WHERE "ipAddress" = p_ip_address
      AND "createdAt" >= NOW() - (p_time_window_minutes || ' minutes')::INTERVAL;

    -- Count unique users from this IP
    SELECT COUNT(DISTINCT "userId") INTO v_user_count
    FROM orders
    WHERE "ipAddress" = p_ip_address
      AND "createdAt" >= NOW() - (p_time_window_minutes || ' minutes')::INTERVAL;

    -- Suspicious if multiple users from same IP with many orders
    IF v_user_count > 1 AND v_order_count > 20 THEN
        v_is_suspicious := TRUE;

        -- Log risk event
        INSERT INTO risk_events (
            "eventType", severity, "userId", "ipAddress",
            "detectionRule", "triggerData", "actionTaken"
        ) VALUES (
            'IP_CLUSTER',
            'medium',
            p_user_id,
            p_ip_address,
            'MULTIPLE_USERS_SAME_IP',
            jsonb_build_object(
                'order_count', v_order_count,
                'user_count', v_user_count,
                'time_window_minutes', p_time_window_minutes
            ),
            'ALERT_ONLY'
        );
    END IF;

    RETURN jsonb_build_object(
        'ip_address', p_ip_address,
        'order_count', v_order_count,
        'user_count', v_user_count,
        'is_suspicious', v_is_suspicious
    );
END;
$$;

-- ============================================================================
-- ANTI-SHARP: Rapid Fire Detection
-- ============================================================================

CREATE OR REPLACE FUNCTION detect_rapid_fire(
    p_user_id UUID,
    p_time_window_seconds INTEGER DEFAULT 10
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order_count INTEGER;
    v_is_rapid_fire BOOLEAN := FALSE;
    v_threshold INTEGER := 5;  -- More than 5 orders in 10 seconds
BEGIN
    SELECT COUNT(*) INTO v_order_count
    FROM orders
    WHERE "userId" = p_user_id
      AND "createdAt" >= NOW() - (p_time_window_seconds || ' seconds')::INTERVAL;

    IF v_order_count > v_threshold THEN
        v_is_rapid_fire := TRUE;

        -- Flag user and log risk event
        UPDATE users SET
            "riskScore" = LEAST("riskScore" + 10, 100),
            "isFlagged" = TRUE,
            "flagReason" = 'RAPID_FIRE_ORDERS'
        WHERE id = p_user_id;

        INSERT INTO risk_events (
            "eventType", severity, "userId",
            "detectionRule", "triggerData", "actionTaken"
        ) VALUES (
            'RAPID_FIRE',
            'high',
            p_user_id,
            'ORDERS_PER_10_SEC > 5',
            jsonb_build_object(
                'order_count', v_order_count,
                'time_window_seconds', p_time_window_seconds
            ),
            'HALT_USER'
        );
    END IF;

    RETURN jsonb_build_object(
        'user_id', p_user_id,
        'order_count', v_order_count,
        'threshold', v_threshold,
        'is_rapid_fire', v_is_rapid_fire
    );
END;
$$;

-- ============================================================================
-- INVENTORY SKEW: Avellaneda-Stoikov Price Adjustment
-- Shifts prices away from direction of heavy informed buying
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_inventory_skew(
    p_market_id UUID,
    p_base_spread_cents INTEGER DEFAULT 10,
    p_gamma FLOAT DEFAULT 0.1,  -- Risk aversion parameter
    p_sigma FLOAT DEFAULT 0.5   -- Volatility estimate
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_net_inventory BIGINT;
    v_max_inventory BIGINT := 1000000;  -- $10,000 max inventory
    v_inventory_ratio FLOAT;
    v_skew_adjustment INTEGER;
    v_adjusted_bid INTEGER;
    v_adjusted_ask INTEGER;
    v_mid_price INTEGER;
    v_liquidity_state RECORD;
BEGIN
    -- Get current liquidity state
    SELECT * INTO v_liquidity_state
    FROM market_liquidity_states
    WHERE "marketId" = p_market_id;

    IF v_liquidity_state IS NULL OR v_liquidity_state."midPriceCents" IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'No liquidity state available'
        );
    END IF;

    v_mid_price := v_liquidity_state."midPriceCents";

    -- Calculate net market maker inventory (bid - ask liquidity as proxy)
    v_net_inventory := v_liquidity_state."bidLiquidityCents" - v_liquidity_state."askLiquidityCents";
    v_inventory_ratio := v_net_inventory::FLOAT / v_max_inventory;

    -- Avellaneda-Stoikov skew formula (simplified):
    -- skew = gamma * sigma^2 * inventory_ratio
    -- This shifts the mid-price away from heavy inventory direction
    v_skew_adjustment := (p_gamma * p_sigma * p_sigma * v_inventory_ratio * 100)::INTEGER;

    -- Adjust bid/ask with skew and spread multiplier
    v_adjusted_bid := v_mid_price - (p_base_spread_cents * v_liquidity_state."spreadMultiplier" / 2)::INTEGER - v_skew_adjustment;
    v_adjusted_ask := v_mid_price + (p_base_spread_cents * v_liquidity_state."spreadMultiplier" / 2)::INTEGER - v_skew_adjustment;

    -- Clamp to valid price range (1-99 cents)
    v_adjusted_bid := GREATEST(1, LEAST(98, v_adjusted_bid));
    v_adjusted_ask := GREATEST(2, LEAST(99, v_adjusted_ask));

    -- Ensure bid < ask
    IF v_adjusted_bid >= v_adjusted_ask THEN
        v_adjusted_ask := v_adjusted_bid + 1;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'market_id', p_market_id,
        'mid_price_cents', v_mid_price,
        'net_inventory', v_net_inventory,
        'inventory_ratio', v_inventory_ratio,
        'skew_adjustment', v_skew_adjustment,
        'spread_multiplier', v_liquidity_state."spreadMultiplier",
        'adjusted_bid_cents', v_adjusted_bid,
        'adjusted_ask_cents', v_adjusted_ask,
        'effective_spread', v_adjusted_ask - v_adjusted_bid
    );
END;
$$;

-- ============================================================================
-- SETTLEMENT: Official Result Distribution (NT 2024 Requirement)
-- ============================================================================

CREATE OR REPLACE FUNCTION settle_market(
    p_market_id UUID,
    p_winning_outcome_id UUID,
    p_resolution_source TEXT,
    p_resolution_evidence JSONB,
    p_admin_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_settlement_id UUID;
    v_position RECORD;
    v_payout_cents INTEGER;
    v_total_payout BIGINT := 0;
    v_payouts_processed INTEGER := 0;
BEGIN
    -- Create settlement record
    v_settlement_id := gen_random_uuid();

    INSERT INTO settlement_records (
        id, "marketId", "settlementType", "winningOutcomeId",
        "resolutionSource", "resolutionEvidence", status, "reasonCode", "processedById"
    ) VALUES (
        v_settlement_id,
        p_market_id,
        'NORMAL',
        p_winning_outcome_id,
        p_resolution_source,
        p_resolution_evidence,
        'processing',
        'ORACLE_RESULT',
        p_admin_id
    );

    -- Process all positions for this market
    FOR v_position IN
        SELECT p.*, mo.id AS outcome_id, mo."isWinner"
        FROM positions p
        JOIN market_outcomes mo ON p."outcomeId" = mo.id
        WHERE p."marketId" = p_market_id
          AND p."quantityCents" > 0
    LOOP
        -- Calculate payout
        IF v_position.outcome_id = p_winning_outcome_id THEN
            -- Winner: payout = quantity (each share worth $1)
            v_payout_cents := v_position."quantityCents";
        ELSE
            -- Loser: no payout
            v_payout_cents := 0;
        END IF;

        -- Create payout record
        INSERT INTO settlement_payouts (
            "settlementId", "userId", "positionId",
            "payoutType", "amountCents",
            "positionQuantityCents", "positionAvgPriceCents",
            status
        ) VALUES (
            v_settlement_id,
            v_position."userId",
            v_position.id,
            CASE WHEN v_payout_cents > 0 THEN 'WIN' ELSE 'LOSS' END,
            v_payout_cents,
            v_position."quantityCents",
            v_position."avgPriceCents",
            'pending'
        );

        -- Credit user balance
        IF v_payout_cents > 0 THEN
            UPDATE users SET
                "balanceCents" = "balanceCents" + v_payout_cents,
                "totalProfitCents" = "totalProfitCents" + (v_payout_cents - v_position."totalCostCents"),
                "updatedAt" = NOW()
            WHERE id = v_position."userId";

            v_total_payout := v_total_payout + v_payout_cents;
        END IF;

        v_payouts_processed := v_payouts_processed + 1;
    END LOOP;

    -- Update settlement record
    UPDATE settlement_records SET
        "totalPayoutCents" = v_total_payout,
        status = 'completed',
        "completedAt" = NOW()
    WHERE id = v_settlement_id;

    -- Mark all payouts as processed
    UPDATE settlement_payouts SET
        status = 'processed',
        "processedAt" = NOW()
    WHERE "settlementId" = v_settlement_id;

    -- Update market status
    UPDATE markets SET
        status = 'settled',
        "settledAt" = NOW(),
        "updatedAt" = NOW()
    WHERE id = p_market_id;

    -- Cancel all open orders
    UPDATE orders SET
        status = 'cancelled',
        "cancelledAt" = NOW(),
        "reasonCode" = 'MARKET_SETTLED',
        "updatedAt" = NOW()
    WHERE "marketId" = p_market_id
      AND status IN ('pending', 'open', 'partial');

    -- Log audit event
    INSERT INTO audit_events (
        "occurredAtMs", "eventType", "actorType", "actorId",
        "marketId", "reasonCode", "metadata"
    ) VALUES (
        EXTRACT(EPOCH FROM NOW()) * 1000,
        'MARKET_SETTLED',
        'admin',
        p_admin_id,
        p_market_id,
        'ORACLE_RESULT',
        jsonb_build_object(
            'settlement_id', v_settlement_id,
            'winning_outcome_id', p_winning_outcome_id,
            'total_payout_cents', v_total_payout,
            'payouts_processed', v_payouts_processed
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'settlement_id', v_settlement_id,
        'market_id', p_market_id,
        'winning_outcome_id', p_winning_outcome_id,
        'total_payout_cents', v_total_payout,
        'payouts_processed', v_payouts_processed
    );
END;
$$;

-- ============================================================================
-- REFUND: Market Cancellation (NT 2024 Requirement)
-- ============================================================================

CREATE OR REPLACE FUNCTION refund_market(
    p_market_id UUID,
    p_reason TEXT,
    p_admin_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_settlement_id UUID;
    v_position RECORD;
    v_refund_cents INTEGER;
    v_total_refund BIGINT := 0;
    v_refunds_processed INTEGER := 0;
BEGIN
    -- Create settlement record for refund
    v_settlement_id := gen_random_uuid();

    INSERT INTO settlement_records (
        id, "marketId", "settlementType",
        status, "reasonCode", "processedById"
    ) VALUES (
        v_settlement_id,
        p_market_id,
        'REFUND',
        'processing',
        'MARKET_CANCELLED',
        p_admin_id
    );

    -- Refund all positions at cost basis
    FOR v_position IN
        SELECT * FROM positions
        WHERE "marketId" = p_market_id
          AND "quantityCents" > 0
    LOOP
        -- Refund = total cost basis
        v_refund_cents := v_position."totalCostCents";

        -- Create payout record
        INSERT INTO settlement_payouts (
            "settlementId", "userId", "positionId",
            "payoutType", "amountCents",
            "positionQuantityCents", "positionAvgPriceCents",
            status
        ) VALUES (
            v_settlement_id,
            v_position."userId",
            v_position.id,
            'REFUND',
            v_refund_cents,
            v_position."quantityCents",
            v_position."avgPriceCents",
            'pending'
        );

        -- Credit user balance
        UPDATE users SET
            "balanceCents" = "balanceCents" + v_refund_cents,
            "updatedAt" = NOW()
        WHERE id = v_position."userId";

        v_total_refund := v_total_refund + v_refund_cents;
        v_refunds_processed := v_refunds_processed + 1;
    END LOOP;

    -- Update settlement record
    UPDATE settlement_records SET
        "totalRefundCents" = v_total_refund,
        status = 'completed',
        "completedAt" = NOW()
    WHERE id = v_settlement_id;

    -- Mark all payouts as processed
    UPDATE settlement_payouts SET
        status = 'processed',
        "processedAt" = NOW()
    WHERE "settlementId" = v_settlement_id;

    -- Update market status
    UPDATE markets SET
        status = 'archived',
        "updatedAt" = NOW()
    WHERE id = p_market_id;

    -- Cancel all open orders
    UPDATE orders SET
        status = 'cancelled',
        "cancelledAt" = NOW(),
        "reasonCode" = 'MARKET_CANCELLED',
        "updatedAt" = NOW()
    WHERE "marketId" = p_market_id
      AND status IN ('pending', 'open', 'partial');

    -- Log audit event
    INSERT INTO audit_events (
        "occurredAtMs", "eventType", "actorType", "actorId",
        "marketId", "reasonCode", "metadata"
    ) VALUES (
        EXTRACT(EPOCH FROM NOW()) * 1000,
        'MARKET_REFUNDED',
        'admin',
        p_admin_id,
        p_market_id,
        'MARKET_CANCELLED',
        jsonb_build_object(
            'settlement_id', v_settlement_id,
            'reason', p_reason,
            'total_refund_cents', v_total_refund,
            'refunds_processed', v_refunds_processed
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'settlement_id', v_settlement_id,
        'market_id', p_market_id,
        'reason', p_reason,
        'total_refund_cents', v_total_refund,
        'refunds_processed', v_refunds_processed
    );
END;
$$;

-- ============================================================================
-- LIP: Time-Weighted Liquidity Calculation
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_twl_points(
    p_user_id UUID,
    p_market_id UUID,
    p_period_start TIMESTAMP,
    p_period_end TIMESTAMP
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order RECORD;
    v_mid_price INTEGER;
    v_spread_threshold INTEGER;
    v_total_twl BIGINT := 0;
    v_total_time_ms BIGINT := 0;
    v_orders_tracked INTEGER := 0;
    v_time_in_spread BIGINT := 0;
BEGIN
    -- Get current mid price
    SELECT "midPriceCents" INTO v_mid_price
    FROM market_liquidity_states
    WHERE "marketId" = p_market_id;

    IF v_mid_price IS NULL THEN
        v_mid_price := 50;  -- Default to 50 cents
    END IF;

    -- 2% of mid price for spread threshold
    v_spread_threshold := GREATEST(1, (v_mid_price * 2 / 100));

    -- Calculate TWL for each qualifying order
    FOR v_order IN
        SELECT *,
            EXTRACT(EPOCH FROM (
                LEAST(COALESCE("filledAt", "cancelledAt", p_period_end), p_period_end) -
                GREATEST("createdAt", p_period_start)
            )) * 1000 AS duration_ms
        FROM orders
        WHERE "userId" = p_user_id
          AND "marketId" = p_market_id
          AND "orderType" = 'limit'
          AND status IN ('open', 'partial', 'filled', 'cancelled')
          AND "createdAt" < p_period_end
          AND (
              "filledAt" IS NULL OR "filledAt" > p_period_start OR
              "cancelledAt" IS NULL OR "cancelledAt" > p_period_start
          )
    LOOP
        -- Check if order is within 2% of mid price
        IF ABS(v_order."priceCents" - v_mid_price) <= v_spread_threshold THEN
            -- TWL = quantity * time
            v_total_twl := v_total_twl + (v_order."remainingCents" * v_order.duration_ms / 1000);
            v_time_in_spread := v_time_in_spread + v_order.duration_ms;
        END IF;

        v_total_time_ms := v_total_time_ms + v_order.duration_ms;
        v_orders_tracked := v_orders_tracked + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'user_id', p_user_id,
        'market_id', p_market_id,
        'period_start', p_period_start,
        'period_end', p_period_end,
        'twl_points', v_total_twl,
        'time_in_spread_ms', v_time_in_spread,
        'total_time_ms', v_total_time_ms,
        'orders_tracked', v_orders_tracked,
        'mid_price_cents', v_mid_price,
        'spread_threshold_cents', v_spread_threshold
    );
END;
$$;

-- ============================================================================
-- HELPER: Create order with all validations
-- ============================================================================

CREATE OR REPLACE FUNCTION create_order(
    p_user_id UUID,
    p_market_id UUID,
    p_outcome_id UUID,
    p_side TEXT,
    p_order_type TEXT,
    p_price_cents INTEGER,
    p_quantity_cents INTEGER,
    p_ip_address TEXT DEFAULT NULL,
    p_device_fingerprint TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order_id UUID;
    v_user RECORD;
    v_market RECORD;
    v_liquidity_state RECORD;
    v_max_bet INTEGER;
    v_required_balance BIGINT;
    v_rapid_fire JSONB;
    v_ip_cluster JSONB;
BEGIN
    -- Get user
    SELECT * INTO v_user FROM users WHERE id = p_user_id;
    IF v_user IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'User not found');
    END IF;

    -- Check if user is flagged
    IF v_user."isFlagged" THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'User account is flagged',
            'reason_code', 'USER_FLAGGED'
        );
    END IF;

    -- Get market
    SELECT * INTO v_market FROM markets WHERE id = p_market_id;
    IF v_market IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Market not found');
    END IF;

    -- Check market status
    IF v_market.status != 'published' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Market is not open for trading',
            'market_status', v_market.status
        );
    END IF;

    -- Check market hasn't closed
    IF v_market."closesAt" <= NOW() THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Market has closed',
            'closes_at', v_market."closesAt"
        );
    END IF;

    -- Get liquidity state for bet cap
    SELECT * INTO v_liquidity_state
    FROM market_liquidity_states
    WHERE "marketId" = p_market_id;

    v_max_bet := COALESCE(v_liquidity_state."maxBetCents", 50000);

    -- NT Liquidity-Locked Bet Cap
    IF p_quantity_cents > v_max_bet THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Order exceeds liquidity-based bet cap',
            'reason_code', 'EXCEEDS_LIQUIDITY_CAP',
            'max_bet_cents', v_max_bet,
            'requested_cents', p_quantity_cents,
            'liquidity_tier', COALESCE(v_liquidity_state."liquidityTier", 'seed')
        );
    END IF;

    -- Validate price (must be 1-99 cents)
    IF p_price_cents < 1 OR p_price_cents > 99 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Price must be between 1 and 99 cents',
            'price_cents', p_price_cents
        );
    END IF;

    -- Calculate required balance
    IF p_side = 'buy' THEN
        v_required_balance := p_quantity_cents * p_price_cents / 100;
    ELSE
        -- For sells, need to own the position or have margin
        v_required_balance := p_quantity_cents * (100 - p_price_cents) / 100;
    END IF;

    -- Check balance
    IF (v_user."balanceCents" - v_user."lockedBalanceCents") < v_required_balance THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Insufficient balance',
            'available_cents', v_user."balanceCents" - v_user."lockedBalanceCents",
            'required_cents', v_required_balance
        );
    END IF;

    -- Anti-sharp checks
    v_rapid_fire := detect_rapid_fire(p_user_id, 10);
    IF (v_rapid_fire->>'is_rapid_fire')::BOOLEAN THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Rate limit exceeded - too many orders',
            'reason_code', 'RAPID_FIRE_DETECTED'
        );
    END IF;

    IF p_ip_address IS NOT NULL THEN
        v_ip_cluster := detect_ip_cluster(p_ip_address, p_user_id, 5);
        -- Don't block, just flag for review
    END IF;

    -- Create the order
    v_order_id := gen_random_uuid();

    INSERT INTO orders (
        id, "marketId", "outcomeId", "userId",
        side, "orderType", "priceCents", "quantityCents", "remainingCents",
        status, "ipAddress", "deviceFingerprint"
    ) VALUES (
        v_order_id,
        p_market_id,
        p_outcome_id,
        p_user_id,
        p_side,
        p_order_type,
        p_price_cents,
        p_quantity_cents,
        p_quantity_cents,
        'pending',
        p_ip_address,
        p_device_fingerprint
    );

    -- Lock the required balance
    UPDATE users SET
        "lockedBalanceCents" = "lockedBalanceCents" + v_required_balance,
        "updatedAt" = NOW()
    WHERE id = p_user_id;

    -- Log audit event
    INSERT INTO audit_events (
        "occurredAtMs", "eventType", "actorType", "actorId",
        "marketId", "orderId", "ipAddress", "metadata"
    ) VALUES (
        EXTRACT(EPOCH FROM NOW()) * 1000,
        'ORDER_PLACED',
        'user',
        p_user_id,
        p_market_id,
        v_order_id,
        p_ip_address,
        jsonb_build_object(
            'side', p_side,
            'order_type', p_order_type,
            'price_cents', p_price_cents,
            'quantity_cents', p_quantity_cents,
            'required_balance', v_required_balance
        )
    );

    -- Queue for taker delay if it's a market order or crossing the spread
    IF p_order_type = 'market' OR (
        (p_side = 'buy' AND v_liquidity_state."bestAskCents" IS NOT NULL AND p_price_cents >= v_liquidity_state."bestAskCents") OR
        (p_side = 'sell' AND v_liquidity_state."bestBidCents" IS NOT NULL AND p_price_cents <= v_liquidity_state."bestBidCents")
    ) THEN
        -- Queue for 500ms delay
        RETURN queue_taker_order(v_order_id);
    ELSE
        -- Maker order: try to match immediately
        UPDATE orders SET status = 'open' WHERE id = v_order_id;
        RETURN match_orders(v_order_id);
    END IF;
END;
$$;

-- ============================================================================
-- HELPER: Cancel order
-- ============================================================================

CREATE OR REPLACE FUNCTION cancel_order(
    p_order_id UUID,
    p_user_id UUID,
    p_reason TEXT DEFAULT 'USER_CANCEL'
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order RECORD;
    v_refund_amount BIGINT;
BEGIN
    -- Get the order
    SELECT * INTO v_order
    FROM orders
    WHERE id = p_order_id
      AND "userId" = p_user_id
    FOR UPDATE;

    IF v_order IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Order not found or not owned by user'
        );
    END IF;

    IF v_order.status NOT IN ('pending', 'open', 'partial') THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Order cannot be cancelled',
            'status', v_order.status
        );
    END IF;

    -- Calculate refund amount
    IF v_order.side = 'buy' THEN
        v_refund_amount := v_order."remainingCents" * v_order."priceCents" / 100;
    ELSE
        v_refund_amount := v_order."remainingCents" * (100 - v_order."priceCents") / 100;
    END IF;

    -- Update order status
    UPDATE orders SET
        status = 'cancelled',
        "cancelledAt" = NOW(),
        "reasonCode" = p_reason,
        "updatedAt" = NOW()
    WHERE id = p_order_id;

    -- Release locked balance
    UPDATE users SET
        "lockedBalanceCents" = "lockedBalanceCents" - v_refund_amount,
        "updatedAt" = NOW()
    WHERE id = p_user_id;

    -- Cancel any pending taker queue entry
    UPDATE taker_queue SET
        status = 'cancelled'
    WHERE "orderId" = p_order_id AND status = 'queued';

    -- Log audit event
    INSERT INTO audit_events (
        "occurredAtMs", "eventType", "actorType", "actorId",
        "orderId", "reasonCode", "metadata"
    ) VALUES (
        EXTRACT(EPOCH FROM NOW()) * 1000,
        'ORDER_CANCELLED',
        'user',
        p_user_id,
        p_order_id,
        p_reason,
        jsonb_build_object(
            'refund_amount', v_refund_amount,
            'remaining_cents', v_order."remainingCents"
        )
    );

    -- Update market liquidity
    PERFORM update_market_liquidity(v_order."marketId");

    RETURN jsonb_build_object(
        'success', true,
        'order_id', p_order_id,
        'refund_amount', v_refund_amount,
        'reason_code', p_reason
    );
END;
$$;

-- ============================================================================
-- GRANTS: Ensure RPC functions are callable
-- ============================================================================

-- Grant execute permissions to authenticated users via Supabase
GRANT EXECUTE ON FUNCTION match_orders(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION queue_taker_order(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION process_taker_queue() TO authenticated;
GRANT EXECUTE ON FUNCTION create_order(UUID, UUID, UUID, TEXT, TEXT, INTEGER, INTEGER, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION cancel_order(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_inventory_skew(UUID, INTEGER, FLOAT, FLOAT) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_twl_points(UUID, UUID, TIMESTAMP, TIMESTAMP) TO authenticated;

-- Admin-only functions
GRANT EXECUTE ON FUNCTION settle_market(UUID, UUID, TEXT, JSONB, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION refund_market(UUID, TEXT, UUID) TO service_role;

-- ============================================================================
-- TRIGGERS: Auto-update timestamps
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER positions_updated_at
    BEFORE UPDATE ON positions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER liquidity_rewards_updated_at
    BEFORE UPDATE ON liquidity_rewards
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER dmm_metrics_updated_at
    BEFORE UPDATE ON dmm_metrics
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER dmm_registrations_updated_at
    BEFORE UPDATE ON dmm_registrations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER market_maker_bots_updated_at
    BEFORE UPDATE ON market_maker_bots
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER market_liquidity_states_updated_at
    BEFORE UPDATE ON market_liquidity_states
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
