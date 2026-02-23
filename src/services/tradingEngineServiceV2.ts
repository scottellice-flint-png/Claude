// ============================================================================
// TRADING ENGINE SERVICE V2 - Sharp Shield Hardened CLOB
// NT 2024 Compliant | Single-Book Kalshi-Style | Deterministic Micro-Batching
// ============================================================================

import prisma from '@/lib/prisma';
import { writeAuditEvent, createAuditContext } from './auditEventService';
import { isMarketLocked } from './oracleLockService';
import type { AuditContext } from './auditEventService';
import type { ReasonCode } from '@/types/auditEvents';

// ============================================================================
// TYPES
// ============================================================================

export type OrderSide = 'buy' | 'sell';
export type OrderType = 'limit' | 'market';
export type OrderStatus = 'pending' | 'open' | 'partial' | 'filled' | 'cancelled' | 'expired' | 'rejected';

export interface CreateOrderInput {
  userId: string;
  marketId: string;
  outcomeId: string;
  side: OrderSide;
  orderType: OrderType;
  priceCents: number;
  quantityCents: number;
  clientTsMs?: number;
  ipAddress?: string;
  deviceFingerprint?: string;
}

export interface OrderResult {
  success: boolean;
  orderId?: string;
  error?: string;
  reasonCode?: string;
  totalFilledCents?: number;
  tradesCreated?: number;
  remainingCents?: number;
  status?: OrderStatus;
  maxBetCents?: number;
  liquidityTier?: string;
  sharpShieldTier?: number;
  batchSequenceNumber?: number;
  takerFeeCents?: number;
  makerRebateCents?: number;
}

export interface MatchResultV6 {
  success: boolean;
  orderId: string;
  totalFilledCents: number;
  tradesCreated: number;
  remainingCents: number;
  status: OrderStatus;
  reasonCode: string;
  batchSequenceNumber?: number;
  takerFeeCents?: number;
  makerRebateCents?: number;
}

export interface BatchResult {
  success: boolean;
  batchId: string;
  batchSequenceNumber: number;
  ordersInBatch: number;
  ordersProcessed: number;
  tradesCreated: number;
  totalVolumeCents: number;
  processingMs: number;
  error?: string;
}

// ============================================================================
// CONFIGURATION (Sharp Shield Tiers)
// ============================================================================

const TRADING_CONFIG = {
  // Batch processing
  BATCH_WINDOW_MS: 200,        // 200ms batch window
  MIN_BATCH_WINDOW_MS: 100,
  MAX_BATCH_WINDOW_MS: 250,

  // Sharp Shield Liquidity Tiers
  // Tier 0: < $1k effective depth
  // Tier 1: $1k - $10k
  // Tier 2: $10k - $100k
  // Tier 3: > $100k
  TIER_THRESHOLDS: [100000, 1000000, 10000000],  // in cents
  TIER_MAX_TAKER: [10000, 50000, 200000, 500000],    // $100, $500, $2k, $5k
  TIER_MAX_MAKER: [25000, 100000, 500000, 1000000],  // $250, $1k, $5k, $10k

  // Tier hysteresis (5 minutes)
  TIER_HYSTERESIS_MS: 300000,

  // Price bounds
  MIN_PRICE_CENTS: 1,
  MAX_PRICE_CENTS: 99,

  // Anti-sharp
  RAPID_FIRE_THRESHOLD: 5,
  RAPID_FIRE_WINDOW_SEC: 10,
  TOXIC_FLOW_THRESHOLD: 10,
  TOXIC_FLOW_WINDOW_MS: 2000,
};

// ============================================================================
// ORDER CREATION - Entry Point
// ============================================================================

/**
 * Create an order with Sharp Shield validation
 * Orders are queued for deterministic micro-batch processing
 */
export async function createOrderV2(
  input: CreateOrderInput,
  context?: AuditContext
): Promise<OrderResult> {
  const serverTsMs = Date.now();
  const clientTsMs = input.clientTsMs || serverTsMs;

  try {
    // Validate price bounds
    if (input.priceCents < TRADING_CONFIG.MIN_PRICE_CENTS ||
        input.priceCents > TRADING_CONFIG.MAX_PRICE_CENTS) {
      return {
        success: false,
        error: `Price must be between ${TRADING_CONFIG.MIN_PRICE_CENTS} and ${TRADING_CONFIG.MAX_PRICE_CENTS} cents`,
        reasonCode: 'INVALID_PRICE',
      };
    }

    // Check oracle lock FIRST (critical path)
    const locked = await isMarketLocked(input.marketId);
    if (locked) {
      return {
        success: false,
        error: 'Market is locked by oracle',
        reasonCode: 'ORACLE_LOCK_ACTIVE',
      };
    }

    // Get user with balance check
    const user = await prisma.user.findUnique({
      where: { id: input.userId },
    });

    if (!user) {
      return { success: false, error: 'User not found', reasonCode: 'USER_NOT_FOUND' };
    }

    if (user.isFlagged) {
      return {
        success: false,
        error: 'Account is flagged for review',
        reasonCode: 'USER_FLAGGED'
      };
    }

    // Get market status
    const market = await prisma.market.findUnique({
      where: { id: input.marketId },
    });

    if (!market) {
      return { success: false, error: 'Market not found', reasonCode: 'MARKET_NOT_FOUND' };
    }

    if (market.status !== 'published') {
      return {
        success: false,
        error: 'Market is not open for trading',
        reasonCode: 'MARKET_NOT_OPEN'
      };
    }

    if (market.closesAt && new Date(market.closesAt) <= new Date()) {
      return { success: false, error: 'Market has closed', reasonCode: 'MARKET_CLOSED' };
    }

    // Check if this will be a taker order (crosses spread)
    const isTaker = await checkIsTakerOrder(
      input.marketId,
      input.side,
      input.priceCents,
      input.orderType
    );

    // Get liquidity state for Sharp Shield tier limits
    const liquidityState = await getSharpShieldLiquidityState(input.marketId);
    const tier = liquidityState?.sharpShieldTier || 0;
    const maxBet = isTaker
      ? TRADING_CONFIG.TIER_MAX_TAKER[tier] || TRADING_CONFIG.TIER_MAX_TAKER[0]
      : TRADING_CONFIG.TIER_MAX_MAKER[tier] || TRADING_CONFIG.TIER_MAX_MAKER[0];

    // Sharp Shield: Enforce tier-based limits
    if (input.quantityCents > maxBet) {
      return {
        success: false,
        error: 'Order exceeds liquidity tier limit',
        reasonCode: 'EXCEEDS_TIER_LIMIT',
        maxBetCents: maxBet,
        liquidityTier: liquidityState?.liquidityTier || 'seed',
        sharpShieldTier: liquidityState?.sharpShieldTier || 0,
      };
    }

    // Calculate required balance
    // BID = buy YES, requires price * quantity / 100
    // ASK = sell YES, requires (100 - price) * quantity / 100 (margin for NO delivery)
    const requiredBalance = input.side === 'buy'
      ? Math.floor(input.quantityCents * input.priceCents / 100)
      : Math.floor(input.quantityCents * (100 - input.priceCents) / 100);

    const availableBalance = Number(user.balanceCents) - Number(user.lockedBalanceCents);

    if (availableBalance < requiredBalance) {
      return {
        success: false,
        error: 'Insufficient balance',
        reasonCode: 'INSUFFICIENT_BALANCE',
      };
    }

    // Anti-sharp: Rapid fire detection
    const rapidFireCheck = await detectRapidFire(input.userId);
    if (rapidFireCheck.isRapidFire) {
      return {
        success: false,
        error: 'Rate limit exceeded - too many orders',
        reasonCode: 'RAPID_FIRE_DETECTED',
      };
    }

    // Create the order and queue for batch processing
    const orderId = crypto.randomUUID();

    await prisma.$transaction(async (tx) => {
      // Create order in pending state
      await tx.order.create({
        data: {
          id: orderId,
          marketId: input.marketId,
          outcomeId: input.outcomeId,
          userId: input.userId,
          side: input.side,
          orderType: input.orderType,
          priceCents: input.priceCents,
          quantityCents: input.quantityCents,
          remainingCents: input.quantityCents,
          status: 'pending',
          isTaker,
          ipAddress: input.ipAddress,
          deviceFingerprint: input.deviceFingerprint,
        },
      });

      // Lock balance
      await tx.user.update({
        where: { id: input.userId },
        data: {
          lockedBalanceCents: { increment: requiredBalance },
        },
      });

      // Queue for deterministic batch processing
      await tx.pendingOrder.create({
        data: {
          orderId,
          marketId: input.marketId,
          outcomeId: input.outcomeId,
          userId: input.userId,
          side: input.side === 'buy' ? 'BID' : 'ASK',
          priceCents: input.priceCents,
          quantityCents: input.quantityCents,
          status: 'pending',
          // Store order details in matchResult as JSON for now
          matchResult: JSON.stringify({
            orderType: input.orderType,
            isTaker,
            serverTsMs,
            clientTsMs,
          }),
        },
      });
    });

    // Log audit event
    if (context) {
      await writeAuditEvent({
        eventType: 'ORDER_PLACED',
        actorType: context.actorType,
        actorId: context.actorId,
        marketId: input.marketId,
        orderId,
        ipAddress: input.ipAddress,
        metadata: {
          side: input.side,
          orderType: input.orderType,
          priceCents: input.priceCents,
          quantityCents: input.quantityCents,
          requiredBalance,
          isTaker,
          serverTsMs,
          clientTsMs,
          sharpShieldTier: liquidityState?.sharpShieldTier,
        },
      });
    }

    return {
      success: true,
      orderId,
      reasonCode: 'QUEUED_FOR_BATCH',
      status: 'pending',
      remainingCents: input.quantityCents,
      sharpShieldTier: liquidityState?.sharpShieldTier || 0,
    };
  } catch (error) {
    console.error('Create order error:', error);
    return {
      success: false,
      error: 'Internal error creating order',
      reasonCode: 'INTERNAL_ERROR',
    };
  }
}

// ============================================================================
// DETERMINISTIC MICRO-BATCH PROCESSING
// ============================================================================

/**
 * Process pending orders for a market in deterministic batches
 * Should be called by background worker every 100-250ms
 */
export async function processPendingBatch(
  marketId: string,
  batchWindowMs: number = TRADING_CONFIG.BATCH_WINDOW_MS
): Promise<BatchResult> {
  try {
    // Clamp batch window
    const window = Math.max(
      TRADING_CONFIG.MIN_BATCH_WINDOW_MS,
      Math.min(TRADING_CONFIG.MAX_BATCH_WINDOW_MS, batchWindowMs)
    );

    // Call the SQL batch processor
    const result = await prisma.$queryRaw<{ process_pending_batch: unknown }[]>`
      SELECT process_pending_batch(
        ${marketId}::UUID,
        ${window}::INTEGER
      ) as process_pending_batch
    `;

    const batchResult = result[0]?.process_pending_batch as Record<string, unknown>;

    if (!batchResult?.success) {
      return {
        success: false,
        batchId: '',
        batchSequenceNumber: 0,
        ordersInBatch: 0,
        ordersProcessed: 0,
        tradesCreated: 0,
        totalVolumeCents: 0,
        processingMs: 0,
        error: batchResult?.error as string || 'Batch processing failed',
      };
    }

    return {
      success: true,
      batchId: batchResult.batchId as string,
      batchSequenceNumber: Number(batchResult.batchSequenceNumber),
      ordersInBatch: batchResult.ordersInBatch as number,
      ordersProcessed: batchResult.ordersProcessed as number,
      tradesCreated: batchResult.tradesCreated as number,
      totalVolumeCents: Number(batchResult.totalVolumeCents),
      processingMs: batchResult.processingMs as number,
    };
  } catch (error) {
    console.error('Batch processing error:', error);
    return {
      success: false,
      batchId: '',
      batchSequenceNumber: 0,
      ordersInBatch: 0,
      ordersProcessed: 0,
      tradesCreated: 0,
      totalVolumeCents: 0,
      processingMs: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Process all pending batches across all markets
 * Main entry point for batch processor worker
 */
export async function processAllPendingBatches(): Promise<{
  marketsProcessed: number;
  totalOrdersProcessed: number;
  totalTradesCreated: number;
  results: BatchResult[];
  errors: string[];
}> {
  const errors: string[] = [];
  const results: BatchResult[] = [];
  let marketsProcessed = 0;
  let totalOrdersProcessed = 0;
  let totalTradesCreated = 0;

  try {
    // Get markets with pending orders
    const marketsWithPending = await prisma.pendingOrder.findMany({
      where: { status: 'pending' },
      select: { marketId: true },
      distinct: ['marketId'],
    });

    for (const { marketId } of marketsWithPending) {
      const result = await processPendingBatch(marketId);
      results.push(result);

      if (result.success) {
        marketsProcessed++;
        totalOrdersProcessed += result.ordersProcessed;
        totalTradesCreated += result.tradesCreated;
      } else if (result.error) {
        errors.push(`Market ${marketId}: ${result.error}`);
      }
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : 'Unknown error');
  }

  return {
    marketsProcessed,
    totalOrdersProcessed,
    totalTradesCreated,
    results,
    errors,
  };
}

// ============================================================================
// DIRECT MATCHING (for maker orders - no batch delay needed)
// ============================================================================

/**
 * Match a single order using the V6 matching engine
 * Used for maker orders that don't need batch delay
 */
export async function matchOrderV6(
  orderId: string,
  batchSequenceNumber?: number
): Promise<MatchResultV6> {
  try {
    const result = await prisma.$queryRaw<{ match_orders_v6: unknown }[]>`
      SELECT match_orders_v6(
        ${orderId}::UUID,
        ${batchSequenceNumber || null}::BIGINT
      ) as match_orders_v6
    `;

    const matchResult = result[0]?.match_orders_v6 as Record<string, unknown>;

    if (!matchResult) {
      return {
        success: false,
        orderId,
        totalFilledCents: 0,
        tradesCreated: 0,
        remainingCents: 0,
        status: 'cancelled',
        reasonCode: 'MATCH_FAILED',
      };
    }

    return {
      success: matchResult.success as boolean,
      orderId,
      totalFilledCents: matchResult.totalFilledCents as number,
      tradesCreated: matchResult.tradesCreated as number,
      remainingCents: matchResult.remainingCents as number,
      status: matchResult.status as OrderStatus,
      reasonCode: matchResult.reasonCode as string,
      batchSequenceNumber: matchResult.batchSequenceNumber as number | undefined,
      takerFeeCents: matchResult.takerFeeCents as number | undefined,
      makerRebateCents: matchResult.makerRebateCents as number | undefined,
    };
  } catch (error) {
    console.error('Match order error:', error);
    return {
      success: false,
      orderId,
      totalFilledCents: 0,
      tradesCreated: 0,
      remainingCents: 0,
      status: 'cancelled',
      reasonCode: 'INTERNAL_ERROR',
    };
  }
}

// ============================================================================
// ORDER CANCELLATION
// ============================================================================

/**
 * Cancel an order
 */
export async function cancelOrderV2(
  orderId: string,
  userId: string,
  reason: ReasonCode = 'USER_CANCEL'
): Promise<OrderResult> {
  try {
    // Check oracle lock first
    const order = await prisma.order.findFirst({
      where: { id: orderId, userId },
    });

    if (!order) {
      return { success: false, error: 'Order not found', reasonCode: 'ORDER_NOT_FOUND' };
    }

    // Can cancel even if market is locked (important for user protection)
    if (!['pending', 'open', 'partial'].includes(order.status)) {
      return {
        success: false,
        error: 'Order cannot be cancelled',
        reasonCode: 'INVALID_ORDER_STATE'
      };
    }

    // Calculate refund amount
    const refundAmount = order.side === 'buy'
      ? Math.floor(order.remainingCents * order.priceCents / 100)
      : Math.floor(order.remainingCents * (100 - order.priceCents) / 100);

    await prisma.$transaction(async (tx) => {
      // Update order
      await tx.order.update({
        where: { id: orderId },
        data: {
          status: 'cancelled',
          cancelledAt: new Date(),
          reasonCode: reason,
        },
      });

      // Release locked balance
      await tx.user.update({
        where: { id: userId },
        data: {
          lockedBalanceCents: { decrement: refundAmount },
        },
      });

      // Cancel from pending queue if present
      await tx.pendingOrder.updateMany({
        where: { orderId, status: 'pending' },
        data: { status: 'cancelled' },
      });
    });

    // Update market liquidity
    await updateSharpShieldLiquidity(order.marketId);

    await writeAuditEvent({
      eventType: 'ORDER_CANCELLED',
      actorType: 'user',
      actorId: userId,
      orderId,
      marketId: order.marketId,
      reasonCode: reason,
      metadata: { refundAmount, remainingCents: order.remainingCents },
    });

    return {
      success: true,
      orderId,
      reasonCode: reason,
      status: 'cancelled',
    };
  } catch (error) {
    console.error('Cancel order error:', error);
    return { success: false, error: 'Internal error', reasonCode: 'INTERNAL_ERROR' };
  }
}

// ============================================================================
// SHARP SHIELD LIQUIDITY STATE
// ============================================================================

interface SharpShieldState {
  marketId: string;
  totalLiquidityCents: number;
  effectiveDepthCents: number;
  bestBidCents: number | null;
  bestAskCents: number | null;
  midPriceCents: number | null;
  spreadCents: number | null;
  sharpShieldTier: number;
  liquidityTier: string;
  currentTakerFeeBps: number;
  currentMakerRebateBps: number;
}

export async function getSharpShieldLiquidityState(marketId: string): Promise<SharpShieldState | null> {
  const state = await prisma.marketLiquidityState.findUnique({
    where: { marketId },
  });

  if (!state) return null;

  return {
    marketId: state.marketId,
    totalLiquidityCents: Number(state.totalLiquidityCents),
    effectiveDepthCents: Number(state.effectiveDepthCents || 0),
    bestBidCents: state.bestBidCents,
    bestAskCents: state.bestAskCents,
    midPriceCents: state.midPriceCents,
    spreadCents: state.spreadCents,
    sharpShieldTier: state.sharpShieldTier || 0,
    liquidityTier: state.liquidityTier,
    currentTakerFeeBps: state.currentTakerFeeBps,
    currentMakerRebateBps: state.currentMakerRebateBps,
  };
}

export async function updateSharpShieldLiquidity(marketId: string): Promise<void> {
  try {
    await prisma.$queryRaw`
      SELECT update_market_liquidity_v2(${marketId}::UUID)
    `;
  } catch (error) {
    console.error('Update liquidity error:', error);
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function checkIsTakerOrder(
  marketId: string,
  side: OrderSide,
  priceCents: number,
  orderType: OrderType
): Promise<boolean> {
  if (orderType === 'market') return true;

  const liquidityState = await getSharpShieldLiquidityState(marketId);
  if (!liquidityState) return false;

  // Taker if crossing the spread
  if (side === 'buy' && liquidityState.bestAskCents !== null) {
    return priceCents >= liquidityState.bestAskCents;
  }
  if (side === 'sell' && liquidityState.bestBidCents !== null) {
    return priceCents <= liquidityState.bestBidCents;
  }

  return false;
}

async function detectRapidFire(
  userId: string
): Promise<{ isRapidFire: boolean; orderCount: number }> {
  const cutoff = new Date(Date.now() - TRADING_CONFIG.RAPID_FIRE_WINDOW_SEC * 1000);

  const orderCount = await prisma.order.count({
    where: {
      userId,
      createdAt: { gte: cutoff },
    },
  });

  const isRapidFire = orderCount > TRADING_CONFIG.RAPID_FIRE_THRESHOLD;

  if (isRapidFire) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        riskScore: { increment: 10 },
        isFlagged: true,
        flagReason: 'RAPID_FIRE_ORDERS',
      },
    });

    await prisma.riskEvent.create({
      data: {
        eventType: 'RAPID_FIRE',
        severity: 'high',
        userId,
        detectionRule: `ORDERS_PER_${TRADING_CONFIG.RAPID_FIRE_WINDOW_SEC}_SEC > ${TRADING_CONFIG.RAPID_FIRE_THRESHOLD}`,
        triggerData: JSON.stringify({ orderCount, timeWindowSeconds: TRADING_CONFIG.RAPID_FIRE_WINDOW_SEC }),
        actionTaken: 'HALT_USER',
      },
    });
  }

  return { isRapidFire, orderCount };
}

// ============================================================================
// BACKGROUND WORKER
// ============================================================================

/**
 * Main trading engine background worker
 * Should run every 100-250ms for batch processing
 */
export async function tradingEngineWorker(): Promise<{
  batchResults: BatchResult[];
  errors: string[];
}> {
  const result = await processAllPendingBatches();

  return {
    batchResults: result.results,
    errors: result.errors,
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  TRADING_CONFIG,
};
