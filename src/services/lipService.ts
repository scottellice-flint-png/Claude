// ============================================================================
// LIP SERVICE - Liquidity Incentive Program
// Tracks Time-Weighted Liquidity (TWL) for rebate calculations
// ============================================================================

import prisma from '@/lib/prisma';
import { writeAuditEvent } from './auditEventService';

// ============================================================================
// TYPES
// ============================================================================

export interface TWLCalculation {
  userId: string;
  marketId: string;
  periodStart: Date;
  periodEnd: Date;
  twlPoints: bigint;
  timeInSpreadMs: bigint;
  totalTimeMs: bigint;
  ordersTracked: number;
  midPriceCents: number;
  spreadThresholdCents: number;
}

export interface LiquidityRewardSummary {
  userId: string;
  totalTwlPoints: bigint;
  totalRebateEarnedCents: number;
  totalRebatePaidCents: number;
  pendingRebateCents: number;
  activePeriods: number;
}

export interface LiquidityLeaderboardEntry {
  userId: string;
  username: string;
  twlPoints: bigint;
  rebateEarnedCents: number;
  rank: number;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const LIP_CONFIG = {
  // Orders must be within this percentage of mid-price to earn points
  SPREAD_THRESHOLD_PERCENT: 2,

  // Points per cent-millisecond of liquidity provided
  POINTS_PER_CENT_MS: 1,

  // Rebate rate: cents per million TWL points
  REBATE_RATE_CENTS_PER_MILLION: 100, // $1 per million points

  // Minimum points to qualify for rebate
  MIN_POINTS_FOR_REBATE: 1000000,

  // Snapshot interval for TWL calculation
  SNAPSHOT_INTERVAL_MS: 60000, // 1 minute

  // Period duration
  PERIOD_DURATION_HOURS: 24,
};

// ============================================================================
// TWL CALCULATION
// ============================================================================

/**
 * Calculate Time-Weighted Liquidity points for a user/market/period
 * TWL = sum of (order_quantity * time_in_spread)
 *
 * Orders qualify if they are limit orders within 2% of mid-price
 */
export async function calculateTWL(
  userId: string,
  marketId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<TWLCalculation> {
  // Get current mid price from liquidity state
  const liquidityState = await prisma.marketLiquidityState.findUnique({
    where: { marketId },
  });

  const midPriceCents = liquidityState?.midPriceCents || 50;

  // Calculate spread threshold (2% of mid price, minimum 1 cent)
  const spreadThresholdCents = Math.max(1, Math.floor(midPriceCents * LIP_CONFIG.SPREAD_THRESHOLD_PERCENT / 100));

  // Get all qualifying limit orders for this user/market in the period
  const orders = await prisma.order.findMany({
    where: {
      userId,
      marketId,
      orderType: 'limit',
      status: { in: ['open', 'partial', 'filled', 'cancelled'] },
      createdAt: { lt: periodEnd },
      OR: [
        { filledAt: null },
        { filledAt: { gt: periodStart } },
        { cancelledAt: null },
        { cancelledAt: { gt: periodStart } },
      ],
    },
  });

  let totalTwlPoints = BigInt(0);
  let timeInSpreadMs = BigInt(0);
  let totalTimeMs = BigInt(0);
  let ordersTracked = 0;

  for (const order of orders) {
    // Calculate order duration within the period
    const orderStart = order.createdAt > periodStart ? order.createdAt : periodStart;
    const orderEnd = order.filledAt || order.cancelledAt || periodEnd;
    const effectiveEnd = orderEnd < periodEnd ? orderEnd : periodEnd;

    if (effectiveEnd <= orderStart) continue;

    const durationMs = effectiveEnd.getTime() - orderStart.getTime();
    totalTimeMs += BigInt(durationMs);

    // Check if order is within spread threshold
    const priceDistance = Math.abs(order.priceCents - midPriceCents);

    if (priceDistance <= spreadThresholdCents) {
      // Order qualifies for TWL points
      // TWL = quantity * time (in milliseconds)
      const orderTwl = BigInt(order.remainingCents) * BigInt(durationMs);
      totalTwlPoints += orderTwl;
      timeInSpreadMs += BigInt(durationMs);
    }

    ordersTracked++;
  }

  return {
    userId,
    marketId,
    periodStart,
    periodEnd,
    twlPoints: totalTwlPoints,
    timeInSpreadMs,
    totalTimeMs,
    ordersTracked,
    midPriceCents,
    spreadThresholdCents,
  };
}

/**
 * Run the LIP tracker for all active markets
 * This should be called periodically (e.g., every minute) by a background worker
 */
export async function runLIPTracker(): Promise<{
  marketsProcessed: number;
  usersProcessed: number;
  totalPointsAwarded: bigint;
}> {
  // Get all published markets
  const markets = await prisma.market.findMany({
    where: { status: 'published' },
    select: { id: true },
  });

  // Define the current tracking period
  const now = new Date();
  const periodStart = new Date(now.getTime() - LIP_CONFIG.SNAPSHOT_INTERVAL_MS);
  const periodEnd = now;

  // Get all users with open orders
  const usersWithOrders = await prisma.order.groupBy({
    by: ['userId', 'marketId'],
    where: {
      status: { in: ['open', 'partial'] },
      orderType: 'limit',
    },
  });

  let usersProcessed = 0;
  let totalPointsAwarded = BigInt(0);

  // Calculate TWL for each user/market combination
  for (const { userId, marketId } of usersWithOrders) {
    const twl = await calculateTWL(userId, marketId, periodStart, periodEnd);

    if (twl.twlPoints > BigInt(0)) {
      // Update or create liquidity reward record
      const existingReward = await prisma.liquidityReward.findFirst({
        where: {
          userId,
          marketId,
          periodStart: { gte: new Date(now.getTime() - LIP_CONFIG.PERIOD_DURATION_HOURS * 60 * 60 * 1000) },
          status: 'active',
        },
      });

      if (existingReward) {
        // Accumulate points
        await prisma.liquidityReward.update({
          where: { id: existingReward.id },
          data: {
            twlPoints: { increment: twl.twlPoints },
            timeInSpreadMs: { increment: twl.timeInSpreadMs },
            totalOrdersTracked: { increment: twl.ordersTracked },
            avgLiquidityCents: twl.twlPoints / BigInt(Math.max(1, Number(twl.timeInSpreadMs) / 1000)),
          },
        });
      } else {
        // Create new reward record for this period
        await prisma.liquidityReward.create({
          data: {
            userId,
            marketId,
            periodStart,
            periodEnd: new Date(periodStart.getTime() + LIP_CONFIG.PERIOD_DURATION_HOURS * 60 * 60 * 1000),
            twlPoints: twl.twlPoints,
            timeInSpreadMs: twl.timeInSpreadMs,
            totalOrdersTracked: twl.ordersTracked,
            avgLiquidityCents: twl.twlPoints / BigInt(Math.max(1, Number(twl.timeInSpreadMs) / 1000)),
            status: 'active',
          },
        });
      }

      totalPointsAwarded += twl.twlPoints;
      usersProcessed++;
    }
  }

  return {
    marketsProcessed: markets.length,
    usersProcessed,
    totalPointsAwarded,
  };
}

// ============================================================================
// REBATE CALCULATION & PAYMENT
// ============================================================================

/**
 * Calculate rebates for completed periods
 */
export async function calculatePeriodRebates(): Promise<{
  periodsProcessed: number;
  totalRebatesCents: number;
}> {
  // Find active periods that have ended
  const now = new Date();
  const completedPeriods = await prisma.liquidityReward.findMany({
    where: {
      status: 'active',
      periodEnd: { lte: now },
    },
  });

  let periodsProcessed = 0;
  let totalRebatesCents = 0;

  for (const reward of completedPeriods) {
    // Check minimum threshold
    if (reward.twlPoints < BigInt(LIP_CONFIG.MIN_POINTS_FOR_REBATE)) {
      await prisma.liquidityReward.update({
        where: { id: reward.id },
        data: { status: 'calculated', rebateEarnedCents: 0 },
      });
      continue;
    }

    // Calculate rebate: cents per million points
    const rebateCents = Math.floor(
      Number(reward.twlPoints / BigInt(1000000)) * LIP_CONFIG.REBATE_RATE_CENTS_PER_MILLION
    );

    await prisma.liquidityReward.update({
      where: { id: reward.id },
      data: {
        status: 'calculated',
        rebateEarnedCents: rebateCents,
      },
    });

    totalRebatesCents += rebateCents;
    periodsProcessed++;
  }

  return { periodsProcessed, totalRebatesCents };
}

/**
 * Pay out calculated rebates
 */
export async function payRebates(): Promise<{
  usersPayd: number;
  totalPaidCents: number;
}> {
  // Get all calculated rebates that haven't been paid
  const unpaidRebates = await prisma.liquidityReward.findMany({
    where: {
      status: 'calculated',
      rebateEarnedCents: { gt: 0 },
      rebatePaidAt: null,
    },
  });

  let usersPayd = 0;
  let totalPaidCents = 0;

  for (const reward of unpaidRebates) {
    await prisma.$transaction(async (tx) => {
      // Credit user balance
      await tx.user.update({
        where: { id: reward.userId },
        data: {
          balanceCents: { increment: reward.rebateEarnedCents },
        },
      });

      // Mark as paid
      await tx.liquidityReward.update({
        where: { id: reward.id },
        data: {
          status: 'paid',
          rebatePaidAt: new Date(),
        },
      });
    });

    // Log audit event
    await writeAuditEvent({
      eventType: 'COMMISSION_APPLIED',
      actorType: 'system',
      actorId: reward.userId,
      marketId: reward.marketId,
      reasonCode: 'LIP_REBATE',
      metadata: {
        twlPoints: reward.twlPoints.toString(),
        rebateCents: reward.rebateEarnedCents,
        periodStart: reward.periodStart.toISOString(),
        periodEnd: reward.periodEnd.toISOString(),
      },
    });

    totalPaidCents += reward.rebateEarnedCents;
    usersPayd++;
  }

  return { usersPayd, totalPaidCents };
}

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get user's liquidity reward summary
 */
export async function getUserLiquidityRewards(userId: string): Promise<LiquidityRewardSummary> {
  const rewards = await prisma.liquidityReward.findMany({
    where: { userId },
  });

  let totalTwlPoints = BigInt(0);
  let totalRebateEarnedCents = 0;
  let totalRebatePaidCents = 0;
  let activePeriods = 0;

  for (const reward of rewards) {
    totalTwlPoints += reward.twlPoints;
    totalRebateEarnedCents += reward.rebateEarnedCents;

    if (reward.status === 'paid') {
      totalRebatePaidCents += reward.rebateEarnedCents;
    }

    if (reward.status === 'active') {
      activePeriods++;
    }
  }

  return {
    userId,
    totalTwlPoints,
    totalRebateEarnedCents,
    totalRebatePaidCents,
    pendingRebateCents: totalRebateEarnedCents - totalRebatePaidCents,
    activePeriods,
  };
}

/**
 * Get LIP leaderboard
 */
export async function getLIPLeaderboard(
  periodStart?: Date,
  limit: number = 100
): Promise<LiquidityLeaderboardEntry[]> {
  const where: Record<string, unknown> = {};
  if (periodStart) {
    where.periodStart = { gte: periodStart };
  }

  // Aggregate TWL points by user
  const aggregated = await prisma.liquidityReward.groupBy({
    by: ['userId'],
    where,
    _sum: {
      twlPoints: true,
      rebateEarnedCents: true,
    },
    orderBy: {
      _sum: {
        twlPoints: 'desc',
      },
    },
    take: limit,
  });

  // Get user details
  const userIds = aggregated.map(a => a.userId);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, username: true },
  });

  const userMap = new Map(users.map(u => [u.id, u]));

  return aggregated.map((entry, index) => ({
    userId: entry.userId,
    username: userMap.get(entry.userId)?.username || 'Unknown',
    twlPoints: entry._sum.twlPoints || BigInt(0),
    rebateEarnedCents: entry._sum.rebateEarnedCents || 0,
    rank: index + 1,
  }));
}

/**
 * Get market's liquidity providers
 */
export async function getMarketLiquidityProviders(
  marketId: string,
  periodStart?: Date
): Promise<{
  userId: string;
  username: string;
  twlPoints: bigint;
  percentOfTotal: number;
}[]> {
  const where: Record<string, unknown> = { marketId };
  if (periodStart) {
    where.periodStart = { gte: periodStart };
  }

  const aggregated = await prisma.liquidityReward.groupBy({
    by: ['userId'],
    where,
    _sum: { twlPoints: true },
    orderBy: { _sum: { twlPoints: 'desc' } },
  });

  const totalPoints = aggregated.reduce(
    (sum, a) => sum + (a._sum.twlPoints || BigInt(0)),
    BigInt(0)
  );

  const userIds = aggregated.map(a => a.userId);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, username: true },
  });

  const userMap = new Map(users.map(u => [u.id, u]));

  return aggregated.map(entry => {
    const points = entry._sum.twlPoints || BigInt(0);
    return {
      userId: entry.userId,
      username: userMap.get(entry.userId)?.username || 'Unknown',
      twlPoints: points,
      percentOfTotal: totalPoints > BigInt(0)
        ? Number((points * BigInt(10000)) / totalPoints) / 100
        : 0,
    };
  });
}

// ============================================================================
// BACKGROUND WORKER
// ============================================================================

/**
 * Main LIP background worker function
 * Should be called every minute
 */
export async function lipBackgroundWorker(): Promise<void> {
  try {
    // Track current liquidity
    await runLIPTracker();

    // Calculate rebates for completed periods
    await calculatePeriodRebates();

    // Pay out rebates
    await payRebates();
  } catch (error) {
    console.error('LIP background worker error:', error);
    throw error;
  }
}
