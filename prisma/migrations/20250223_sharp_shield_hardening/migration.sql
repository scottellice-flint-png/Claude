-- ============================================================================
-- SHARP SHIELD HARDENING - Production-Grade Exchange Migration
-- NT 2024 + IGA Compliant | Single-Book Kalshi-Style CLOB
-- ============================================================================
-- Migration: 20250223_sharp_shield_hardening
-- Stack: Vercel (Next.js) + Supabase Postgres (ap-southeast-2)
-- ============================================================================

-- Set statement timeout for safety
SET statement_timeout = '300s';

-- ============================================================================
-- PHASE 1: ORACLE LOCK STATE TABLE (Critical Safety)
-- Push-based oracle locking for regulatory + financial safety
-- ============================================================================

CREATE TYPE oracle_lock_status AS ENUM (
    'OPEN',
    'LOCKED',
    'SETTLING',
    'CLOSED'
);

CREATE TYPE oracle_lock_reason AS ENUM (
    'NONE',
    'MATCH_STARTED',
    'OFFICIAL_RESULT',
    'HIGH_VOLATILITY',
    'NEWS_SPIKE',
    'FEED_STALE',
    'MANUAL_LOCK',
    'DEADMAN_SWITCH',
    'PRE_SETTLEMENT',
    'REGULATORY_HALT'
);

CREATE TABLE "oracle_lock_states" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "marketId" UUID NOT NULL,
    "lockStatus" oracle_lock_status NOT NULL DEFAULT 'OPEN',
    "lockReason" oracle_lock_reason NOT NULL DEFAULT 'NONE',
    "lockTriggerSource" TEXT,
    "lockTsMs" BIGINT,
    "lockedAt" TIMESTAMP(3),
    "lockedById" UUID,
    "previousStatus" oracle_lock_status,
    "unlockEligibleAt" TIMESTAMP(3),
    "autoUnlock" BOOLEAN NOT NULL DEFAULT false,
    "lastHeartbeatAt" TIMESTAMP(3),
    "heartbeatIntervalMs" INTEGER NOT NULL DEFAULT 5000,
    "deadmanTimeoutMs" INTEGER NOT NULL DEFAULT 30000,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oracle_lock_states_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "oracle_lock_states_marketId_key" UNIQUE ("marketId")
);

-- Oracle event log (append-only)
CREATE TABLE "oracle_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "marketId" UUID NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventSource" TEXT NOT NULL,
    "eventTsMs" BIGINT NOT NULL,
    "serverTsMs" BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
    "latencyMs" INTEGER,
    "payload" JSONB NOT NULL,
    "actionTaken" TEXT,
    "ordersAffected" INTEGER NOT NULL DEFAULT 0,
    "processedAt" TIMESTAMP(3),
    "processingDurationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oracle_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "oracle_events_market_time_idx" ON "oracle_events"("marketId", "eventTsMs" DESC);
CREATE INDEX "oracle_events_type_idx" ON "oracle_events"("eventType", "createdAt" DESC);
CREATE INDEX "oracle_lock_states_status_idx" ON "oracle_lock_states"("lockStatus");

-- ============================================================================
-- PHASE 2: LIQUIDITY TIERS (Sharp Shield)
-- Effective Depth = MIN(bid depth, ask depth) within +/- 2% of mid-price
-- With hysteresis (5 min upgrade/downgrade)
-- ============================================================================

ALTER TABLE "market_liquidity_states"
ADD COLUMN IF NOT EXISTS "effectiveDepthCents" BIGINT NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "bidDepthNearMidCents" BIGINT NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "askDepthNearMidCents" BIGINT NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "tierEnteredAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "tierUpgradeEligibleAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "tierDowngradeEligibleAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "sharpShieldTier" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "maxTakerCents" INTEGER NOT NULL DEFAULT 10000,
ADD COLUMN IF NOT EXISTS "maxMakerCents" INTEGER NOT NULL DEFAULT 25000;

-- ============================================================================
-- PHASE 3: FEE LEDGER (Double-Entry Accounting)
-- Maker rebates + Taker fees + Venue margin
-- ============================================================================

CREATE TABLE "fee_schedule" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "takerFeeBps" INTEGER NOT NULL DEFAULT 100,      -- 1.00% default
    "makerRebateBps" INTEGER NOT NULL DEFAULT 25,    -- 0.25% rebate
    "venueFeeBps" INTEGER NOT NULL DEFAULT 75,       -- 0.75% venue keeps
    "minFeeCents" INTEGER NOT NULL DEFAULT 1,
    "maxFeeCents" INTEGER,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fee_schedule_pkey" PRIMARY KEY ("id")
);

-- Insert default fee schedule
INSERT INTO "fee_schedule" ("name", "description", "takerFeeBps", "makerRebateBps", "venueFeeBps", "isDefault")
VALUES ('Standard', 'Default maker/taker fee schedule', 100, 25, 75, true);

-- Fee ledger entries (double-entry)
CREATE TABLE "fee_ledger" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tradeId" UUID NOT NULL,
    "marketId" UUID NOT NULL,
    "userId" UUID,
    "entryType" TEXT NOT NULL,  -- 'TAKER_FEE', 'MAKER_REBATE', 'VENUE_FEE'
    "debitCents" INTEGER NOT NULL DEFAULT 0,
    "creditCents" INTEGER NOT NULL DEFAULT 0,
    "balanceBeforeCents" BIGINT,
    "balanceAfterCents" BIGINT,
    "feeScheduleId" UUID,
    "feeBps" INTEGER NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fee_ledger_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "fee_ledger_debit_or_credit" CHECK (
        ("debitCents" > 0 AND "creditCents" = 0) OR
        ("creditCents" > 0 AND "debitCents" = 0) OR
        ("debitCents" = 0 AND "creditCents" = 0)
    )
);

CREATE INDEX "fee_ledger_trade_idx" ON "fee_ledger"("tradeId");
CREATE INDEX "fee_ledger_user_idx" ON "fee_ledger"("userId");
CREATE INDEX "fee_ledger_market_idx" ON "fee_ledger"("marketId");

-- Venue fee accumulator
CREATE TABLE "venue_fee_totals" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "marketId" UUID NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "totalTakerFeesCents" BIGINT NOT NULL DEFAULT 0,
    "totalMakerRebatesCents" BIGINT NOT NULL DEFAULT 0,
    "totalVenueFeesCents" BIGINT NOT NULL DEFAULT 0,
    "tradeCount" INTEGER NOT NULL DEFAULT 0,
    "volumeCents" BIGINT NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "venue_fee_totals_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "venue_fee_totals_market_period_key" UNIQUE ("marketId", "periodStart")
);

-- ============================================================================
-- PHASE 4: DETERMINISTIC MICRO-BATCH QUEUE
-- 100-250ms batches with batch_sequence_number
-- ============================================================================

-- Pending orders table for micro-batching
CREATE TABLE "pending_orders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "orderId" UUID NOT NULL,
    "marketId" UUID NOT NULL,
    "serverTsMs" BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
    "clientTsMs" BIGINT,
    "batchId" UUID,
    "batchSequenceNumber" BIGINT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "orderSnapshot" JSONB NOT NULL,
    "processedAt" TIMESTAMP(3),
    "matchResult" JSONB,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pending_orders_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "pending_orders_orderId_key" UNIQUE ("orderId"),
    CONSTRAINT "pending_orders_status_check" CHECK ("status" IN ('pending', 'batched', 'processing', 'completed', 'rejected', 'cancelled'))
);

-- Batch execution log
CREATE TABLE "batch_executions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "marketId" UUID NOT NULL,
    "batchSequenceNumber" BIGINT NOT NULL,
    "batchStartTsMs" BIGINT NOT NULL,
    "batchEndTsMs" BIGINT,
    "ordersInBatch" INTEGER NOT NULL DEFAULT 0,
    "ordersProcessed" INTEGER NOT NULL DEFAULT 0,
    "tradesCreated" INTEGER NOT NULL DEFAULT 0,
    "totalVolumeMatchedCents" BIGINT NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "processingDurationMs" INTEGER,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "batch_executions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "batch_executions_market_seq_key" UNIQUE ("marketId", "batchSequenceNumber")
);

CREATE INDEX "pending_orders_market_status_idx" ON "pending_orders"("marketId", "status", "serverTsMs");
CREATE INDEX "pending_orders_batch_idx" ON "pending_orders"("batchId");
CREATE INDEX "batch_executions_market_seq_idx" ON "batch_executions"("marketId", "batchSequenceNumber" DESC);

-- ============================================================================
-- PHASE 5: REBATE ABUSE DETECTION
-- ============================================================================

CREATE TABLE "rebate_abuse_flags" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "counterpartyId" UUID,
    "marketId" UUID,
    "abuseType" TEXT NOT NULL,  -- 'CHURN', 'SELF_TRADE_ATTEMPT', 'WASH_TRADE', 'HIGH_FREQ_SAME_PRICE'
    "detectionRule" TEXT NOT NULL,
    "triggerData" JSONB NOT NULL,
    "tradeCount" INTEGER NOT NULL DEFAULT 0,
    "volumeAffectedCents" BIGINT NOT NULL DEFAULT 0,
    "rebateWithheldCents" INTEGER NOT NULL DEFAULT 0,
    "actionTaken" TEXT NOT NULL,  -- 'REBATE_DENIED', 'WARNING', 'FLAGGED'
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "resolvedById" UUID,
    "resolutionNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rebate_abuse_flags_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "rebate_abuse_user_idx" ON "rebate_abuse_flags"("userId", "createdAt" DESC);
CREATE INDEX "rebate_abuse_unresolved_idx" ON "rebate_abuse_flags"("isResolved", "createdAt" DESC);

-- ============================================================================
-- PHASE 6: ENHANCED SEED BOT CONTROLS
-- ============================================================================

ALTER TABLE "market_maker_bots"
ADD COLUMN IF NOT EXISTS "orderTtlMs" INTEGER NOT NULL DEFAULT 3000,
ADD COLUMN IF NOT EXISTS "killSwitchActive" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "killSwitchReason" TEXT,
ADD COLUMN IF NOT EXISTS "killSwitchActivatedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "rollingPnlWindowMs" INTEGER NOT NULL DEFAULT 300000,
ADD COLUMN IF NOT EXISTS "rollingPnlCents" BIGINT NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "maxRollingLossCents" BIGINT NOT NULL DEFAULT 100000,
ADD COLUMN IF NOT EXISTS "globalExposureCapCents" BIGINT NOT NULL DEFAULT 5000000,
ADD COLUMN IF NOT EXISTS "currentGlobalExposureCents" BIGINT NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "perMarketCapCents" BIGINT NOT NULL DEFAULT 500000,
ADD COLUMN IF NOT EXISTS "volatilityWidenThreshold" DOUBLE PRECISION NOT NULL DEFAULT 2.0,
ADD COLUMN IF NOT EXISTS "cooldownUntil" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "cooldownDurationMs" INTEGER NOT NULL DEFAULT 60000;

-- ============================================================================
-- PHASE 7: ENHANCED AUDIT EVENTS
-- ============================================================================

ALTER TABLE "audit_events"
ADD COLUMN IF NOT EXISTS "batchSequenceNumber" BIGINT,
ADD COLUMN IF NOT EXISTS "makerTaker" TEXT,
ADD COLUMN IF NOT EXISTS "prevHash" TEXT,
ADD COLUMN IF NOT EXISTS "serverTsMs" BIGINT,
ADD COLUMN IF NOT EXISTS "clientTsMs" BIGINT;

-- Add new audit event types if needed
DO $$
BEGIN
    -- No enum modification needed, we use TEXT for flexibility
END $$;

-- ============================================================================
-- PHASE 8: MARKET LOCK TRACKING
-- ============================================================================

ALTER TABLE "markets"
ADD COLUMN IF NOT EXISTS "isOracleLocked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "oracleLockReason" TEXT,
ADD COLUMN IF NOT EXISTS "oracleLockedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "lastOracleHeartbeat" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "oracleSource" TEXT;

-- ============================================================================
-- CORE FUNCTIONS: ORACLE LOCKING
-- ============================================================================

-- Trigger oracle lock (push-based)
CREATE OR REPLACE FUNCTION trigger_oracle_lock(
    p_market_id UUID,
    p_lock_reason oracle_lock_reason,
    p_trigger_source TEXT,
    p_event_ts_ms BIGINT DEFAULT NULL,
    p_cancel_mm_orders BOOLEAN DEFAULT true,
    p_cancel_all_resting BOOLEAN DEFAULT false
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_market RECORD;
    v_lock_state RECORD;
    v_cancelled_count INTEGER := 0;
    v_event_id UUID;
    v_now_ms BIGINT := (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT;
BEGIN
    -- Lock market row to prevent concurrent modifications
    SELECT * INTO v_market
    FROM markets
    WHERE id = p_market_id
    FOR UPDATE;

    IF v_market IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Market not found',
            'reasonCode', 'MARKET_NOT_FOUND'
        );
    END IF;

    -- Check current lock state
    SELECT * INTO v_lock_state
    FROM oracle_lock_states
    WHERE "marketId" = p_market_id
    FOR UPDATE;

    -- If already locked, just log the event
    IF v_lock_state IS NOT NULL AND v_lock_state."lockStatus" = 'LOCKED' THEN
        -- Log additional lock trigger
        INSERT INTO oracle_events (
            "marketId", "eventType", "eventSource", "eventTsMs",
            "payload", "actionTaken"
        ) VALUES (
            p_market_id,
            'LOCK_ALREADY_ACTIVE',
            p_trigger_source,
            COALESCE(p_event_ts_ms, v_now_ms),
            jsonb_build_object('newReason', p_lock_reason::TEXT, 'existingReason', v_lock_state."lockReason"::TEXT),
            'NO_ACTION'
        );

        RETURN jsonb_build_object(
            'success', true,
            'alreadyLocked', true,
            'lockReason', v_lock_state."lockReason"::TEXT
        );
    END IF;

    -- Update market status to locked
    UPDATE markets SET
        status = 'suspended',
        "isOracleLocked" = true,
        "oracleLockReason" = p_lock_reason::TEXT,
        "oracleLockedAt" = NOW(),
        "updatedAt" = NOW()
    WHERE id = p_market_id;

    -- Upsert oracle lock state
    INSERT INTO oracle_lock_states (
        "marketId", "lockStatus", "lockReason", "lockTriggerSource",
        "lockTsMs", "lockedAt", "previousStatus"
    ) VALUES (
        p_market_id, 'LOCKED', p_lock_reason, p_trigger_source,
        v_now_ms, NOW(),
        COALESCE(v_lock_state."lockStatus", 'OPEN')
    )
    ON CONFLICT ("marketId") DO UPDATE SET
        "lockStatus" = 'LOCKED',
        "lockReason" = p_lock_reason,
        "lockTriggerSource" = p_trigger_source,
        "lockTsMs" = v_now_ms,
        "lockedAt" = NOW(),
        "previousStatus" = COALESCE(oracle_lock_states."lockStatus", 'OPEN'),
        "updatedAt" = NOW();

    -- Cancel market maker orders if requested
    IF p_cancel_mm_orders THEN
        UPDATE orders SET
            status = 'cancelled',
            "cancelledAt" = NOW(),
            "reasonCode" = 'ORACLE_LOCK_MM_CANCEL',
            "updatedAt" = NOW()
        WHERE "marketId" = p_market_id
          AND status IN ('pending', 'open', 'partial')
          AND EXISTS (
              SELECT 1 FROM market_maker_bots mmb
              WHERE mmb."userId" = orders."userId"
          );

        GET DIAGNOSTICS v_cancelled_count = ROW_COUNT;
    END IF;

    -- Optionally cancel all resting orders
    IF p_cancel_all_resting THEN
        UPDATE orders SET
            status = 'cancelled',
            "cancelledAt" = NOW(),
            "reasonCode" = 'ORACLE_LOCK_ALL_CANCEL',
            "updatedAt" = NOW()
        WHERE "marketId" = p_market_id
          AND status IN ('pending', 'open', 'partial');

        GET DIAGNOSTICS v_cancelled_count = ROW_COUNT;
    END IF;

    -- Cancel any pending orders in the batch queue
    UPDATE pending_orders SET
        status = 'rejected',
        "errorMessage" = 'ORACLE_LOCK_ACTIVE'
    WHERE "marketId" = p_market_id
      AND status IN ('pending', 'batched');

    -- Log oracle event
    INSERT INTO oracle_events (
        "marketId", "eventType", "eventSource", "eventTsMs",
        "payload", "actionTaken", "ordersAffected", "processedAt", "processingDurationMs"
    ) VALUES (
        p_market_id,
        'ORACLE_LOCK_TRIGGERED',
        p_trigger_source,
        COALESCE(p_event_ts_ms, v_now_ms),
        jsonb_build_object(
            'lockReason', p_lock_reason::TEXT,
            'cancelMmOrders', p_cancel_mm_orders,
            'cancelAllResting', p_cancel_all_resting
        ),
        'MARKET_LOCKED',
        v_cancelled_count,
        NOW(),
        ((EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT - v_now_ms)::INTEGER
    ) RETURNING id INTO v_event_id;

    -- Log audit event
    INSERT INTO audit_events (
        "occurredAtMs", "eventType", "actorType",
        "marketId", "reasonCode", "metadata"
    ) VALUES (
        v_now_ms,
        'ORACLE_LOCK_TRIGGERED',
        'system',
        p_market_id,
        p_lock_reason::TEXT,
        jsonb_build_object(
            'triggerSource', p_trigger_source,
            'ordersCancelled', v_cancelled_count,
            'oracleEventId', v_event_id
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'marketId', p_market_id,
        'lockStatus', 'LOCKED',
        'lockReason', p_lock_reason::TEXT,
        'ordersCancelled', v_cancelled_count,
        'oracleEventId', v_event_id,
        'lockTsMs', v_now_ms
    );
END;
$$;

-- Release oracle lock
CREATE OR REPLACE FUNCTION release_oracle_lock(
    p_market_id UUID,
    p_admin_id UUID DEFAULT NULL,
    p_reason TEXT DEFAULT 'MANUAL_UNLOCK'
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_lock_state RECORD;
    v_now_ms BIGINT := (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT;
BEGIN
    SELECT * INTO v_lock_state
    FROM oracle_lock_states
    WHERE "marketId" = p_market_id
    FOR UPDATE;

    IF v_lock_state IS NULL OR v_lock_state."lockStatus" != 'LOCKED' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Market is not locked'
        );
    END IF;

    -- Update lock state
    UPDATE oracle_lock_states SET
        "lockStatus" = 'OPEN',
        "previousStatus" = 'LOCKED',
        "lockReason" = 'NONE',
        "updatedAt" = NOW()
    WHERE "marketId" = p_market_id;

    -- Update market
    UPDATE markets SET
        status = 'published',
        "isOracleLocked" = false,
        "oracleLockReason" = NULL,
        "updatedAt" = NOW()
    WHERE id = p_market_id;

    -- Log event
    INSERT INTO oracle_events (
        "marketId", "eventType", "eventSource", "eventTsMs",
        "payload", "actionTaken", "processedAt"
    ) VALUES (
        p_market_id,
        'ORACLE_LOCK_RELEASED',
        COALESCE(p_admin_id::TEXT, 'system'),
        v_now_ms,
        jsonb_build_object('reason', p_reason),
        'MARKET_UNLOCKED',
        NOW()
    );

    -- Log audit
    INSERT INTO audit_events (
        "occurredAtMs", "eventType", "actorType", "actorId",
        "marketId", "reasonCode", "metadata"
    ) VALUES (
        v_now_ms,
        'ORACLE_LOCK_RELEASED',
        CASE WHEN p_admin_id IS NOT NULL THEN 'admin' ELSE 'system' END,
        p_admin_id,
        p_market_id,
        'MANUAL_UNLOCK',
        jsonb_build_object('reason', p_reason)
    );

    RETURN jsonb_build_object(
        'success', true,
        'marketId', p_market_id,
        'lockStatus', 'OPEN'
    );
END;
$$;

-- Deadman switch check
CREATE OR REPLACE FUNCTION check_oracle_deadman_switch()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_lock_state RECORD;
    v_stale_count INTEGER := 0;
    v_now_ms BIGINT := (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT;
BEGIN
    -- Find markets with stale heartbeats
    FOR v_lock_state IN
        SELECT ols.*, m.status AS market_status
        FROM oracle_lock_states ols
        JOIN markets m ON m.id = ols."marketId"
        WHERE ols."lockStatus" = 'OPEN'
          AND m.status = 'published'
          AND ols."lastHeartbeatAt" IS NOT NULL
          AND ols."lastHeartbeatAt" < NOW() - (ols."deadmanTimeoutMs" || ' milliseconds')::INTERVAL
        FOR UPDATE OF ols
    LOOP
        -- Trigger deadman switch lock
        PERFORM trigger_oracle_lock(
            v_lock_state."marketId",
            'DEADMAN_SWITCH',
            'deadman_check',
            v_now_ms,
            true,  -- cancel MM orders
            false  -- don't cancel all orders
        );

        v_stale_count := v_stale_count + 1;

        -- Log specific deadman event
        INSERT INTO audit_events (
            "occurredAtMs", "eventType", "actorType",
            "marketId", "reasonCode", "metadata"
        ) VALUES (
            v_now_ms,
            'ORACLE_DEADMAN_SWITCH',
            'system',
            v_lock_state."marketId",
            'FEED_STALE',
            jsonb_build_object(
                'lastHeartbeat', v_lock_state."lastHeartbeatAt",
                'timeoutMs', v_lock_state."deadmanTimeoutMs",
                'staleMs', v_now_ms - EXTRACT(EPOCH FROM v_lock_state."lastHeartbeatAt")::BIGINT * 1000
            )
        );
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'marketsLocked', v_stale_count,
        'checkedAt', NOW()
    );
END;
$$;

-- Update oracle heartbeat
CREATE OR REPLACE FUNCTION update_oracle_heartbeat(
    p_market_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE oracle_lock_states SET
        "lastHeartbeatAt" = NOW(),
        "updatedAt" = NOW()
    WHERE "marketId" = p_market_id;

    UPDATE markets SET
        "lastOracleHeartbeat" = NOW()
    WHERE id = p_market_id;

    RETURN jsonb_build_object(
        'success', true,
        'marketId', p_market_id,
        'heartbeatAt', NOW()
    );
END;
$$;

-- ============================================================================
-- CORE FUNCTIONS: ENHANCED MATCHING ENGINE (match_orders_v6)
-- Single writer per market with deterministic execution
-- ============================================================================

CREATE OR REPLACE FUNCTION match_orders_v6(
    p_order_id UUID,
    p_batch_sequence_number BIGINT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_market RECORD;
    v_order RECORD;
    v_counter_order RECORD;
    v_trade_id UUID;
    v_fill_qty INTEGER;
    v_fill_price INTEGER;
    v_total_filled INTEGER := 0;
    v_trades_created INTEGER := 0;
    v_remaining INTEGER;
    v_opposite_side TEXT;
    v_lock_state RECORD;
    v_fee_schedule RECORD;
    v_taker_fee_cents INTEGER := 0;
    v_maker_rebate_cents INTEGER := 0;
    v_venue_fee_cents INTEGER := 0;
    v_buyer_id UUID;
    v_seller_id UUID;
    v_taker_id UUID;
    v_maker_id UUID;
    v_now_ms BIGINT := (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT;
    v_result JSONB;
BEGIN
    -- CRITICAL: Lock market row first (single writer pattern)
    SELECT * INTO v_market
    FROM markets
    WHERE id = (SELECT "marketId" FROM orders WHERE id = p_order_id)
    FOR UPDATE;

    IF v_market IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Market not found',
            'reasonCode', 'MARKET_NOT_FOUND'
        );
    END IF;

    -- Check oracle lock BEFORE processing
    SELECT * INTO v_lock_state
    FROM oracle_lock_states
    WHERE "marketId" = v_market.id;

    IF v_lock_state IS NOT NULL AND v_lock_state."lockStatus" != 'OPEN' THEN
        -- Reject order - market is locked
        UPDATE orders SET
            status = 'rejected',
            "reasonCode" = 'ORACLE_LOCK_ACTIVE',
            "updatedAt" = NOW()
        WHERE id = p_order_id;

        RETURN jsonb_build_object(
            'success', false,
            'error', 'Market is locked by oracle',
            'reasonCode', 'ORACLE_LOCK_ACTIVE',
            'lockReason', v_lock_state."lockReason"::TEXT
        );
    END IF;

    -- Check market status (must be OPEN/published)
    IF v_market.status NOT IN ('published', 'open') THEN
        UPDATE orders SET
            status = 'rejected',
            "reasonCode" = 'MARKET_NOT_OPEN',
            "updatedAt" = NOW()
        WHERE id = p_order_id;

        RETURN jsonb_build_object(
            'success', false,
            'error', 'Market is not open for trading',
            'reasonCode', 'MARKET_NOT_OPEN',
            'marketStatus', v_market.status
        );
    END IF;

    -- Get the order with row lock
    SELECT * INTO v_order FROM orders WHERE id = p_order_id FOR UPDATE;

    IF v_order IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Order not found',
            'reasonCode', 'ORDER_NOT_FOUND'
        );
    END IF;

    -- Validate order state
    IF v_order.status NOT IN ('pending', 'open', 'partial') THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Order not in matchable state',
            'reasonCode', 'INVALID_ORDER_STATE',
            'orderStatus', v_order.status
        );
    END IF;

    -- Get fee schedule
    SELECT * INTO v_fee_schedule
    FROM fee_schedule
    WHERE "isDefault" = true AND "isActive" = true
    LIMIT 1;

    -- Get liquidity tier limits
    DECLARE
        v_liquidity_state RECORD;
        v_max_order_cents INTEGER;
    BEGIN
        SELECT * INTO v_liquidity_state
        FROM market_liquidity_states
        WHERE "marketId" = v_market.id;

        -- Check Sharp Shield tier limits
        IF v_order."isTaker" THEN
            v_max_order_cents := COALESCE(v_liquidity_state."maxTakerCents", 10000);
        ELSE
            v_max_order_cents := COALESCE(v_liquidity_state."maxMakerCents", 25000);
        END IF;

        IF v_order."quantityCents" > v_max_order_cents THEN
            UPDATE orders SET
                status = 'rejected',
                "reasonCode" = 'EXCEEDS_TIER_LIMIT',
                "updatedAt" = NOW()
            WHERE id = p_order_id;

            RETURN jsonb_build_object(
                'success', false,
                'error', 'Order exceeds liquidity tier limit',
                'reasonCode', 'EXCEEDS_TIER_LIMIT',
                'maxAllowedCents', v_max_order_cents,
                'tier', COALESCE(v_liquidity_state."sharpShieldTier", 0)
            );
        END IF;
    END;

    v_opposite_side := CASE WHEN v_order.side = 'buy' THEN 'sell' ELSE 'buy' END;
    v_remaining := v_order."remainingCents";

    -- DETERMINISTIC MATCHING: Price-Time Priority
    -- Lock counter orders FOR UPDATE in price-time order
    FOR v_counter_order IN
        SELECT * FROM orders
        WHERE "marketId" = v_order."marketId"
          AND "outcomeId" = v_order."outcomeId"
          AND side = v_opposite_side
          AND status IN ('open', 'partial')
          AND "userId" != v_order."userId"  -- SELF-TRADE PREVENTION
          AND (
              (v_order.side = 'buy' AND "priceCents" <= v_order."priceCents") OR
              (v_order.side = 'sell' AND "priceCents" >= v_order."priceCents")
          )
        ORDER BY
            CASE WHEN v_order.side = 'buy' THEN "priceCents" ELSE -"priceCents" END ASC,
            "createdAt" ASC  -- Strict time priority
        FOR UPDATE  -- Lock rows deterministically
    LOOP
        EXIT WHEN v_remaining <= 0;

        -- Calculate fill
        v_fill_qty := LEAST(v_remaining, v_counter_order."remainingCents");
        v_fill_price := v_counter_order."priceCents";  -- Maker's price (resting order)

        -- Determine buyer/seller
        IF v_order.side = 'buy' THEN
            v_buyer_id := v_order."userId";
            v_seller_id := v_counter_order."userId";
            v_taker_id := v_order."userId";
            v_maker_id := v_counter_order."userId";
        ELSE
            v_buyer_id := v_counter_order."userId";
            v_seller_id := v_order."userId";
            v_taker_id := v_order."userId";
            v_maker_id := v_counter_order."userId";
        END IF;

        -- Calculate fees (if schedule exists)
        IF v_fee_schedule IS NOT NULL THEN
            -- Trade value = fill_qty * fill_price / 100
            DECLARE
                v_trade_value INTEGER := v_fill_qty * v_fill_price / 100;
            BEGIN
                v_taker_fee_cents := GREATEST(
                    v_fee_schedule."minFeeCents",
                    (v_trade_value * v_fee_schedule."takerFeeBps" / 10000)
                );
                v_maker_rebate_cents := v_trade_value * v_fee_schedule."makerRebateBps" / 10000;
                v_venue_fee_cents := v_taker_fee_cents - v_maker_rebate_cents;

                -- Cap fees if maxFeeCents is set
                IF v_fee_schedule."maxFeeCents" IS NOT NULL AND v_taker_fee_cents > v_fee_schedule."maxFeeCents" THEN
                    v_taker_fee_cents := v_fee_schedule."maxFeeCents";
                    v_venue_fee_cents := v_taker_fee_cents - v_maker_rebate_cents;
                END IF;
            END;
        END IF;

        -- Generate trade ID
        v_trade_id := gen_random_uuid();

        -- Create trade record
        INSERT INTO trades (
            id, "marketId", "outcomeId",
            "buyOrderId", "sellOrderId", "buyerId", "sellerId",
            "priceCents", "quantityCents",
            "buyerFeeCents", "sellerFeeCents",
            "reasonCode", "executedAt"
        ) VALUES (
            v_trade_id,
            v_order."marketId",
            v_order."outcomeId",
            CASE WHEN v_order.side = 'buy' THEN v_order.id ELSE v_counter_order.id END,
            CASE WHEN v_order.side = 'sell' THEN v_order.id ELSE v_counter_order.id END,
            v_buyer_id,
            v_seller_id,
            v_fill_price,
            v_fill_qty,
            CASE WHEN v_order.side = 'buy' THEN v_taker_fee_cents ELSE 0 END,
            CASE WHEN v_order.side = 'sell' THEN v_taker_fee_cents ELSE 0 END,
            'CLOB_MATCH_V6',
            NOW()
        );

        -- Record fee ledger entries (double-entry)
        IF v_taker_fee_cents > 0 THEN
            -- Taker pays fee
            INSERT INTO fee_ledger (
                "tradeId", "marketId", "userId", "entryType",
                "debitCents", "feeBps", "feeScheduleId"
            ) VALUES (
                v_trade_id, v_order."marketId", v_taker_id, 'TAKER_FEE',
                v_taker_fee_cents, v_fee_schedule."takerFeeBps", v_fee_schedule.id
            );

            -- Maker receives rebate
            INSERT INTO fee_ledger (
                "tradeId", "marketId", "userId", "entryType",
                "creditCents", "feeBps", "feeScheduleId"
            ) VALUES (
                v_trade_id, v_order."marketId", v_maker_id, 'MAKER_REBATE',
                v_maker_rebate_cents, v_fee_schedule."makerRebateBps", v_fee_schedule.id
            );

            -- Venue keeps difference
            INSERT INTO fee_ledger (
                "tradeId", "marketId", "entryType",
                "creditCents", "feeBps", "feeScheduleId"
            ) VALUES (
                v_trade_id, v_order."marketId", 'VENUE_FEE',
                v_venue_fee_cents, v_fee_schedule."venueFeeBps", v_fee_schedule.id
            );
        END IF;

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
            "reasonCode" = 'CLOB_MATCH_V6'
        WHERE id = v_counter_order.id;

        -- Update positions
        PERFORM update_position(v_buyer_id, v_order."marketId", v_order."outcomeId", v_fill_qty, v_fill_price);
        PERFORM update_position(v_seller_id, v_order."marketId", v_order."outcomeId", -v_fill_qty, v_fill_price);

        -- Update user balances with fees
        DECLARE
            v_buyer_cost INTEGER := (v_fill_qty * v_fill_price / 100);
            v_seller_credit INTEGER := v_buyer_cost;
        BEGIN
            -- Buyer pays cost + taker fee (if taker)
            UPDATE users SET
                "balanceCents" = "balanceCents" - v_buyer_cost -
                    CASE WHEN v_buyer_id = v_taker_id THEN v_taker_fee_cents ELSE 0 END +
                    CASE WHEN v_buyer_id = v_maker_id THEN v_maker_rebate_cents ELSE 0 END,
                "lockedBalanceCents" = "lockedBalanceCents" - v_buyer_cost,
                "totalTrades" = "totalTrades" + 1,
                "totalVolumeCents" = "totalVolumeCents" + v_fill_qty
            WHERE id = v_buyer_id;

            -- Seller receives credit + rebate (if maker) - fee (if taker)
            UPDATE users SET
                "balanceCents" = "balanceCents" + v_seller_credit -
                    CASE WHEN v_seller_id = v_taker_id THEN v_taker_fee_cents ELSE 0 END +
                    CASE WHEN v_seller_id = v_maker_id THEN v_maker_rebate_cents ELSE 0 END,
                "lockedBalanceCents" = "lockedBalanceCents" - (v_fill_qty * (100 - v_fill_price) / 100),
                "totalTrades" = "totalTrades" + 1,
                "totalVolumeCents" = "totalVolumeCents" + v_fill_qty
            WHERE id = v_seller_id;
        END;

        v_total_filled := v_total_filled + v_fill_qty;
        v_trades_created := v_trades_created + 1;
        v_remaining := v_remaining - v_fill_qty;
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
        "filledAt" = CASE WHEN v_remaining = 0 THEN NOW() ELSE "filledAt" END,
        "updatedAt" = NOW(),
        "reasonCode" = CASE WHEN v_total_filled > 0 THEN 'CLOB_MATCH_V6' ELSE 'NO_MATCH' END,
        "isTaker" = (v_total_filled > 0)
    WHERE id = p_order_id;

    -- Update market liquidity state
    PERFORM update_market_liquidity_v2(v_order."marketId");

    -- Update trade velocity
    IF v_trades_created > 0 THEN
        PERFORM update_trade_velocity(v_order."marketId");
    END IF;

    -- Build result
    v_result := jsonb_build_object(
        'success', true,
        'orderId', p_order_id,
        'totalFilledCents', v_total_filled,
        'tradesCreated', v_trades_created,
        'remainingCents', v_remaining,
        'status', CASE
            WHEN v_remaining = 0 THEN 'filled'
            WHEN v_total_filled > 0 THEN 'partial'
            ELSE 'open'
        END,
        'reasonCode', CASE WHEN v_total_filled > 0 THEN 'CLOB_MATCH_V6' ELSE 'NO_MATCH' END,
        'batchSequenceNumber', p_batch_sequence_number,
        'takerFeeCents', v_taker_fee_cents * v_trades_created,
        'makerRebateCents', v_maker_rebate_cents * v_trades_created
    );

    -- Log audit event
    INSERT INTO audit_events (
        "occurredAtMs", "eventType", "actorType", "actorId",
        "marketId", "orderId", "reasonCode",
        "batchSequenceNumber", "makerTaker", "metadata"
    ) VALUES (
        v_now_ms,
        CASE WHEN v_total_filled > 0 THEN 'ORDER_MATCHED' ELSE 'ORDER_PLACED' END,
        'user',
        v_order."userId",
        v_order."marketId",
        p_order_id,
        v_result->>'reasonCode',
        p_batch_sequence_number,
        CASE WHEN v_total_filled > 0 THEN 'taker' ELSE 'maker' END,
        v_result
    );

    RETURN v_result;
END;
$$;

-- ============================================================================
-- DETERMINISTIC MICRO-BATCH PROCESSING
-- ============================================================================

CREATE OR REPLACE FUNCTION process_pending_batch(
    p_market_id UUID,
    p_batch_window_ms INTEGER DEFAULT 200
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_market RECORD;
    v_batch_id UUID := gen_random_uuid();
    v_batch_seq BIGINT;
    v_batch_start_ms BIGINT := (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT;
    v_cutoff_ms BIGINT := v_batch_start_ms - p_batch_window_ms;
    v_order_count INTEGER := 0;
    v_processed INTEGER := 0;
    v_trades_created INTEGER := 0;
    v_total_volume BIGINT := 0;
    v_pending_order RECORD;
    v_match_result JSONB;
    v_lock_state RECORD;
BEGIN
    -- Lock market (single processor per market)
    SELECT * INTO v_market
    FROM markets
    WHERE id = p_market_id
    FOR UPDATE;

    IF v_market IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Market not found');
    END IF;

    -- Check oracle lock
    SELECT * INTO v_lock_state
    FROM oracle_lock_states
    WHERE "marketId" = p_market_id;

    IF v_lock_state IS NOT NULL AND v_lock_state."lockStatus" != 'OPEN' THEN
        -- Reject all pending orders
        UPDATE pending_orders SET
            status = 'rejected',
            "errorMessage" = 'ORACLE_LOCK_ACTIVE'
        WHERE "marketId" = p_market_id
          AND status = 'pending';

        RETURN jsonb_build_object(
            'success', false,
            'error', 'Market is locked',
            'lockReason', v_lock_state."lockReason"::TEXT
        );
    END IF;

    -- Get next batch sequence number
    SELECT COALESCE(MAX("batchSequenceNumber"), 0) + 1 INTO v_batch_seq
    FROM batch_executions
    WHERE "marketId" = p_market_id;

    -- Create batch execution record
    INSERT INTO batch_executions (
        id, "marketId", "batchSequenceNumber", "batchStartTsMs", status
    ) VALUES (
        v_batch_id, p_market_id, v_batch_seq, v_batch_start_ms, 'processing'
    );

    -- Assign batch to pending orders (sorted by server timestamp for determinism)
    UPDATE pending_orders SET
        "batchId" = v_batch_id,
        "batchSequenceNumber" = v_batch_seq,
        status = 'batched'
    WHERE "marketId" = p_market_id
      AND status = 'pending'
      AND "serverTsMs" <= v_cutoff_ms;

    GET DIAGNOSTICS v_order_count = ROW_COUNT;

    -- Process orders in deterministic order (by serverTsMs)
    FOR v_pending_order IN
        SELECT * FROM pending_orders
        WHERE "batchId" = v_batch_id
        ORDER BY "serverTsMs" ASC, id ASC  -- Deterministic tiebreaker
        FOR UPDATE
    LOOP
        -- Update status to processing
        UPDATE pending_orders SET status = 'processing' WHERE id = v_pending_order.id;

        -- Check oracle lock again (may have triggered during batch)
        SELECT * INTO v_lock_state FROM oracle_lock_states WHERE "marketId" = p_market_id;

        IF v_lock_state IS NOT NULL AND v_lock_state."lockStatus" != 'OPEN' THEN
            UPDATE pending_orders SET
                status = 'rejected',
                "errorMessage" = 'ORACLE_LOCK_DURING_BATCH'
            WHERE "batchId" = v_batch_id AND status IN ('batched', 'processing');

            EXIT;  -- Stop processing this batch
        END IF;

        -- Execute matching
        v_match_result := match_orders_v6(v_pending_order."orderId", v_batch_seq);

        -- Update pending order with result
        UPDATE pending_orders SET
            status = CASE WHEN (v_match_result->>'success')::BOOLEAN THEN 'completed' ELSE 'rejected' END,
            "processedAt" = NOW(),
            "matchResult" = v_match_result,
            "errorMessage" = CASE WHEN NOT (v_match_result->>'success')::BOOLEAN THEN v_match_result->>'error' ELSE NULL END
        WHERE id = v_pending_order.id;

        IF (v_match_result->>'success')::BOOLEAN THEN
            v_processed := v_processed + 1;
            v_trades_created := v_trades_created + COALESCE((v_match_result->>'tradesCreated')::INTEGER, 0);
            v_total_volume := v_total_volume + COALESCE((v_match_result->>'totalFilledCents')::BIGINT, 0);
        END IF;
    END LOOP;

    -- Update batch execution record
    UPDATE batch_executions SET
        "batchEndTsMs" = (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
        "ordersInBatch" = v_order_count,
        "ordersProcessed" = v_processed,
        "tradesCreated" = v_trades_created,
        "totalVolumeMatchedCents" = v_total_volume,
        status = 'completed',
        "processingDurationMs" = ((EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT - v_batch_start_ms)::INTEGER
    WHERE id = v_batch_id;

    RETURN jsonb_build_object(
        'success', true,
        'batchId', v_batch_id,
        'batchSequenceNumber', v_batch_seq,
        'ordersInBatch', v_order_count,
        'ordersProcessed', v_processed,
        'tradesCreated', v_trades_created,
        'totalVolumeCents', v_total_volume,
        'processingMs', ((EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT - v_batch_start_ms)
    );
END;
$$;

-- ============================================================================
-- ENHANCED LIQUIDITY CALCULATION (Sharp Shield Tiers)
-- ============================================================================

CREATE OR REPLACE FUNCTION update_market_liquidity_v2(
    p_market_id UUID
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_bid_liquidity BIGINT;
    v_ask_liquidity BIGINT;
    v_bid_depth_near_mid BIGINT;
    v_ask_depth_near_mid BIGINT;
    v_effective_depth BIGINT;
    v_total_liquidity BIGINT;
    v_best_bid INTEGER;
    v_best_ask INTEGER;
    v_mid_price INTEGER;
    v_spread INTEGER;
    v_current_tier INTEGER;
    v_new_tier INTEGER;
    v_tier_thresholds BIGINT[] := ARRAY[100000, 1000000, 10000000, 0]::BIGINT[];  -- $1k, $10k, $100k, unlimited
    v_max_taker BIGINT[] := ARRAY[10000, 50000, 200000, 500000]::BIGINT[];  -- $100, $500, $2k, $5k
    v_max_maker BIGINT[] := ARRAY[25000, 100000, 500000, 1000000]::BIGINT[];  -- $250, $1k, $5k, $10k
    v_current_state RECORD;
    v_now TIMESTAMP := NOW();
    v_hysteresis_minutes INTEGER := 5;
BEGIN
    -- Get current liquidity state
    SELECT * INTO v_current_state
    FROM market_liquidity_states
    WHERE "marketId" = p_market_id;

    -- Calculate total liquidity
    SELECT COALESCE(SUM("remainingCents"), 0) INTO v_bid_liquidity
    FROM orders
    WHERE "marketId" = p_market_id
      AND side = 'buy'
      AND status IN ('open', 'partial');

    SELECT COALESCE(SUM("remainingCents"), 0) INTO v_ask_liquidity
    FROM orders
    WHERE "marketId" = p_market_id
      AND side = 'sell'
      AND status IN ('open', 'partial');

    v_total_liquidity := v_bid_liquidity + v_ask_liquidity;

    -- Get best bid/ask
    SELECT MAX("priceCents") INTO v_best_bid
    FROM orders
    WHERE "marketId" = p_market_id AND side = 'buy' AND status IN ('open', 'partial');

    SELECT MIN("priceCents") INTO v_best_ask
    FROM orders
    WHERE "marketId" = p_market_id AND side = 'sell' AND status IN ('open', 'partial');

    -- Calculate mid price
    IF v_best_bid IS NOT NULL AND v_best_ask IS NOT NULL THEN
        v_mid_price := (v_best_bid + v_best_ask) / 2;
        v_spread := v_best_ask - v_best_bid;
    ELSE
        v_mid_price := 50;  -- Default
        v_spread := NULL;
    END IF;

    -- Calculate effective depth within +/- 2% of mid price
    -- This is the Sharp Shield metric
    DECLARE
        v_price_range INTEGER := GREATEST(1, (v_mid_price * 2 / 100));
    BEGIN
        SELECT COALESCE(SUM("remainingCents"), 0) INTO v_bid_depth_near_mid
        FROM orders
        WHERE "marketId" = p_market_id
          AND side = 'buy'
          AND status IN ('open', 'partial')
          AND "priceCents" >= (v_mid_price - v_price_range);

        SELECT COALESCE(SUM("remainingCents"), 0) INTO v_ask_depth_near_mid
        FROM orders
        WHERE "marketId" = p_market_id
          AND side = 'sell'
          AND status IN ('open', 'partial')
          AND "priceCents" <= (v_mid_price + v_price_range);
    END;

    -- Effective Depth = MIN(bid depth, ask depth) near mid
    v_effective_depth := LEAST(v_bid_depth_near_mid, v_ask_depth_near_mid);

    -- Determine tier based on effective depth
    -- Tier 0: < $1k    (max taker $100, max maker $250)
    -- Tier 1: $1k-$10k (max taker $500, max maker $1k)
    -- Tier 2: $10k-$100k (max taker $2k, max maker $5k)
    -- Tier 3: > $100k   (max taker $5k, max maker $10k)
    IF v_effective_depth < v_tier_thresholds[1] THEN
        v_new_tier := 0;
    ELSIF v_effective_depth < v_tier_thresholds[2] THEN
        v_new_tier := 1;
    ELSIF v_effective_depth < v_tier_thresholds[3] THEN
        v_new_tier := 2;
    ELSE
        v_new_tier := 3;
    END IF;

    -- Get current tier
    v_current_tier := COALESCE(v_current_state."sharpShieldTier", 0);

    -- Apply hysteresis for tier changes
    IF v_new_tier > v_current_tier THEN
        -- Upgrade: check if we've been above threshold for 5 minutes
        IF v_current_state."tierUpgradeEligibleAt" IS NULL THEN
            -- Start the upgrade timer
            v_new_tier := v_current_tier;  -- Don't upgrade yet
        ELSIF v_now < v_current_state."tierUpgradeEligibleAt" THEN
            -- Not yet eligible
            v_new_tier := v_current_tier;
        END IF;
        -- else: upgrade proceeds
    ELSIF v_new_tier < v_current_tier THEN
        -- Downgrade: check if we've been below threshold for 5 minutes
        IF v_current_state."tierDowngradeEligibleAt" IS NULL THEN
            v_new_tier := v_current_tier;
        ELSIF v_now < v_current_state."tierDowngradeEligibleAt" THEN
            v_new_tier := v_current_tier;
        END IF;
    END IF;

    -- Upsert liquidity state
    INSERT INTO market_liquidity_states (
        "marketId", "totalLiquidityCents", "bidLiquidityCents", "askLiquidityCents",
        "effectiveDepthCents", "bidDepthNearMidCents", "askDepthNearMidCents",
        "bestBidCents", "bestAskCents", "midPriceCents", "spreadCents",
        "sharpShieldTier", "maxTakerCents", "maxMakerCents",
        "tierEnteredAt",
        "tierUpgradeEligibleAt",
        "tierDowngradeEligibleAt",
        "liquidityTier", "maxBetCents", "updatedAt"
    ) VALUES (
        p_market_id, v_total_liquidity, v_bid_liquidity, v_ask_liquidity,
        v_effective_depth, v_bid_depth_near_mid, v_ask_depth_near_mid,
        v_best_bid, v_best_ask, v_mid_price, v_spread,
        v_new_tier, v_max_taker[v_new_tier + 1], v_max_maker[v_new_tier + 1],
        CASE WHEN v_new_tier != COALESCE(v_current_state."sharpShieldTier", -1) THEN v_now ELSE v_current_state."tierEnteredAt" END,
        CASE WHEN v_effective_depth >= v_tier_thresholds[v_new_tier + 2] THEN v_now + (v_hysteresis_minutes || ' minutes')::INTERVAL ELSE NULL END,
        CASE WHEN v_new_tier > 0 AND v_effective_depth < v_tier_thresholds[v_new_tier] THEN v_now + (v_hysteresis_minutes || ' minutes')::INTERVAL ELSE NULL END,
        CASE v_new_tier WHEN 0 THEN 'seed' WHEN 1 THEN 'growth' WHEN 2 THEN 'mature' ELSE 'whale' END,
        v_max_taker[v_new_tier + 1],
        v_now
    )
    ON CONFLICT ("marketId") DO UPDATE SET
        "totalLiquidityCents" = EXCLUDED."totalLiquidityCents",
        "bidLiquidityCents" = EXCLUDED."bidLiquidityCents",
        "askLiquidityCents" = EXCLUDED."askLiquidityCents",
        "effectiveDepthCents" = EXCLUDED."effectiveDepthCents",
        "bidDepthNearMidCents" = EXCLUDED."bidDepthNearMidCents",
        "askDepthNearMidCents" = EXCLUDED."askDepthNearMidCents",
        "bestBidCents" = EXCLUDED."bestBidCents",
        "bestAskCents" = EXCLUDED."bestAskCents",
        "midPriceCents" = EXCLUDED."midPriceCents",
        "spreadCents" = EXCLUDED."spreadCents",
        "sharpShieldTier" = EXCLUDED."sharpShieldTier",
        "maxTakerCents" = EXCLUDED."maxTakerCents",
        "maxMakerCents" = EXCLUDED."maxMakerCents",
        "tierEnteredAt" = CASE
            WHEN EXCLUDED."sharpShieldTier" != market_liquidity_states."sharpShieldTier"
            THEN EXCLUDED."tierEnteredAt"
            ELSE market_liquidity_states."tierEnteredAt"
        END,
        "tierUpgradeEligibleAt" = EXCLUDED."tierUpgradeEligibleAt",
        "tierDowngradeEligibleAt" = EXCLUDED."tierDowngradeEligibleAt",
        "liquidityTier" = EXCLUDED."liquidityTier",
        "maxBetCents" = EXCLUDED."maxBetCents",
        "updatedAt" = v_now;
END;
$$;

-- ============================================================================
-- REBATE ABUSE DETECTION
-- ============================================================================

CREATE OR REPLACE FUNCTION detect_rebate_abuse(
    p_user_id UUID,
    p_trade_id UUID DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_churn_count INTEGER;
    v_same_price_count INTEGER;
    v_abuse_detected BOOLEAN := false;
    v_abuse_type TEXT;
    v_trade RECORD;
    v_now_ms BIGINT := (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT;
BEGIN
    -- Get recent trade if specified
    IF p_trade_id IS NOT NULL THEN
        SELECT * INTO v_trade FROM trades WHERE id = p_trade_id;
    END IF;

    -- Check A<->B churn pattern (same two users trading back and forth)
    SELECT COUNT(*) INTO v_churn_count
    FROM (
        SELECT t1."buyerId", t1."sellerId"
        FROM trades t1
        WHERE (t1."buyerId" = p_user_id OR t1."sellerId" = p_user_id)
          AND t1."executedAt" > NOW() - INTERVAL '1 hour'
        GROUP BY t1."buyerId", t1."sellerId"
        HAVING COUNT(*) >= 5
    ) AS churn_pairs;

    IF v_churn_count > 0 THEN
        v_abuse_detected := true;
        v_abuse_type := 'CHURN';
    END IF;

    -- Check high-frequency same price trading
    SELECT COUNT(*) INTO v_same_price_count
    FROM trades
    WHERE (("buyerId" = p_user_id) OR ("sellerId" = p_user_id))
      AND "executedAt" > NOW() - INTERVAL '5 minutes'
    GROUP BY "priceCents", "marketId"
    HAVING COUNT(*) >= 10
    LIMIT 1;

    IF v_same_price_count IS NOT NULL AND v_same_price_count >= 10 THEN
        v_abuse_detected := true;
        v_abuse_type := COALESCE(v_abuse_type || ',', '') || 'HIGH_FREQ_SAME_PRICE';
    END IF;

    IF v_abuse_detected THEN
        -- Log abuse flag
        INSERT INTO rebate_abuse_flags (
            "userId", "counterpartyId", "marketId", "abuseType",
            "detectionRule", "triggerData", "actionTaken"
        ) VALUES (
            p_user_id,
            CASE WHEN v_trade IS NOT NULL THEN
                CASE WHEN v_trade."buyerId" = p_user_id THEN v_trade."sellerId" ELSE v_trade."buyerId" END
            ELSE NULL END,
            CASE WHEN v_trade IS NOT NULL THEN v_trade."marketId" ELSE NULL END,
            v_abuse_type,
            'AUTOMATED_DETECTION',
            jsonb_build_object(
                'churnCount', v_churn_count,
                'samePriceCount', v_same_price_count,
                'tradeId', p_trade_id
            ),
            'REBATE_DENIED'
        );

        -- Log audit event
        INSERT INTO audit_events (
            "occurredAtMs", "eventType", "actorType",
            "actorId", "tradeId", "reasonCode", "metadata"
        ) VALUES (
            v_now_ms,
            'REBATE_ABUSE_SUSPECTED',
            'system',
            p_user_id,
            p_trade_id,
            v_abuse_type,
            jsonb_build_object('churnCount', v_churn_count, 'samePriceCount', v_same_price_count)
        );
    END IF;

    RETURN jsonb_build_object(
        'userId', p_user_id,
        'abuseDetected', v_abuse_detected,
        'abuseType', v_abuse_type,
        'churnCount', v_churn_count,
        'samePriceCount', v_same_price_count
    );
END;
$$;

-- ============================================================================
-- MARKET STATE REPLAY (NT Audit Requirement)
-- ============================================================================

CREATE OR REPLACE FUNCTION replay_market_state(
    p_market_id UUID,
    p_up_to_ts TIMESTAMP DEFAULT NOW()
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_trade RECORD;
    v_order RECORD;
    v_position RECORD;
    v_user_balances JSONB := '{}'::JSONB;
    v_positions JSONB := '{}'::JSONB;
    v_order_book_bids JSONB := '[]'::JSONB;
    v_order_book_asks JSONB := '[]'::JSONB;
    v_total_volume BIGINT := 0;
    v_trade_count INTEGER := 0;
    v_invariant_valid BOOLEAN := true;
    v_invariant_errors JSONB := '[]'::JSONB;
BEGIN
    -- Replay all trades up to timestamp
    FOR v_trade IN
        SELECT * FROM trades
        WHERE "marketId" = p_market_id
          AND "executedAt" <= p_up_to_ts
        ORDER BY "executedAt" ASC, id ASC
    LOOP
        v_trade_count := v_trade_count + 1;
        v_total_volume := v_total_volume + (v_trade."quantityCents" * v_trade."priceCents" / 100);

        -- Update buyer position
        DECLARE
            v_buyer_key TEXT := v_trade."buyerId"::TEXT || ':' || v_trade."outcomeId"::TEXT;
            v_buyer_qty INTEGER;
        BEGIN
            v_buyer_qty := COALESCE((v_positions->>v_buyer_key)::INTEGER, 0) + v_trade."quantityCents";
            v_positions := v_positions || jsonb_build_object(v_buyer_key, v_buyer_qty);
        END;

        -- Update seller position
        DECLARE
            v_seller_key TEXT := v_trade."sellerId"::TEXT || ':' || v_trade."outcomeId"::TEXT;
            v_seller_qty INTEGER;
        BEGIN
            v_seller_qty := COALESCE((v_positions->>v_seller_key)::INTEGER, 0) - v_trade."quantityCents";
            v_positions := v_positions || jsonb_build_object(v_seller_key, v_seller_qty);
        END;

        -- Update balances
        DECLARE
            v_trade_value INTEGER := v_trade."quantityCents" * v_trade."priceCents" / 100;
            v_buyer_bal BIGINT;
            v_seller_bal BIGINT;
        BEGIN
            v_buyer_bal := COALESCE((v_user_balances->>v_trade."buyerId"::TEXT)::BIGINT, 0) - v_trade_value;
            v_seller_bal := COALESCE((v_user_balances->>v_trade."sellerId"::TEXT)::BIGINT, 0) + v_trade_value;

            v_user_balances := v_user_balances
                || jsonb_build_object(v_trade."buyerId"::TEXT, v_buyer_bal)
                || jsonb_build_object(v_trade."sellerId"::TEXT, v_seller_bal);
        END;
    END LOOP;

    -- Get current order book state at timestamp
    SELECT jsonb_agg(
        jsonb_build_object(
            'priceCents', "priceCents",
            'quantityCents', SUM("remainingCents"),
            'orderCount', COUNT(*)
        ) ORDER BY "priceCents" DESC
    ) INTO v_order_book_bids
    FROM orders
    WHERE "marketId" = p_market_id
      AND side = 'buy'
      AND status IN ('open', 'partial')
      AND "createdAt" <= p_up_to_ts
      AND ("cancelledAt" IS NULL OR "cancelledAt" > p_up_to_ts)
      AND ("filledAt" IS NULL OR "filledAt" > p_up_to_ts)
    GROUP BY "priceCents";

    SELECT jsonb_agg(
        jsonb_build_object(
            'priceCents', "priceCents",
            'quantityCents', SUM("remainingCents"),
            'orderCount', COUNT(*)
        ) ORDER BY "priceCents" ASC
    ) INTO v_order_book_asks
    FROM orders
    WHERE "marketId" = p_market_id
      AND side = 'sell'
      AND status IN ('open', 'partial')
      AND "createdAt" <= p_up_to_ts
      AND ("cancelledAt" IS NULL OR "cancelledAt" > p_up_to_ts)
      AND ("filledAt" IS NULL OR "filledAt" > p_up_to_ts)
    GROUP BY "priceCents";

    -- Verify invariants
    -- 1. Sum of all positions should be 0 (every buy has a sell)
    DECLARE
        v_position_sum BIGINT := 0;
        v_key TEXT;
        v_val INTEGER;
    BEGIN
        FOR v_key, v_val IN SELECT * FROM jsonb_each_text(v_positions)
        LOOP
            v_position_sum := v_position_sum + v_val::INTEGER;
        END LOOP;

        IF v_position_sum != 0 THEN
            v_invariant_valid := false;
            v_invariant_errors := v_invariant_errors || jsonb_build_object(
                'type', 'POSITION_SUM_NONZERO',
                'expected', 0,
                'actual', v_position_sum
            );
        END IF;
    END;

    -- 2. Sum of all balance changes should be 0 (zero-sum)
    DECLARE
        v_balance_sum BIGINT := 0;
        v_key TEXT;
        v_val BIGINT;
    BEGIN
        FOR v_key, v_val IN SELECT * FROM jsonb_each_text(v_user_balances)
        LOOP
            v_balance_sum := v_balance_sum + v_val::BIGINT;
        END LOOP;

        IF v_balance_sum != 0 THEN
            v_invariant_valid := false;
            v_invariant_errors := v_invariant_errors || jsonb_build_object(
                'type', 'BALANCE_SUM_NONZERO',
                'expected', 0,
                'actual', v_balance_sum
            );
        END IF;
    END;

    RETURN jsonb_build_object(
        'success', true,
        'marketId', p_market_id,
        'replayedUpTo', p_up_to_ts,
        'tradeCount', v_trade_count,
        'totalVolumeCents', v_total_volume,
        'positions', v_positions,
        'userBalanceDeltas', v_user_balances,
        'orderBook', jsonb_build_object(
            'bids', COALESCE(v_order_book_bids, '[]'::JSONB),
            'asks', COALESCE(v_order_book_asks, '[]'::JSONB)
        ),
        'invariantsValid', v_invariant_valid,
        'invariantErrors', v_invariant_errors
    );
END;
$$;

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT EXECUTE ON FUNCTION trigger_oracle_lock(UUID, oracle_lock_reason, TEXT, BIGINT, BOOLEAN, BOOLEAN) TO service_role;
GRANT EXECUTE ON FUNCTION release_oracle_lock(UUID, UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION check_oracle_deadman_switch() TO service_role;
GRANT EXECUTE ON FUNCTION update_oracle_heartbeat(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION match_orders_v6(UUID, BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION process_pending_batch(UUID, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION update_market_liquidity_v2(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION detect_rebate_abuse(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION replay_market_state(UUID, TIMESTAMP) TO service_role;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

CREATE TRIGGER oracle_lock_states_updated_at
    BEFORE UPDATE ON oracle_lock_states
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER fee_schedule_updated_at
    BEFORE UPDATE ON fee_schedule
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER venue_fee_totals_updated_at
    BEFORE UPDATE ON venue_fee_totals
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- FOREIGN KEYS
-- ============================================================================

ALTER TABLE "oracle_lock_states" ADD CONSTRAINT "oracle_lock_states_marketId_fkey"
    FOREIGN KEY ("marketId") REFERENCES "markets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "oracle_events" ADD CONSTRAINT "oracle_events_marketId_fkey"
    FOREIGN KEY ("marketId") REFERENCES "markets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "fee_ledger" ADD CONSTRAINT "fee_ledger_tradeId_fkey"
    FOREIGN KEY ("tradeId") REFERENCES "trades"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "fee_ledger" ADD CONSTRAINT "fee_ledger_marketId_fkey"
    FOREIGN KEY ("marketId") REFERENCES "markets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "fee_ledger" ADD CONSTRAINT "fee_ledger_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "fee_ledger" ADD CONSTRAINT "fee_ledger_feeScheduleId_fkey"
    FOREIGN KEY ("feeScheduleId") REFERENCES "fee_schedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "pending_orders" ADD CONSTRAINT "pending_orders_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "pending_orders" ADD CONSTRAINT "pending_orders_marketId_fkey"
    FOREIGN KEY ("marketId") REFERENCES "markets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "batch_executions" ADD CONSTRAINT "batch_executions_marketId_fkey"
    FOREIGN KEY ("marketId") REFERENCES "markets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "rebate_abuse_flags" ADD CONSTRAINT "rebate_abuse_flags_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "venue_fee_totals" ADD CONSTRAINT "venue_fee_totals_marketId_fkey"
    FOREIGN KEY ("marketId") REFERENCES "markets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================================
-- COMMENTS (Documentation)
-- ============================================================================

COMMENT ON TABLE oracle_lock_states IS 'Push-based oracle locking state per market. Critical for IGA compliance (in-play sports) and regulatory safety.';
COMMENT ON TABLE oracle_events IS 'Append-only log of all oracle events for audit replay.';
COMMENT ON TABLE fee_schedule IS 'Maker/taker fee schedules. Taker pays fee, maker receives rebate, venue keeps difference.';
COMMENT ON TABLE fee_ledger IS 'Double-entry ledger for fee accounting. Every fee has debit and credit entries.';
COMMENT ON TABLE pending_orders IS 'Deterministic micro-batch queue. Orders sorted by server_ts for fair processing.';
COMMENT ON TABLE batch_executions IS 'Batch execution log with sequence numbers for replay.';
COMMENT ON TABLE rebate_abuse_flags IS 'Detected rebate abuse patterns (churn, wash trading).';

COMMENT ON FUNCTION trigger_oracle_lock IS 'Push-based oracle lock trigger. Must execute BEFORE next taker batch.';
COMMENT ON FUNCTION match_orders_v6 IS 'Hardened CLOB matching with market FOR UPDATE lock, fee calculation, and oracle lock check.';
COMMENT ON FUNCTION process_pending_batch IS 'Deterministic micro-batch processor with batch_sequence_number for replay.';
COMMENT ON FUNCTION replay_market_state IS 'NT audit replay function. Reconstructs positions, balances, and order book at any timestamp.';
