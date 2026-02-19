// ============================================================================
// AUDIT EVENT SERVICE - Comprehensive append-only audit logging
// ============================================================================

import { createHash } from 'crypto';
import prisma from '@/lib/prisma';
import type {
  AuditEventType,
  ActorType,
  ReasonCode,
  AuditEventInput,
  AuditEventOutput,
  MarketStateSnapshot,
  AuditExportFilters,
  ExportFormat,
  EVENT_TYPE_CONFIG,
} from '@/types/auditEvents';

// ============================================================================
// CONFIGURATION
// ============================================================================

const AUDIT_CONFIG = {
  defaultRetentionPolicy: '7_years',
  hashAlgorithm: 'sha256',
  maxExportLimit: 10000,
  defaultExportLimit: 1000,
};

// ============================================================================
// HASH CHAIN UTILITIES
// ============================================================================

interface CanonicalEvent {
  eventType: string;
  occurredAtMs: string;
  actorType: string;
  actorId?: string;
  marketId?: string;
  betId?: string;
  orderId?: string;
  reasonCode?: string;
  beforeState?: Record<string, unknown>;
  afterState?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

function createCanonicalPayload(event: CanonicalEvent): string {
  // Create deterministic JSON representation
  const sortedKeys = Object.keys(event).sort();
  const sorted: Record<string, unknown> = {};
  for (const key of sortedKeys) {
    const value = event[key as keyof CanonicalEvent];
    if (value !== undefined && value !== null) {
      sorted[key] = value;
    }
  }
  return JSON.stringify(sorted);
}

function computeIntegrityHash(canonicalPayload: string, previousHash: string | null): string {
  const input = previousHash ? `${canonicalPayload}|${previousHash}` : canonicalPayload;
  return createHash(AUDIT_CONFIG.hashAlgorithm).update(input).digest('hex');
}

// ============================================================================
// SEQUENCE MANAGEMENT
// ============================================================================

async function getNextSequence(): Promise<bigint> {
  // Use atomic increment for sequence
  const result = await prisma.systemSequence.upsert({
    where: { id: 'audit_seq' },
    update: { lastSeq: { increment: 1 } },
    create: { id: 'audit_seq', lastSeq: 1 },
  });
  return result.lastSeq;
}

async function getLastEventHash(): Promise<string | null> {
  const lastEvent = await prisma.auditEvent.findFirst({
    orderBy: { seq: 'desc' },
    select: { integrityHash: true },
  });
  return lastEvent?.integrityHash || null;
}

// ============================================================================
// VALIDATION
// ============================================================================

interface ValidationResult {
  valid: boolean;
  errors: string[];
}

function validateAuditEvent(input: AuditEventInput): ValidationResult {
  const errors: string[] = [];
  const config = (EVENT_TYPE_CONFIG as Record<string, typeof EVENT_TYPE_CONFIG[AuditEventType]>)[input.eventType];

  if (!config) {
    errors.push(`Unknown event type: ${input.eventType}`);
    return { valid: false, errors };
  }

  // Validate required fields based on event type config
  if (config.requiresReasonCode && !input.reasonCode) {
    errors.push(`Event type ${input.eventType} requires a reason code`);
  }

  if (config.requiresMarketId && !input.marketId) {
    errors.push(`Event type ${input.eventType} requires a market ID`);
  }

  if (config.requiresBetId && !input.betId && !input.orderId) {
    errors.push(`Event type ${input.eventType} requires a bet ID or order ID`);
  }

  // Admin events from admin actors should have reason codes for certain actions
  const adminReasonRequired = [
    'ADMIN_MARKET_SUSPENDED',
    'ADMIN_MARKET_REOPENED',
    'ADMIN_MARKET_VOIDED',
    'ADMIN_USER_DEACTIVATED',
    'ADMIN_USER_REACTIVATED',
    'ADMIN_PERMISSION_CHANGED',
    'ADMIN_ACCOUNT_ACTION',
    'ADMIN_BALANCE_ADJUSTMENT',
  ];

  if (adminReasonRequired.includes(input.eventType) && !input.reasonCode) {
    errors.push(`Admin event ${input.eventType} requires a reason code`);
  }

  return { valid: errors.length === 0, errors };
}

// ============================================================================
// WRITE AUDIT EVENT - Main helper function
// ============================================================================

export interface WriteAuditEventOptions {
  skipHashChain?: boolean; // For high-volume events where hash chain can be computed async
}

export async function writeAuditEvent(
  input: AuditEventInput,
  options: WriteAuditEventOptions = {}
): Promise<AuditEventOutput> {
  // Validate input
  const validation = validateAuditEvent(input);
  if (!validation.valid) {
    throw new Error(`Audit event validation failed: ${validation.errors.join(', ')}`);
  }

  // Get current timestamp in milliseconds
  const now = new Date();
  const occurredAtMs = BigInt(now.getTime());

  // Get next sequence number atomically
  const seq = await getNextSequence();

  // Prepare canonical event for hashing
  const canonicalEvent: CanonicalEvent = {
    eventType: input.eventType,
    occurredAtMs: occurredAtMs.toString(),
    actorType: input.actorType,
    actorId: input.actorId,
    marketId: input.marketId,
    betId: input.betId,
    orderId: input.orderId,
    reasonCode: input.reasonCode,
    beforeState: input.beforeState,
    afterState: input.afterState,
    metadata: input.metadata,
  };

  // Compute hash chain
  let integrityHash: string | undefined;
  let previousHash: string | null = null;

  if (!options.skipHashChain) {
    previousHash = await getLastEventHash();
    const canonicalPayload = createCanonicalPayload(canonicalEvent);
    integrityHash = computeIntegrityHash(canonicalPayload, previousHash);
  }

  // Create the audit event
  const event = await prisma.auditEvent.create({
    data: {
      occurredAt: now,
      occurredAtMs,
      seq,
      eventType: input.eventType,
      actorType: input.actorType,
      actorId: input.actorId,
      actorKycRef: input.actorKycRef,
      sessionId: input.sessionId,
      requestId: input.requestId,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      deviceFingerprint: input.deviceFingerprint,
      geo: input.geo ? JSON.stringify(input.geo) : null,
      marketId: input.marketId,
      betId: input.betId,
      tradeId: input.tradeId,
      orderId: input.orderId,
      rulesVersion: input.rulesVersion,
      pricingVersion: input.pricingVersion,
      reasonCode: input.reasonCode,
      beforeState: input.beforeState ? JSON.stringify(input.beforeState) : null,
      afterState: input.afterState ? JSON.stringify(input.afterState) : null,
      metadata: input.metadata ? JSON.stringify(input.metadata) : null,
      integrityHash,
      previousHash,
      retentionPolicy: AUDIT_CONFIG.defaultRetentionPolicy,
    },
  });

  return formatAuditEvent(event);
}

// ============================================================================
// QUERY FUNCTIONS
// ============================================================================

export async function getAuditEvents(
  filters: AuditExportFilters,
  page: number = 1,
  pageSize: number = 50
): Promise<{ data: AuditEventOutput[]; pagination: { page: number; pageSize: number; total: number; totalPages: number } }> {
  const where = buildWhereClause(filters);

  const [events, total] = await Promise.all([
    prisma.auditEvent.findMany({
      where,
      orderBy: { seq: 'desc' },
      skip: (page - 1) * pageSize,
      take: Math.min(pageSize, AUDIT_CONFIG.maxExportLimit),
    }),
    prisma.auditEvent.count({ where }),
  ]);

  return {
    data: events.map(formatAuditEvent),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

export async function getMarketAuditEvents(
  marketId: string,
  filters: AuditExportFilters = {}
): Promise<AuditEventOutput[]> {
  const where = buildWhereClause({ ...filters, marketId });

  const events = await prisma.auditEvent.findMany({
    where,
    orderBy: { seq: 'asc' },
    take: filters.limit || AUDIT_CONFIG.defaultExportLimit,
    skip: filters.offset || 0,
  });

  return events.map(formatAuditEvent);
}

export async function getBetAuditEvents(betId: string): Promise<AuditEventOutput[]> {
  const events = await prisma.auditEvent.findMany({
    where: { betId },
    orderBy: { seq: 'asc' },
  });

  return events.map(formatAuditEvent);
}

export async function getOrderAuditEvents(orderId: string): Promise<AuditEventOutput[]> {
  const events = await prisma.auditEvent.findMany({
    where: { orderId },
    orderBy: { seq: 'asc' },
  });

  return events.map(formatAuditEvent);
}

// ============================================================================
// EXPORT FUNCTIONS
// ============================================================================

export async function exportAuditEvents(
  filters: AuditExportFilters,
  format: ExportFormat = 'json'
): Promise<string> {
  const where = buildWhereClause(filters);
  const limit = Math.min(filters.limit || AUDIT_CONFIG.defaultExportLimit, AUDIT_CONFIG.maxExportLimit);

  const events = await prisma.auditEvent.findMany({
    where,
    orderBy: { seq: 'asc' },
    take: limit,
    skip: filters.offset || 0,
  });

  const formattedEvents = events.map(formatAuditEvent);

  if (format === 'csv') {
    return convertToCSV(formattedEvents);
  }

  return JSON.stringify(formattedEvents, null, 2);
}

export async function exportMarketLifecycle(
  marketId: string,
  format: ExportFormat = 'json'
): Promise<string> {
  const events = await prisma.auditEvent.findMany({
    where: { marketId },
    orderBy: { seq: 'asc' },
  });

  const formattedEvents = events.map(formatAuditEvent);

  if (format === 'csv') {
    return convertToCSV(formattedEvents);
  }

  return JSON.stringify({
    marketId,
    exportedAt: new Date().toISOString(),
    totalEvents: formattedEvents.length,
    events: formattedEvents,
  }, null, 2);
}

export async function exportBetLifecycle(
  betId: string,
  format: ExportFormat = 'json'
): Promise<string> {
  const events = await prisma.auditEvent.findMany({
    where: { betId },
    orderBy: { seq: 'asc' },
  });

  const formattedEvents = events.map(formatAuditEvent);

  if (format === 'csv') {
    return convertToCSV(formattedEvents);
  }

  return JSON.stringify({
    betId,
    exportedAt: new Date().toISOString(),
    totalEvents: formattedEvents.length,
    events: formattedEvents,
  }, null, 2);
}

// ============================================================================
// MARKET STATE RECONSTRUCTION
// ============================================================================

export async function reconstructMarketSnapshot(
  marketId: string,
  targetTimestamp: Date
): Promise<MarketStateSnapshot | null> {
  // Get all events for this market up to the target timestamp
  const events = await prisma.auditEvent.findMany({
    where: {
      marketId,
      occurredAt: { lte: targetTimestamp },
    },
    orderBy: { seq: 'asc' },
  });

  if (events.length === 0) {
    return null;
  }

  // Initialize state from first MARKET_CREATED event
  let snapshot: MarketStateSnapshot = {
    marketId,
    snapshotAt: targetTimestamp.toISOString(),
    status: 'draft',
    currentYesPrice: 50,
    currentNoPrice: 50,
    volume: 0,
    liquidity: 0,
    tradeCount: 0,
    outcomes: [],
  };

  // Replay events to reconstruct state
  for (const event of events) {
    const afterState = event.afterState ? JSON.parse(event.afterState) : null;
    const beforeState = event.beforeState ? JSON.parse(event.beforeState) : null;

    switch (event.eventType) {
      case 'MARKET_CREATED':
      case 'ADMIN_MARKET_CREATED':
        if (afterState) {
          snapshot = {
            ...snapshot,
            status: afterState.status || 'draft',
            currentYesPrice: afterState.currentYesPrice ?? 50,
            currentNoPrice: afterState.currentNoPrice ?? 50,
            volume: afterState.volume ?? 0,
            liquidity: afterState.liquidity ?? 0,
            tradeCount: afterState.tradeCount ?? 0,
            outcomes: afterState.outcomes || [],
          };
        }
        break;

      case 'MARKET_UPDATED':
      case 'ADMIN_MARKET_UPDATED':
      case 'MARKET_SUBMITTED_FOR_REVIEW':
      case 'MARKET_APPROVED':
      case 'MARKET_REJECTED':
      case 'MARKET_PUBLISHED':
      case 'MARKET_SUSPENDED':
      case 'MARKET_REOPENED':
      case 'MARKET_CLOSED':
      case 'MARKET_ARCHIVED':
        if (afterState) {
          snapshot = {
            ...snapshot,
            status: afterState.status || snapshot.status,
            currentYesPrice: afterState.currentYesPrice ?? snapshot.currentYesPrice,
            currentNoPrice: afterState.currentNoPrice ?? snapshot.currentNoPrice,
            volume: afterState.volume ?? snapshot.volume,
            liquidity: afterState.liquidity ?? snapshot.liquidity,
            tradeCount: afterState.tradeCount ?? snapshot.tradeCount,
            outcomes: afterState.outcomes || snapshot.outcomes,
          };
        }
        break;

      case 'MARKET_RESOLVED':
      case 'ADMIN_MARKET_RESOLVED':
        if (afterState) {
          snapshot = {
            ...snapshot,
            status: 'resolved',
            resolvedOutcomeId: afterState.resolvedOutcomeId,
            resolvedAt: afterState.resolvedAt,
            outcomes: afterState.outcomes || snapshot.outcomes,
          };
        }
        break;

      case 'MARKET_SETTLED':
      case 'ADMIN_MARKET_SETTLED':
        if (afterState) {
          snapshot = {
            ...snapshot,
            status: 'settled',
            settledAt: afterState.settledAt,
          };
        }
        break;

      case 'MARKET_VOIDED':
      case 'ADMIN_MARKET_VOIDED':
        snapshot = {
          ...snapshot,
          status: 'archived',
        };
        break;

      case 'AMM_STATE_CHANGED':
      case 'AMM_PRICE_UPDATED':
      case 'TRADE_EXECUTED':
        if (afterState) {
          snapshot = {
            ...snapshot,
            currentYesPrice: afterState.currentYesPrice ?? afterState.price ?? snapshot.currentYesPrice,
            currentNoPrice: afterState.currentNoPrice ?? (100 - (afterState.price ?? snapshot.currentYesPrice)),
            volume: afterState.volume ?? snapshot.volume,
            liquidity: afterState.liquidity ?? snapshot.liquidity,
            tradeCount: afterState.tradeCount ?? snapshot.tradeCount,
          };
        }
        break;

      case 'LP_ADDED_LIQUIDITY':
      case 'LP_REMOVED_LIQUIDITY':
        if (afterState) {
          snapshot = {
            ...snapshot,
            liquidity: afterState.liquidity ?? snapshot.liquidity,
          };
        }
        break;
    }
  }

  return snapshot;
}

// ============================================================================
// HASH CHAIN VERIFICATION
// ============================================================================

export async function verifyHashChain(
  startSeq?: bigint,
  endSeq?: bigint
): Promise<{ valid: boolean; brokenAt?: string; totalVerified: number }> {
  const where: Record<string, unknown> = {};
  if (startSeq !== undefined) {
    where.seq = { gte: startSeq };
  }
  if (endSeq !== undefined) {
    where.seq = where.seq ? { ...where.seq as object, lte: endSeq } : { lte: endSeq };
  }

  const events = await prisma.auditEvent.findMany({
    where,
    orderBy: { seq: 'asc' },
    select: {
      id: true,
      seq: true,
      eventType: true,
      occurredAtMs: true,
      actorType: true,
      actorId: true,
      marketId: true,
      betId: true,
      orderId: true,
      reasonCode: true,
      beforeState: true,
      afterState: true,
      metadata: true,
      integrityHash: true,
      previousHash: true,
    },
  });

  let lastHash: string | null = null;
  let totalVerified = 0;

  for (const event of events) {
    if (!event.integrityHash) {
      // Skip events without hash (e.g., created with skipHashChain)
      continue;
    }

    // Verify previous hash matches
    if (lastHash !== null && event.previousHash !== lastHash) {
      return {
        valid: false,
        brokenAt: event.id,
        totalVerified,
      };
    }

    // Verify integrity hash
    const canonicalEvent: CanonicalEvent = {
      eventType: event.eventType,
      occurredAtMs: event.occurredAtMs.toString(),
      actorType: event.actorType,
      actorId: event.actorId || undefined,
      marketId: event.marketId || undefined,
      betId: event.betId || undefined,
      orderId: event.orderId || undefined,
      reasonCode: event.reasonCode || undefined,
      beforeState: event.beforeState ? JSON.parse(event.beforeState) : undefined,
      afterState: event.afterState ? JSON.parse(event.afterState) : undefined,
      metadata: event.metadata ? JSON.parse(event.metadata) : undefined,
    };

    const canonicalPayload = createCanonicalPayload(canonicalEvent);
    const expectedHash = computeIntegrityHash(canonicalPayload, event.previousHash);

    if (expectedHash !== event.integrityHash) {
      return {
        valid: false,
        brokenAt: event.id,
        totalVerified,
      };
    }

    lastHash = event.integrityHash;
    totalVerified++;
  }

  return { valid: true, totalVerified };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function buildWhereClause(filters: AuditExportFilters): Record<string, unknown> {
  const where: Record<string, unknown> = {};

  if (filters.marketId) {
    where.marketId = filters.marketId;
  }

  if (filters.betId) {
    where.betId = filters.betId;
  }

  if (filters.orderId) {
    where.orderId = filters.orderId;
  }

  if (filters.actorId) {
    where.actorId = filters.actorId;
  }

  if (filters.eventTypes && filters.eventTypes.length > 0) {
    where.eventType = { in: filters.eventTypes };
  }

  if (filters.startTime || filters.endTime) {
    where.occurredAt = {};
    if (filters.startTime) {
      (where.occurredAt as Record<string, Date>).gte = new Date(filters.startTime);
    }
    if (filters.endTime) {
      (where.occurredAt as Record<string, Date>).lte = new Date(filters.endTime);
    }
  }

  return where;
}

function formatAuditEvent(event: Record<string, unknown>): AuditEventOutput {
  return {
    id: event.id as string,
    occurredAt: (event.occurredAt as Date).toISOString(),
    occurredAtMs: (event.occurredAtMs as bigint).toString(),
    seq: (event.seq as bigint).toString(),
    eventType: event.eventType as AuditEventType,
    actorType: event.actorType as ActorType,
    actorId: event.actorId as string | undefined,
    actorKycRef: event.actorKycRef as string | undefined,
    sessionId: event.sessionId as string | undefined,
    requestId: event.requestId as string | undefined,
    ipAddress: event.ipAddress as string | undefined,
    userAgent: event.userAgent as string | undefined,
    deviceFingerprint: event.deviceFingerprint as string | undefined,
    geo: event.geo ? JSON.parse(event.geo as string) : undefined,
    marketId: event.marketId as string | undefined,
    betId: event.betId as string | undefined,
    tradeId: event.tradeId as string | undefined,
    orderId: event.orderId as string | undefined,
    rulesVersion: event.rulesVersion as number | undefined,
    pricingVersion: event.pricingVersion as number | undefined,
    reasonCode: event.reasonCode as ReasonCode | undefined,
    beforeState: event.beforeState ? JSON.parse(event.beforeState as string) : undefined,
    afterState: event.afterState ? JSON.parse(event.afterState as string) : undefined,
    metadata: event.metadata ? JSON.parse(event.metadata as string) : undefined,
    integrityHash: event.integrityHash as string | undefined,
    previousHash: event.previousHash as string | undefined,
    createdAt: (event.createdAt as Date).toISOString(),
  };
}

function convertToCSV(events: AuditEventOutput[]): string {
  if (events.length === 0) {
    return '';
  }

  const headers = [
    'id',
    'occurredAt',
    'occurredAtMs',
    'seq',
    'eventType',
    'actorType',
    'actorId',
    'marketId',
    'betId',
    'orderId',
    'reasonCode',
    'ipAddress',
    'integrityHash',
  ];

  const csvRows = [headers.join(',')];

  for (const event of events) {
    const row = headers.map((header) => {
      const value = event[header as keyof AuditEventOutput];
      if (value === undefined || value === null) {
        return '';
      }
      // Escape quotes and wrap in quotes if contains comma
      const strValue = String(value);
      if (strValue.includes(',') || strValue.includes('"') || strValue.includes('\n')) {
        return `"${strValue.replace(/"/g, '""')}"`;
      }
      return strValue;
    });
    csvRows.push(row.join(','));
  }

  return csvRows.join('\n');
}

// ============================================================================
// CONTEXT HELPER - Auto-populate from request context
// ============================================================================

export interface AuditContext {
  actorType: ActorType;
  actorId?: string;
  actorKycRef?: string;
  sessionId?: string;
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export function createAuditContext(
  actorType: ActorType,
  actorId?: string,
  req?: { headers: Record<string, string | string[] | undefined>; socket?: { remoteAddress?: string } }
): AuditContext {
  const context: AuditContext = {
    actorType,
    actorId,
    requestId: generateRequestId(),
  };

  if (req) {
    context.ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket?.remoteAddress;
    context.userAgent = req.headers['user-agent'] as string;
    context.sessionId = req.headers['x-session-id'] as string;
  }

  return context;
}

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// ============================================================================
// CONVENIENCE WRAPPERS
// ============================================================================

export async function logMarketEvent(
  eventType: AuditEventType,
  marketId: string,
  context: AuditContext,
  options: {
    beforeState?: Record<string, unknown>;
    afterState?: Record<string, unknown>;
    reasonCode?: ReasonCode;
    rulesVersion?: number;
    metadata?: Record<string, unknown>;
  } = {}
): Promise<AuditEventOutput> {
  return writeAuditEvent({
    eventType,
    ...context,
    marketId,
    ...options,
  });
}

export async function logTradingEvent(
  eventType: AuditEventType,
  context: AuditContext,
  options: {
    marketId: string;
    betId?: string;
    orderId?: string;
    tradeId?: string;
    beforeState?: Record<string, unknown>;
    afterState?: Record<string, unknown>;
    pricingVersion?: number;
    metadata?: Record<string, unknown>;
  }
): Promise<AuditEventOutput> {
  return writeAuditEvent({
    eventType,
    ...context,
    ...options,
  });
}

export async function logAdminEvent(
  eventType: AuditEventType,
  context: AuditContext,
  options: {
    reasonCode?: ReasonCode;
    marketId?: string;
    beforeState?: Record<string, unknown>;
    afterState?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  } = {}
): Promise<AuditEventOutput> {
  return writeAuditEvent({
    eventType,
    ...context,
    ...options,
  });
}

export async function logSystemEvent(
  eventType: AuditEventType,
  options: {
    reasonCode?: ReasonCode;
    afterState?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  } = {}
): Promise<AuditEventOutput> {
  return writeAuditEvent({
    eventType,
    actorType: 'system',
    ...options,
  });
}
