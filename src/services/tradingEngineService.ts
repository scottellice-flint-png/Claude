// ============================================================================
// TRADING ENGINE SERVICE - Fortress CLOB Implementation
// NT 2024 Compliant with Price-Time Priority
// ============================================================================

import prisma from '@/lib/prisma';
import { writeAuditEvent, createAuditContext } from './auditEventService';
import type { AuditContext } from './auditEventService';

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
}

export interface MatchResult {
  success: boolean;
  orderId: string;
  totalFilledCents: number;
  tradesCreated: number;
  remainingCents: number;
  status: OrderStatus;
  reasonCode: string;
}

export interface OrderBookLevel {
  priceCents: number;
  quantityCents: number;
  orderCount: number;
}

export interface OrderBook {
  marketId: string;
  outcomeId: string;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  bestBidCents: number | null;
  bestAskCents: number | null;
  midPriceCents: number | null;
  spreadCents: number | null;
  totalBidsCents: number;
  totalAsksCents: number;
  lastUpdated: string;
}

export interface LiquidityState {
  marketId: string;
  totalLiquidityCents: bigint;
  bidLiquidityCents: bigint;
  askLiquidityCents: bigint;
  bestBidCents: number | null;
  bestAskCents: number | null;
  midPriceCents: number | null;
  spreadCents: number | null;
  liquidityTier: string;
  maxBetCents: number;
  spreadMultiplier: number;
  spreadReason: string | null;
  tradesLast2Sec: number;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const TRADING_CONFIG = {
  // NT Liquidity-Locked Bet Caps
  SEED_LIQUIDITY_THRESHOLD: 1000000,  // $10,000 in cents
  GROWTH_LIQUIDITY_THRESHOLD: 10000000,  // $100,000 in cents

  SEED_MAX_BET: 50000,    // $500 max bet when liquidity < $10k
  GROWTH_MAX_BET: 500000, // $5,000 max bet when $10k < liquidity < $100k
  MATURE_MAX_BET: 5000000, // $50,000 max bet when liquidity > $100k

  // Taker delay (500ms)
  TAKER_DELAY_MS: 500,

  // Toxic flow detection
  TOXIC_FLOW_THRESHOLD: 10, // trades in 2 seconds
  TOXIC_SPREAD_MULTIPLIER: 3.0,

  // Price bounds
  MIN_PRICE_CENTS: 1,
  MAX_PRICE_CENTS: 99,
};

// ============================================================================
// ORDER CREATION - Main entry point
// ============================================================================

export async function createOrder(
  input: CreateOrderInput,
  context?: AuditContext
): Promise<OrderResult> {
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

    // Get liquidity state for bet cap enforcement
    const liquidityState = await getMarketLiquidityState(input.marketId);
    const maxBet = liquidityState?.maxBetCents || TRADING_CONFIG.SEED_MAX_BET;

    // NT Liquidity-Locked Bet Cap
    if (input.quantityCents > maxBet) {
      return {
        success: false,
        error: 'Order exceeds liquidity-based bet cap',
        reasonCode: 'EXCEEDS_LIQUIDITY_CAP',
        maxBetCents: maxBet,
        liquidityTier: liquidityState?.liquidityTier || 'seed',
      };
    }

    // Calculate required balance
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

    // Check rapid fire (anti-sharp)
    const rapidFireCheck = await detectRapidFire(input.userId);
    if (rapidFireCheck.isRapidFire) {
      return {
        success: false,
        error: 'Rate limit exceeded - too many orders',
        reasonCode: 'RAPID_FIRE_DETECTED',
      };
    }

    // Create the order
    const orderId = crypto.randomUUID();

    await prisma.$transaction(async (tx) => {
      // Create order
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
        },
      });
    }

    // Determine if this is a taker order (crosses the spread)
    const isTakerOrder = await checkIsTakerOrder(
      input.marketId,
      input.side,
      input.priceCents,
      input.orderType
    );

    if (isTakerOrder) {
      // Queue for 500ms delay
      return queueTakerOrder(orderId);
    } else {
      // Maker order: open immediately and attempt match
      await prisma.order.update({
        where: { id: orderId },
        data: { status: 'open' },
      });

      return matchOrders(orderId);
    }
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
// ORDER MATCHING - Price-Time Priority CLOB
// ============================================================================

export async function matchOrders(orderId: string): Promise<MatchResult> {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return {
        success: false,
        orderId,
        totalFilledCents: 0,
        tradesCreated: 0,
        remainingCents: 0,
        status: 'cancelled',
        reasonCode: 'ORDER_NOT_FOUND',
      };
    }

    if (!['pending', 'open', 'partial'].includes(order.status)) {
      return {
        success: false,
        orderId,
        totalFilledCents: order.filledCents,
        tradesCreated: 0,
        remainingCents: order.remainingCents,
        status: order.status as OrderStatus,
        reasonCode: 'INVALID_ORDER_STATE',
      };
    }

    const oppositeSide = order.side === 'buy' ? 'sell' : 'buy';
    let totalFilled = 0;
    let tradesCreated = 0;
    let remaining = order.remainingCents;

    // Find matching orders using Price-Time Priority
    const counterOrders = await prisma.order.findMany({
      where: {
        marketId: order.marketId,
        outcomeId: order.outcomeId,
        side: oppositeSide,
        status: { in: ['open', 'partial'] },
        userId: { not: order.userId }, // No self-trading
        priceCents: order.side === 'buy'
          ? { lte: order.priceCents } // Buyer pays up to their limit
          : { gte: order.priceCents }, // Seller accepts down to their limit
      },
      orderBy: [
        { priceCents: order.side === 'buy' ? 'asc' : 'desc' }, // Best price first
        { createdAt: 'asc' }, // Time priority for same price
      ],
    });

    // Execute matches
    for (const counterOrder of counterOrders) {
      if (remaining <= 0) break;

      const fillQty = Math.min(remaining, counterOrder.remainingCents);
      const fillPrice = counterOrder.priceCents; // Maker's price

      // Create trade in transaction
      await prisma.$transaction(async (tx) => {
        const tradeId = crypto.randomUUID();

        // Create trade record
        await tx.trade.create({
          data: {
            id: tradeId,
            marketId: order.marketId,
            outcomeId: order.outcomeId,
            buyOrderId: order.side === 'buy' ? order.id : counterOrder.id,
            sellOrderId: order.side === 'sell' ? order.id : counterOrder.id,
            buyerId: order.side === 'buy' ? order.userId : counterOrder.userId,
            sellerId: order.side === 'sell' ? order.userId : counterOrder.userId,
            priceCents: fillPrice,
            quantityCents: fillQty,
            reasonCode: 'CLOB_MATCH',
          },
        });

        // Update counter order
        const newCounterRemaining = counterOrder.remainingCents - fillQty;
        await tx.order.update({
          where: { id: counterOrder.id },
          data: {
            filledCents: { increment: fillQty },
            remainingCents: newCounterRemaining,
            status: newCounterRemaining === 0 ? 'filled' : 'partial',
            filledAt: newCounterRemaining === 0 ? new Date() : undefined,
            reasonCode: 'CLOB_MATCH',
          },
        });

        // Update positions for buyer
        await updatePosition(
          tx,
          order.side === 'buy' ? order.userId : counterOrder.userId,
          order.marketId,
          order.outcomeId,
          fillQty,
          fillPrice
        );

        // Update positions for seller (negative quantity)
        await updatePosition(
          tx,
          order.side === 'sell' ? order.userId : counterOrder.userId,
          order.marketId,
          order.outcomeId,
          -fillQty,
          fillPrice
        );

        // Update user balances
        const buyerCost = Math.floor(fillQty * fillPrice / 100);
        const sellerCredit = buyerCost;

        // Buyer: deduct from locked balance
        await tx.user.update({
          where: { id: order.side === 'buy' ? order.userId : counterOrder.userId },
          data: {
            balanceCents: { decrement: buyerCost },
            lockedBalanceCents: { decrement: buyerCost },
            totalTrades: { increment: 1 },
            totalVolumeCents: { increment: fillQty },
          },
        });

        // Seller: release locked balance and credit
        await tx.user.update({
          where: { id: order.side === 'sell' ? order.userId : counterOrder.userId },
          data: {
            balanceCents: { increment: sellerCredit },
            lockedBalanceCents: { decrement: Math.floor(fillQty * (100 - fillPrice) / 100) },
            totalTrades: { increment: 1 },
            totalVolumeCents: { increment: fillQty },
          },
        });

        // Update market stats
        await tx.market.update({
          where: { id: order.marketId },
          data: {
            volume: { increment: fillQty / 100 },
            tradeCount: { increment: 1 },
            currentYesPrice: order.outcomeId === (await getYesOutcomeId(order.marketId))
              ? fillPrice
              : 100 - fillPrice,
            currentNoPrice: order.outcomeId === (await getYesOutcomeId(order.marketId))
              ? 100 - fillPrice
              : fillPrice,
          },
        });
      });

      totalFilled += fillQty;
      tradesCreated++;
      remaining -= fillQty;
    }

    // Update the incoming order
    const finalStatus = remaining === 0 ? 'filled'
      : totalFilled > 0 ? 'partial'
      : 'open';

    await prisma.order.update({
      where: { id: orderId },
      data: {
        filledCents: { increment: totalFilled },
        remainingCents: remaining,
        status: finalStatus,
        filledAt: remaining === 0 ? new Date() : undefined,
        reasonCode: totalFilled > 0 ? 'CLOB_MATCH' : 'NO_MATCH',
        isTaker: totalFilled > 0,
      },
    });

    // Update market liquidity state
    await updateMarketLiquidity(order.marketId);

    // Update trade velocity for toxic flow detection
    if (tradesCreated > 0) {
      await updateTradeVelocity(order.marketId);
    }

    return {
      success: true,
      orderId,
      totalFilledCents: totalFilled,
      tradesCreated,
      remainingCents: remaining,
      status: finalStatus as OrderStatus,
      reasonCode: totalFilled > 0 ? 'CLOB_MATCH' : 'NO_MATCH',
    };
  } catch (error) {
    console.error('Match orders error:', error);
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
// TAKER QUEUE - 500ms Delay
// ============================================================================

async function queueTakerOrder(orderId: string): Promise<OrderResult> {
  const releaseAt = new Date(Date.now() + TRADING_CONFIG.TAKER_DELAY_MS);

  const order = await prisma.order.findUnique({
    where: { id: orderId },
  });

  if (!order) {
    return { success: false, error: 'Order not found', reasonCode: 'ORDER_NOT_FOUND' };
  }

  await prisma.takerQueue.create({
    data: {
      orderId,
      releaseAt,
      orderSnapshot: JSON.parse(JSON.stringify(order)),
    },
  });

  return {
    success: true,
    orderId,
    reasonCode: 'QUEUED_FOR_DELAY',
    status: 'pending',
    remainingCents: order.quantityCents,
  };
}

export async function processTakerQueue(): Promise<{ processed: number; results: MatchResult[] }> {
  const queuedItems = await prisma.takerQueue.findMany({
    where: {
      status: 'queued',
      releaseAt: { lte: new Date() },
    },
    orderBy: { releaseAt: 'asc' },
  });

  const results: MatchResult[] = [];
  let processed = 0;

  for (const item of queuedItems) {
    try {
      // Mark as processing
      await prisma.takerQueue.update({
        where: { id: item.id },
        data: { status: 'processing' },
      });

      // Attempt to match
      const result = await matchOrders(item.orderId);
      results.push(result);

      // Update queue status
      await prisma.takerQueue.update({
        where: { id: item.id },
        data: {
          status: 'completed',
          processedAt: new Date(),
          matchResult: JSON.parse(JSON.stringify(result)),
        },
      });

      processed++;
    } catch (error) {
      await prisma.takerQueue.update({
        where: { id: item.id },
        data: {
          status: 'completed',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        },
      });
    }
  }

  return { processed, results };
}

// ============================================================================
// ORDER CANCELLATION
// ============================================================================

export async function cancelOrder(
  orderId: string,
  userId: string,
  reason: string = 'USER_CANCEL'
): Promise<OrderResult> {
  try {
    const order = await prisma.order.findFirst({
      where: { id: orderId, userId },
    });

    if (!order) {
      return { success: false, error: 'Order not found', reasonCode: 'ORDER_NOT_FOUND' };
    }

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

      // Cancel any pending taker queue
      await tx.takerQueue.updateMany({
        where: { orderId, status: 'queued' },
        data: { status: 'cancelled' },
      });
    });

    // Update market liquidity
    await updateMarketLiquidity(order.marketId);

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
// ORDER BOOK QUERIES
// ============================================================================

export async function getOrderBook(
  marketId: string,
  outcomeId: string
): Promise<OrderBook> {
  // Get all open orders grouped by price
  const [bids, asks] = await Promise.all([
    prisma.order.groupBy({
      by: ['priceCents'],
      where: {
        marketId,
        outcomeId,
        side: 'buy',
        status: { in: ['open', 'partial'] },
      },
      _sum: { remainingCents: true },
      _count: { id: true },
      orderBy: { priceCents: 'desc' },
    }),
    prisma.order.groupBy({
      by: ['priceCents'],
      where: {
        marketId,
        outcomeId,
        side: 'sell',
        status: { in: ['open', 'partial'] },
      },
      _sum: { remainingCents: true },
      _count: { id: true },
      orderBy: { priceCents: 'asc' },
    }),
  ]);

  const bidLevels: OrderBookLevel[] = bids.map(b => ({
    priceCents: b.priceCents,
    quantityCents: b._sum.remainingCents || 0,
    orderCount: b._count.id,
  }));

  const askLevels: OrderBookLevel[] = asks.map(a => ({
    priceCents: a.priceCents,
    quantityCents: a._sum.remainingCents || 0,
    orderCount: a._count.id,
  }));

  const bestBid = bidLevels[0]?.priceCents || null;
  const bestAsk = askLevels[0]?.priceCents || null;
  const midPrice = bestBid && bestAsk ? Math.floor((bestBid + bestAsk) / 2) : null;
  const spread = bestBid && bestAsk ? bestAsk - bestBid : null;

  const totalBids = bidLevels.reduce((sum, b) => sum + b.quantityCents, 0);
  const totalAsks = askLevels.reduce((sum, a) => sum + a.quantityCents, 0);

  return {
    marketId,
    outcomeId,
    bids: bidLevels,
    asks: askLevels,
    bestBidCents: bestBid,
    bestAskCents: bestAsk,
    midPriceCents: midPrice,
    spreadCents: spread,
    totalBidsCents: totalBids,
    totalAsksCents: totalAsks,
    lastUpdated: new Date().toISOString(),
  };
}

// ============================================================================
// MARKET LIQUIDITY STATE
// ============================================================================

export async function getMarketLiquidityState(marketId: string): Promise<LiquidityState | null> {
  const state = await prisma.marketLiquidityState.findUnique({
    where: { marketId },
  });

  if (!state) return null;

  return {
    marketId: state.marketId,
    totalLiquidityCents: state.totalLiquidityCents,
    bidLiquidityCents: state.bidLiquidityCents,
    askLiquidityCents: state.askLiquidityCents,
    bestBidCents: state.bestBidCents,
    bestAskCents: state.bestAskCents,
    midPriceCents: state.midPriceCents,
    spreadCents: state.spreadCents,
    liquidityTier: state.liquidityTier,
    maxBetCents: state.maxBetCents,
    spreadMultiplier: state.spreadMultiplier,
    spreadReason: state.spreadReason,
    tradesLast2Sec: state.tradesLast2Sec,
  };
}

async function updateMarketLiquidity(marketId: string): Promise<void> {
  const outcomes = await prisma.marketOutcome.findMany({
    where: { marketId },
  });

  let totalBids = BigInt(0);
  let totalAsks = BigInt(0);

  for (const outcome of outcomes) {
    const [bidSum, askSum] = await Promise.all([
      prisma.order.aggregate({
        where: { marketId, outcomeId: outcome.id, side: 'buy', status: { in: ['open', 'partial'] } },
        _sum: { remainingCents: true },
      }),
      prisma.order.aggregate({
        where: { marketId, outcomeId: outcome.id, side: 'sell', status: { in: ['open', 'partial'] } },
        _sum: { remainingCents: true },
      }),
    ]);

    totalBids += BigInt(bidSum._sum.remainingCents || 0);
    totalAsks += BigInt(askSum._sum.remainingCents || 0);
  }

  const totalLiquidity = totalBids + totalAsks;

  // Determine tier and max bet
  let liquidityTier: string;
  let maxBet: number;

  if (totalLiquidity < BigInt(TRADING_CONFIG.SEED_LIQUIDITY_THRESHOLD)) {
    liquidityTier = 'seed';
    maxBet = TRADING_CONFIG.SEED_MAX_BET;
  } else if (totalLiquidity < BigInt(TRADING_CONFIG.GROWTH_LIQUIDITY_THRESHOLD)) {
    liquidityTier = 'growth';
    maxBet = TRADING_CONFIG.GROWTH_MAX_BET;
  } else {
    liquidityTier = 'mature';
    maxBet = TRADING_CONFIG.MATURE_MAX_BET;
  }

  // Get best bid/ask from primary outcome
  const primaryOutcome = outcomes[0];
  let bestBid: number | null = null;
  let bestAsk: number | null = null;

  if (primaryOutcome) {
    const [bidOrder, askOrder] = await Promise.all([
      prisma.order.findFirst({
        where: { marketId, outcomeId: primaryOutcome.id, side: 'buy', status: { in: ['open', 'partial'] } },
        orderBy: { priceCents: 'desc' },
      }),
      prisma.order.findFirst({
        where: { marketId, outcomeId: primaryOutcome.id, side: 'sell', status: { in: ['open', 'partial'] } },
        orderBy: { priceCents: 'asc' },
      }),
    ]);

    bestBid = bidOrder?.priceCents || null;
    bestAsk = askOrder?.priceCents || null;
  }

  const midPrice = bestBid !== null && bestAsk !== null
    ? Math.floor((bestBid + bestAsk) / 2)
    : null;
  const spread = bestBid !== null && bestAsk !== null
    ? bestAsk - bestBid
    : null;

  // Upsert liquidity state
  await prisma.marketLiquidityState.upsert({
    where: { marketId },
    create: {
      marketId,
      totalLiquidityCents: totalLiquidity,
      bidLiquidityCents: totalBids,
      askLiquidityCents: totalAsks,
      bestBidCents: bestBid,
      bestAskCents: bestAsk,
      midPriceCents: midPrice,
      spreadCents: spread,
      liquidityTier,
      maxBetCents: maxBet,
    },
    update: {
      totalLiquidityCents: totalLiquidity,
      bidLiquidityCents: totalBids,
      askLiquidityCents: totalAsks,
      bestBidCents: bestBid,
      bestAskCents: bestAsk,
      midPriceCents: midPrice,
      spreadCents: spread,
      liquidityTier,
      maxBetCents: maxBet,
    },
  });
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

  const liquidityState = await getMarketLiquidityState(marketId);
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

async function updatePosition(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  userId: string,
  marketId: string,
  outcomeId: string,
  quantityDelta: number,
  priceCents: number
): Promise<void> {
  const existing = await tx.position.findUnique({
    where: {
      userId_marketId_outcomeId: { userId, marketId, outcomeId },
    },
  });

  if (!existing) {
    await tx.position.create({
      data: {
        userId,
        marketId,
        outcomeId,
        quantityCents: Math.max(quantityDelta, 0),
        avgPriceCents: priceCents,
        totalCostCents: Math.floor(Math.abs(quantityDelta) * priceCents / 100),
      },
    });
  } else {
    const newQuantity = existing.quantityCents + quantityDelta;
    let newTotalCost = existing.totalCostCents;
    let newAvgPrice = existing.avgPriceCents;

    if (quantityDelta > 0) {
      // Buying: average in the new price
      newTotalCost = existing.totalCostCents + Math.floor(quantityDelta * priceCents / 100);
      newAvgPrice = newQuantity > 0
        ? Math.floor(newTotalCost * 100 / newQuantity)
        : 0;
    } else {
      // Selling: reduce cost proportionally
      if (existing.quantityCents > 0) {
        newTotalCost = Math.floor(existing.totalCostCents * newQuantity / existing.quantityCents);
      }
    }

    await tx.position.update({
      where: { id: existing.id },
      data: {
        quantityCents: newQuantity,
        avgPriceCents: newAvgPrice,
        totalCostCents: Math.max(newTotalCost, 0),
      },
    });
  }
}

async function getYesOutcomeId(marketId: string): Promise<string | null> {
  const outcome = await prisma.marketOutcome.findFirst({
    where: { marketId, position: 0 },
  });
  return outcome?.id || null;
}

async function detectRapidFire(
  userId: string,
  timeWindowSeconds: number = 10,
  threshold: number = 5
): Promise<{ isRapidFire: boolean; orderCount: number }> {
  const cutoff = new Date(Date.now() - timeWindowSeconds * 1000);

  const orderCount = await prisma.order.count({
    where: {
      userId,
      createdAt: { gte: cutoff },
    },
  });

  const isRapidFire = orderCount > threshold;

  if (isRapidFire) {
    // Flag user and create risk event
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
        detectionRule: `ORDERS_PER_${timeWindowSeconds}_SEC > ${threshold}`,
        triggerData: { orderCount, timeWindowSeconds },
        actionTaken: 'HALT_USER',
      },
    });
  }

  return { isRapidFire, orderCount };
}

async function updateTradeVelocity(marketId: string): Promise<void> {
  const twoSecondsAgo = new Date(Date.now() - 2000);

  const tradesLast2Sec = await prisma.trade.count({
    where: {
      marketId,
      executedAt: { gte: twoSecondsAgo },
    },
  });

  // Get current multiplier
  const state = await prisma.marketLiquidityState.findUnique({
    where: { marketId },
  });

  let newMultiplier = state?.spreadMultiplier || 1.0;
  let spreadReason = 'NORMAL';

  if (tradesLast2Sec >= TRADING_CONFIG.TOXIC_FLOW_THRESHOLD) {
    // Toxic flow: widen spread by 300%
    newMultiplier = TRADING_CONFIG.TOXIC_SPREAD_MULTIPLIER;
    spreadReason = 'TOXIC_FLOW_HALT';

    // Log risk event
    await prisma.riskEvent.create({
      data: {
        eventType: 'TOXIC_FLOW',
        severity: 'high',
        marketId,
        detectionRule: 'TRADES_PER_2_SEC >= 10',
        triggerData: { tradesCount: tradesLast2Sec },
        actionTaken: 'SPREAD_WIDEN',
        actionDetails: { multiplier: newMultiplier },
      },
    });
  } else if (tradesLast2Sec >= 5) {
    // Elevated: moderate widening
    newMultiplier = 2.0;
    spreadReason = 'HIGH_VOLATILITY';
  } else {
    // Normal: gradually reduce
    newMultiplier = Math.max(1.0, newMultiplier * 0.9);
    spreadReason = 'NORMAL';
  }

  await prisma.marketLiquidityState.update({
    where: { marketId },
    data: {
      tradesLast2Sec,
      lastTradeAt: new Date(),
      spreadMultiplier: newMultiplier,
      spreadReason,
    },
  });
}

// ============================================================================
// USER POSITION QUERIES
// ============================================================================

export async function getUserPositions(userId: string) {
  return prisma.position.findMany({
    where: { userId, quantityCents: { gt: 0 } },
    include: {
      market: {
        select: { id: true, title: true, status: true, currentYesPrice: true, currentNoPrice: true },
      },
      outcome: {
        select: { id: true, label: true, currentPriceCents: true },
      },
    },
  });
}

export async function getUserOrders(userId: string, status?: OrderStatus[]) {
  return prisma.order.findMany({
    where: {
      userId,
      status: status ? { in: status } : undefined,
    },
    include: {
      market: { select: { id: true, title: true } },
      outcome: { select: { id: true, label: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getUserTrades(userId: string, limit: number = 50) {
  return prisma.trade.findMany({
    where: {
      OR: [{ buyerId: userId }, { sellerId: userId }],
    },
    include: {
      market: { select: { id: true, title: true } },
      outcome: { select: { id: true, label: true } },
    },
    orderBy: { executedAt: 'desc' },
    take: limit,
  });
}
