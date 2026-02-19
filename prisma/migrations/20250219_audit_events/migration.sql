-- Audit Events Migration
-- Creates the comprehensive append-only audit event table for regulatory compliance

-- System Sequences Table (for monotonic sequence generation)
CREATE TABLE IF NOT EXISTS "system_sequences" (
    "id" TEXT NOT NULL DEFAULT 'audit_seq',
    "lastSeq" BIGINT NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_sequences_pkey" PRIMARY KEY ("id")
);

-- Audit Events Table (append-only, comprehensive event log)
CREATE TABLE IF NOT EXISTS "audit_events" (
    "id" TEXT NOT NULL,

    -- Timing - UTC millisecond precision with monotonic sequence
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "occurredAtMs" BIGINT NOT NULL,
    "seq" BIGSERIAL NOT NULL,

    -- Event classification
    "eventType" TEXT NOT NULL,

    -- Actor identification
    "actorType" TEXT NOT NULL,
    "actorId" TEXT,
    "actorKycRef" TEXT,
    "sessionId" TEXT,

    -- Request context
    "requestId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "deviceFingerprint" TEXT,
    "geo" TEXT,

    -- Entity references
    "marketId" TEXT,
    "betId" TEXT,
    "tradeId" TEXT,
    "orderId" TEXT,

    -- Versioning
    "rulesVersion" INTEGER,
    "pricingVersion" INTEGER,

    -- Admin/compliance fields
    "reasonCode" TEXT,

    -- State snapshots (JSON - lightweight critical fields only)
    "beforeState" TEXT,
    "afterState" TEXT,

    -- Freeform metadata
    "metadata" TEXT,

    -- Tamper evidence - hash chaining
    "integrityHash" TEXT,
    "previousHash" TEXT,

    -- Retention
    "retentionPolicy" TEXT NOT NULL DEFAULT '7_years',

    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS "audit_events_eventType_idx" ON "audit_events"("eventType");
CREATE INDEX IF NOT EXISTS "audit_events_actorType_actorId_idx" ON "audit_events"("actorType", "actorId");
CREATE INDEX IF NOT EXISTS "audit_events_marketId_idx" ON "audit_events"("marketId");
CREATE INDEX IF NOT EXISTS "audit_events_betId_idx" ON "audit_events"("betId");
CREATE INDEX IF NOT EXISTS "audit_events_orderId_idx" ON "audit_events"("orderId");
CREATE INDEX IF NOT EXISTS "audit_events_occurredAt_idx" ON "audit_events"("occurredAt");
CREATE INDEX IF NOT EXISTS "audit_events_seq_idx" ON "audit_events"("seq");
CREATE INDEX IF NOT EXISTS "audit_events_requestId_idx" ON "audit_events"("requestId");

-- Composite index for time-range queries by market
CREATE INDEX IF NOT EXISTS "audit_events_marketId_occurredAt_idx" ON "audit_events"("marketId", "occurredAt");

-- Composite index for actor activity queries
CREATE INDEX IF NOT EXISTS "audit_events_actorId_occurredAt_idx" ON "audit_events"("actorId", "occurredAt");

-- Comments for documentation
COMMENT ON TABLE "audit_events" IS 'Comprehensive append-only audit log for regulatory compliance. Target retention: 7 years.';
COMMENT ON COLUMN "audit_events"."occurredAtMs" IS 'Millisecond timestamp for precise ordering';
COMMENT ON COLUMN "audit_events"."seq" IS 'Monotonically increasing sequence for strict ordering';
COMMENT ON COLUMN "audit_events"."integrityHash" IS 'SHA-256 hash of canonical payload + previous hash for tamper detection';
COMMENT ON COLUMN "audit_events"."previousHash" IS 'Hash of previous event for chain verification';
COMMENT ON COLUMN "audit_events"."reasonCode" IS 'Required for admin actions per regulatory requirements';

-- Insert initial sequence if not exists
INSERT INTO "system_sequences" ("id", "lastSeq", "updatedAt")
VALUES ('audit_seq', 0, NOW())
ON CONFLICT ("id") DO NOTHING;
