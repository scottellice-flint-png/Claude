// ============================================================================
// ORACLE LOCK SERVICE - Push-Based Market Locking
// IGA Compliant + Regulatory Safety for AU Market
// ============================================================================
//
// Critical safety mechanism for:
// - In-play sports (IGA compliance - pre-match only)
// - Economic announcements (gap protection)
// - High volatility events
// - Feed stale / deadman switch
// ============================================================================

import prisma from '@/lib/prisma';
import { writeAuditEvent } from './auditEventService';

// ============================================================================
// TYPES
// ============================================================================

export type OracleLockStatus = 'OPEN' | 'LOCKED' | 'SETTLING' | 'CLOSED';

export type OracleLockReason =
  | 'NONE'
  | 'MATCH_STARTED'
  | 'OFFICIAL_RESULT'
  | 'HIGH_VOLATILITY'
  | 'NEWS_SPIKE'
  | 'FEED_STALE'
  | 'MANUAL_LOCK'
  | 'DEADMAN_SWITCH'
  | 'PRE_SETTLEMENT'
  | 'REGULATORY_HALT';

export interface OracleEvent {
  eventType: string;
  eventSource: string;
  eventTsMs: number;
  marketId: string;
  payload: Record<string, unknown>;
}

export interface OracleLockResult {
  success: boolean;
  marketId: string;
  lockStatus: OracleLockStatus;
  lockReason?: OracleLockReason;
  ordersCancelled?: number;
  oracleEventId?: string;
  error?: string;
  alreadyLocked?: boolean;
}

export interface OracleLockState {
  marketId: string;
  lockStatus: OracleLockStatus;
  lockReason: OracleLockReason;
  lockedBy: string | null;
  lockedAt: Date | null;
  unlockedAt: Date | null;
  lastHeartbeatAt: Date | null;
  heartbeatIntervalMs: number;
  deadmanTimeoutMs: number;
  adminOverrideActive: boolean;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const ORACLE_CONFIG = {
  // Deadman switch settings
  DEFAULT_HEARTBEAT_INTERVAL_MS: 5000,
  DEFAULT_DEADMAN_TIMEOUT_MS: 30000,

  // Feed latency thresholds
  MAX_FEED_LATENCY_MS: 500,
  STALE_FEED_THRESHOLD_MS: 10000,

  // Sports-specific (IGA compliance)
  SPORTS_LOCK_BEFORE_START_MS: 60000, // Lock 1 minute before scheduled start

  // Auto-unlock settings
  MIN_LOCK_DURATION_MS: 5000,
  MAX_AUTO_UNLOCK_DURATION_MS: 3600000, // 1 hour
};

// ============================================================================
// CORE LOCKING FUNCTIONS
// ============================================================================

/**
 * Trigger oracle lock on a market
 * This MUST execute BEFORE the next taker batch processes
 *
 * @param marketId - Market to lock
 * @param lockReason - Reason for the lock
 * @param triggerSource - Source of the lock trigger (e.g., 'sportradar', 'admin', 'deadman')
 * @param options - Additional options
 */
export async function triggerOracleLock(
  marketId: string,
  lockReason: OracleLockReason,
  triggerSource: string,
  options: {
    eventTsMs?: number;
    cancelMmOrders?: boolean;
    cancelAllResting?: boolean;
    metadata?: Record<string, unknown>;
  } = {}
): Promise<OracleLockResult> {
  const nowMs = Date.now();
  const {
    eventTsMs = nowMs,
    cancelMmOrders = true,
    cancelAllResting = false,
    metadata = {},
  } = options;

  try {
    // Use the SQL function for atomic locking
    const result = await prisma.$queryRaw<{ trigger_oracle_lock: unknown }[]>`
      SELECT trigger_oracle_lock(
        ${marketId}::UUID,
        ${lockReason}::oracle_lock_reason,
        ${triggerSource}::TEXT,
        ${eventTsMs}::BIGINT,
        ${cancelMmOrders}::BOOLEAN,
        ${cancelAllResting}::BOOLEAN
      ) as trigger_oracle_lock
    `;

    const lockResult = result[0]?.trigger_oracle_lock as Record<string, unknown>;

    if (!lockResult) {
      return {
        success: false,
        marketId,
        lockStatus: 'OPEN',
        error: 'Failed to execute lock function',
      };
    }

    // Log audit event for tracking
    await writeAuditEvent({
      eventType: 'ORACLE_LOCK_TRIGGERED',
      actorType: 'system',
      marketId,
      reasonCode: lockReason,
      metadata: {
        triggerSource,
        eventTsMs,
        cancelMmOrders,
        cancelAllResting,
        ...metadata,
        result: lockResult,
      },
    });

    return {
      success: lockResult.success as boolean,
      marketId,
      lockStatus: (lockResult.lockStatus as OracleLockStatus) || 'LOCKED',
      lockReason,
      ordersCancelled: lockResult.ordersCancelled as number,
      oracleEventId: lockResult.oracleEventId as string,
      alreadyLocked: lockResult.alreadyLocked as boolean,
    };
  } catch (error) {
    console.error('Oracle lock trigger error:', error);

    // Log the failure
    await writeAuditEvent({
      eventType: 'ORACLE_LOCK_FAILED',
      actorType: 'system',
      marketId,
      reasonCode: 'LOCK_ERROR',
      metadata: {
        lockReason,
        triggerSource,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    });

    return {
      success: false,
      marketId,
      lockStatus: 'OPEN',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Release oracle lock on a market
 */
export async function releaseOracleLock(
  marketId: string,
  adminId?: string,
  reason: string = 'MANUAL_UNLOCK'
): Promise<OracleLockResult> {
  try {
    const result = await prisma.$queryRaw<{ release_oracle_lock: unknown }[]>`
      SELECT release_oracle_lock(
        ${marketId}::UUID,
        ${adminId}::UUID,
        ${reason}::TEXT
      ) as release_oracle_lock
    `;

    const unlockResult = result[0]?.release_oracle_lock as Record<string, unknown>;

    if (!unlockResult?.success) {
      return {
        success: false,
        marketId,
        lockStatus: 'LOCKED',
        error: unlockResult?.error as string || 'Failed to release lock',
      };
    }

    await writeAuditEvent({
      eventType: 'ORACLE_LOCK_RELEASED',
      actorType: adminId ? 'admin' : 'system',
      actorId: adminId,
      marketId,
      reasonCode: 'MANUAL_UNLOCK',
      metadata: { reason },
    });

    return {
      success: true,
      marketId,
      lockStatus: 'OPEN',
    };
  } catch (error) {
    console.error('Oracle lock release error:', error);
    return {
      success: false,
      marketId,
      lockStatus: 'LOCKED',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get current lock state for a market
 */
export async function getOracleLockState(marketId: string): Promise<OracleLockState | null> {
  const state = await prisma.oracleLockState.findUnique({
    where: { marketId },
  });

  if (!state) return null;

  // Derive lockStatus from isLocked boolean
  const lockStatus: OracleLockStatus = state.isLocked ? 'LOCKED' : 'OPEN';

  return {
    marketId: state.marketId,
    lockStatus,
    lockReason: (state.lockReason as OracleLockReason) || 'NONE',
    lockedBy: state.lockedBy,
    lockedAt: state.lockedAt,
    unlockedAt: state.unlockedAt,
    lastHeartbeatAt: state.lastHeartbeatAt,
    heartbeatIntervalMs: state.heartbeatIntervalMs,
    deadmanTimeoutMs: state.deadmanTimeoutMs,
    adminOverrideActive: state.adminOverrideActive,
  };
}

/**
 * Check if market is locked
 */
export async function isMarketLocked(marketId: string): Promise<boolean> {
  const state = await getOracleLockState(marketId);
  return state?.lockStatus === 'LOCKED';
}

// ============================================================================
// ORACLE EVENT HANDLERS
// ============================================================================

/**
 * Handle incoming oracle event
 * Routes to appropriate handler based on event type
 */
export async function handleOracleEvent(event: OracleEvent): Promise<OracleLockResult | null> {
  const serverTsMs = Date.now();
  const latencyMs = serverTsMs - event.eventTsMs;

  // Log the event
  await prisma.oracleEvent.create({
    data: {
      marketId: event.marketId,
      eventType: event.eventType,
      eventSource: event.eventSource,
      eventData: JSON.stringify({ ...event.payload, eventTsMs: event.eventTsMs }),
      processingLatencyMs: latencyMs,
    },
  });

  // Check latency threshold
  if (latencyMs > ORACLE_CONFIG.MAX_FEED_LATENCY_MS) {
    console.warn(`Oracle event latency too high: ${latencyMs}ms for ${event.eventType}`);
  }

  // Route based on event type
  switch (event.eventType) {
    case 'match_started':
    case 'game_started':
    case 'event_started':
      // IGA COMPLIANCE: Lock immediately on sports event start
      return triggerOracleLock(
        event.marketId,
        'MATCH_STARTED',
        event.eventSource,
        {
          eventTsMs: event.eventTsMs,
          cancelMmOrders: true,
          cancelAllResting: false,
          metadata: { originalEvent: event.payload },
        }
      );

    case 'official_result_detected':
    case 'result_announced':
    case 'outcome_determined':
      // Lock for settlement preparation
      return triggerOracleLock(
        event.marketId,
        'OFFICIAL_RESULT',
        event.eventSource,
        {
          eventTsMs: event.eventTsMs,
          cancelMmOrders: true,
          cancelAllResting: true, // Cancel all orders before settlement
          metadata: { originalEvent: event.payload },
        }
      );

    case 'high_volatility_alert':
    case 'volatility_spike':
      // Widen spreads or lock depending on severity
      const severity = event.payload.severity as string;
      if (severity === 'critical') {
        return triggerOracleLock(
          event.marketId,
          'HIGH_VOLATILITY',
          event.eventSource,
          {
            eventTsMs: event.eventTsMs,
            cancelMmOrders: true,
            metadata: { originalEvent: event.payload },
          }
        );
      }
      // For non-critical, just log and allow MM to widen
      return null;

    case 'news_spike_alert':
    case 'breaking_news':
      return triggerOracleLock(
        event.marketId,
        'NEWS_SPIKE',
        event.eventSource,
        {
          eventTsMs: event.eventTsMs,
          cancelMmOrders: true,
          metadata: { originalEvent: event.payload },
        }
      );

    case 'feed_stale':
    case 'connection_lost':
      return triggerOracleLock(
        event.marketId,
        'FEED_STALE',
        event.eventSource,
        {
          eventTsMs: event.eventTsMs,
          cancelMmOrders: true,
          metadata: { originalEvent: event.payload },
        }
      );

    default:
      console.log(`Unhandled oracle event type: ${event.eventType}`);
      return null;
  }
}

// ============================================================================
// HEARTBEAT & DEADMAN SWITCH
// ============================================================================

/**
 * Update oracle heartbeat for a market
 * Should be called regularly by the oracle feed
 */
export async function updateOracleHeartbeat(marketId: string): Promise<{ success: boolean }> {
  try {
    await prisma.$queryRaw`
      SELECT update_oracle_heartbeat(${marketId}::UUID)
    `;
    return { success: true };
  } catch (error) {
    console.error('Heartbeat update error:', error);
    return { success: false };
  }
}

/**
 * Check for stale feeds and trigger deadman switch
 * Should be called by a background worker every few seconds
 */
export async function checkDeadmanSwitch(): Promise<{
  marketsLocked: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let marketsLocked = 0;

  try {
    const result = await prisma.$queryRaw<{ check_oracle_deadman_switch: unknown }[]>`
      SELECT check_oracle_deadman_switch() as check_oracle_deadman_switch
    `;

    const checkResult = result[0]?.check_oracle_deadman_switch as Record<string, unknown>;
    marketsLocked = (checkResult?.marketsLocked as number) || 0;

    if (marketsLocked > 0) {
      // Log audit events for each locked market
      await writeAuditEvent({
        eventType: 'ORACLE_DEADMAN_SWITCH',
        actorType: 'system',
        reasonCode: 'FEED_STALE',
        metadata: {
          marketsLocked,
          checkedAt: new Date().toISOString(),
        },
      });
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    errors.push(errorMsg);
    console.error('Deadman switch check error:', error);
  }

  return { marketsLocked, errors };
}

/**
 * Initialize oracle lock state for a market
 * Should be called when a market is published
 */
export async function initializeOracleLockState(
  marketId: string,
  options: {
    heartbeatIntervalMs?: number;
    deadmanTimeoutMs?: number;
  } = {}
): Promise<{ success: boolean }> {
  const {
    heartbeatIntervalMs = ORACLE_CONFIG.DEFAULT_HEARTBEAT_INTERVAL_MS,
    deadmanTimeoutMs = ORACLE_CONFIG.DEFAULT_DEADMAN_TIMEOUT_MS,
  } = options;

  try {
    await prisma.oracleLockState.upsert({
      where: { marketId },
      create: {
        marketId,
        isLocked: false,
        lockReason: null,
        heartbeatIntervalMs,
        deadmanTimeoutMs,
        lastHeartbeatAt: new Date(),
      },
      update: {
        heartbeatIntervalMs,
        deadmanTimeoutMs,
        lastHeartbeatAt: new Date(),
      },
    });

    // Note: oracleSource is stored in OracleLockState.lockedBy or metadata if needed

    return { success: true };
  } catch (error) {
    console.error('Initialize oracle lock state error:', error);
    return { success: false };
  }
}

// ============================================================================
// SPORTS-SPECIFIC (IGA COMPLIANCE)
// ============================================================================

/**
 * Check if market should be locked for sports event start
 * IGA requires pre-match betting only
 */
export async function checkSportsEventTiming(marketId: string): Promise<{
  shouldLock: boolean;
  reason?: string;
  eventStartsAt?: Date;
}> {
  const market = await prisma.market.findUnique({
    where: { id: marketId },
    select: {
      id: true,
      closesAt: true,
      category: true,
      metadata: true,
    },
  });

  if (!market) {
    return { shouldLock: false };
  }

  // Check if this is a sports market
  const isSports = market.category?.toLowerCase().includes('sport') ||
    (market.metadata as Record<string, unknown>)?.isSportsEvent === true;

  if (!isSports) {
    return { shouldLock: false };
  }

  // Check if event is about to start (within 1 minute)
  const eventStartsAt = market.closesAt;
  if (eventStartsAt) {
    const msUntilStart = eventStartsAt.getTime() - Date.now();
    if (msUntilStart <= ORACLE_CONFIG.SPORTS_LOCK_BEFORE_START_MS && msUntilStart > 0) {
      return {
        shouldLock: true,
        reason: 'Sports event starting soon - IGA compliance',
        eventStartsAt,
      };
    }
    if (msUntilStart <= 0) {
      return {
        shouldLock: true,
        reason: 'Sports event has started - IGA compliance',
        eventStartsAt,
      };
    }
  }

  return { shouldLock: false };
}

/**
 * Sports compliance background worker
 * Checks all sports markets and locks those about to start
 */
export async function sportsComplianceWorker(): Promise<{
  marketsChecked: number;
  marketsLocked: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let marketsChecked = 0;
  let marketsLocked = 0;

  try {
    // Get all published markets that might be sports
    const markets = await prisma.market.findMany({
      where: {
        status: 'published',
        isOracleLocked: false,
      },
      select: { id: true },
    });

    for (const market of markets) {
      marketsChecked++;

      const timing = await checkSportsEventTiming(market.id);
      if (timing.shouldLock) {
        const result = await triggerOracleLock(
          market.id,
          'MATCH_STARTED',
          'sports_compliance_worker',
          { metadata: { reason: timing.reason } }
        );

        if (result.success) {
          marketsLocked++;
        } else {
          errors.push(`Failed to lock market ${market.id}: ${result.error}`);
        }
      }
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : 'Unknown error');
  }

  return { marketsChecked, marketsLocked, errors };
}

// ============================================================================
// BACKGROUND WORKER
// ============================================================================

/**
 * Main oracle service background worker
 * Should run every 1-5 seconds
 */
export async function oracleServiceWorker(): Promise<{
  deadmanResult: { marketsLocked: number; errors: string[] };
  sportsResult: { marketsChecked: number; marketsLocked: number; errors: string[] };
}> {
  // Run deadman switch check
  const deadmanResult = await checkDeadmanSwitch();

  // Run sports compliance check
  const sportsResult = await sportsComplianceWorker();

  return { deadmanResult, sportsResult };
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  ORACLE_CONFIG,
};
