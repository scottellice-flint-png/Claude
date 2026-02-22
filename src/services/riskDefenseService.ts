// ============================================================================
// RISK DEFENSE SERVICE - Anti-Sharp & Toxic Flow Detection
// Protects against latency arbitrage, toxic flow, and coordinated attacks
// ============================================================================

import prisma from '@/lib/prisma';
import { writeAuditEvent } from './auditEventService';

// ============================================================================
// TYPES
// ============================================================================

export type RiskEventType =
  | 'TOXIC_FLOW'
  | 'IP_CLUSTER'
  | 'RAPID_FIRE'
  | 'INVENTORY_SKEW'
  | 'LATENCY_ARB'
  | 'COORDINATED_ATTACK'
  | 'WASH_TRADING'
  | 'SPOOFING';

export type RiskSeverity = 'low' | 'medium' | 'high' | 'critical';

export type RiskAction =
  | 'ALERT_ONLY'
  | 'SPREAD_WIDEN'
  | 'HALT_USER'
  | 'HALT_MARKET'
  | 'REJECT_ORDER'
  | 'CANCEL_ORDERS';

export interface RiskCheck {
  passed: boolean;
  eventType?: RiskEventType;
  severity?: RiskSeverity;
  details?: Record<string, unknown>;
  recommendedAction?: RiskAction;
}

export interface RiskEventSummary {
  id: string;
  eventType: RiskEventType;
  severity: RiskSeverity;
  userId: string | null;
  marketId: string | null;
  ipAddress: string | null;
  actionTaken: string | null;
  status: string;
  createdAt: Date;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const RISK_CONFIG = {
  // Toxic flow detection
  TOXIC_TRADES_THRESHOLD: 10,
  TOXIC_TIME_WINDOW_MS: 2000,
  TOXIC_SPREAD_MULTIPLIER: 3.0,

  // Rapid fire detection
  RAPID_FIRE_THRESHOLD: 5,
  RAPID_FIRE_TIME_WINDOW_SEC: 10,

  // IP cluster detection
  IP_CLUSTER_USERS_THRESHOLD: 2,
  IP_CLUSTER_ORDERS_THRESHOLD: 20,
  IP_CLUSTER_TIME_WINDOW_MIN: 5,

  // Latency arbitrage detection
  LATENCY_ARB_FILL_RATE_THRESHOLD: 0.9, // 90% fill rate suspicious
  LATENCY_ARB_AVG_FILL_TIME_MS: 10,     // < 10ms average fill time suspicious

  // Coordinated attack detection
  COORDINATED_PRICE_MOVE_THRESHOLD: 10, // 10% price move
  COORDINATED_TIME_WINDOW_SEC: 60,
  COORDINATED_USERS_THRESHOLD: 3,

  // Wash trading detection
  WASH_TRADE_SELF_MATCH_THRESHOLD: 5, // 5 self-matches in a day

  // Spoofing detection
  SPOOF_CANCEL_RATE_THRESHOLD: 0.8, // 80% cancel rate
  SPOOF_ORDER_COUNT_THRESHOLD: 20,
  SPOOF_TIME_WINDOW_MIN: 30,

  // User risk scoring
  RISK_SCORE_INCREMENT: 10,
  RISK_SCORE_MAX: 100,
  RISK_SCORE_FLAG_THRESHOLD: 50,
  RISK_SCORE_BAN_THRESHOLD: 80,
};

// ============================================================================
// TOXIC FLOW DETECTION
// Detects rapid trading that could indicate toxic/informed flow
// ============================================================================

export async function detectToxicFlow(marketId: string): Promise<RiskCheck> {
  const cutoff = new Date(Date.now() - RISK_CONFIG.TOXIC_TIME_WINDOW_MS);

  const recentTrades = await prisma.trade.count({
    where: {
      marketId,
      executedAt: { gte: cutoff },
    },
  });

  if (recentTrades >= RISK_CONFIG.TOXIC_TRADES_THRESHOLD) {
    // Log risk event
    await prisma.riskEvent.create({
      data: {
        eventType: 'TOXIC_FLOW',
        severity: 'high',
        marketId,
        detectionRule: `TRADES_PER_${RISK_CONFIG.TOXIC_TIME_WINDOW_MS}MS >= ${RISK_CONFIG.TOXIC_TRADES_THRESHOLD}`,
        triggerData: JSON.stringify({ tradesCount: recentTrades }),
        tradesAffected: recentTrades,
        actionTaken: 'SPREAD_WIDEN',
        actionDetails: JSON.stringify({ multiplier: RISK_CONFIG.TOXIC_SPREAD_MULTIPLIER }),
      },
    });

    // Widen spread
    await prisma.marketLiquidityState.update({
      where: { marketId },
      data: {
        spreadMultiplier: RISK_CONFIG.TOXIC_SPREAD_MULTIPLIER,
        spreadReason: 'TOXIC_FLOW_HALT',
      },
    });

    return {
      passed: false,
      eventType: 'TOXIC_FLOW',
      severity: 'high',
      details: { tradesCount: recentTrades, threshold: RISK_CONFIG.TOXIC_TRADES_THRESHOLD },
      recommendedAction: 'SPREAD_WIDEN',
    };
  }

  return { passed: true };
}

// ============================================================================
// RAPID FIRE DETECTION
// Detects users placing too many orders in a short time
// ============================================================================

export async function detectRapidFire(userId: string): Promise<RiskCheck> {
  const cutoff = new Date(Date.now() - RISK_CONFIG.RAPID_FIRE_TIME_WINDOW_SEC * 1000);

  const recentOrders = await prisma.order.count({
    where: {
      userId,
      createdAt: { gte: cutoff },
    },
  });

  if (recentOrders > RISK_CONFIG.RAPID_FIRE_THRESHOLD) {
    // Flag user
    await prisma.user.update({
      where: { id: userId },
      data: {
        riskScore: { increment: RISK_CONFIG.RISK_SCORE_INCREMENT },
        isFlagged: true,
        flagReason: 'RAPID_FIRE_ORDERS',
      },
    });

    // Log risk event
    await prisma.riskEvent.create({
      data: {
        eventType: 'RAPID_FIRE',
        severity: 'high',
        userId,
        detectionRule: `ORDERS_PER_${RISK_CONFIG.RAPID_FIRE_TIME_WINDOW_SEC}_SEC > ${RISK_CONFIG.RAPID_FIRE_THRESHOLD}`,
        triggerData: JSON.stringify({ orderCount: recentOrders }),
        actionTaken: 'HALT_USER',
      },
    });

    await writeAuditEvent({
      eventType: 'ADMIN_USER_DEACTIVATED',
      actorType: 'system',
      actorId: userId,
      reasonCode: 'RAPID_FIRE_DETECTED',
      metadata: { orderCount: recentOrders },
    });

    return {
      passed: false,
      eventType: 'RAPID_FIRE',
      severity: 'high',
      details: { orderCount: recentOrders, threshold: RISK_CONFIG.RAPID_FIRE_THRESHOLD },
      recommendedAction: 'HALT_USER',
    };
  }

  return { passed: true };
}

// ============================================================================
// IP CLUSTER DETECTION
// Detects multiple users trading from the same IP
// ============================================================================

export async function detectIPCluster(
  ipAddress: string,
  currentUserId: string
): Promise<RiskCheck> {
  const cutoff = new Date(Date.now() - RISK_CONFIG.IP_CLUSTER_TIME_WINDOW_MIN * 60 * 1000);

  // Count orders and unique users from this IP
  const ordersFromIP = await prisma.order.groupBy({
    by: ['userId'],
    where: {
      ipAddress,
      createdAt: { gte: cutoff },
    },
    _count: { id: true },
  });

  const uniqueUsers = ordersFromIP.length;
  const totalOrders = ordersFromIP.reduce((sum, o) => sum + o._count.id, 0);

  if (uniqueUsers >= RISK_CONFIG.IP_CLUSTER_USERS_THRESHOLD &&
      totalOrders >= RISK_CONFIG.IP_CLUSTER_ORDERS_THRESHOLD) {
    // Log risk event
    await prisma.riskEvent.create({
      data: {
        eventType: 'IP_CLUSTER',
        severity: 'medium',
        userId: currentUserId,
        ipAddress,
        detectionRule: 'MULTIPLE_USERS_SAME_IP',
        triggerData: JSON.stringify({
          uniqueUsers,
          totalOrders,
          timeWindowMin: RISK_CONFIG.IP_CLUSTER_TIME_WINDOW_MIN,
        }),
        actionTaken: 'ALERT_ONLY',
      },
    });

    // Flag all users from this IP for review
    const userIds = ordersFromIP.map(o => o.userId);
    await prisma.user.updateMany({
      where: { id: { in: userIds } },
      data: {
        riskScore: { increment: RISK_CONFIG.RISK_SCORE_INCREMENT / 2 },
      },
    });

    return {
      passed: false,
      eventType: 'IP_CLUSTER',
      severity: 'medium',
      details: { uniqueUsers, totalOrders, ipAddress },
      recommendedAction: 'ALERT_ONLY',
    };
  }

  return { passed: true };
}

// ============================================================================
// LATENCY ARBITRAGE DETECTION
// Detects users with suspiciously fast fill rates
// ============================================================================

export async function detectLatencyArbitrage(userId: string): Promise<RiskCheck> {
  // Get user's recent trades
  const recentTrades = await prisma.trade.findMany({
    where: {
      OR: [{ buyerId: userId }, { sellerId: userId }],
      executedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
    include: {
      buyOrder: { select: { createdAt: true } },
      sellOrder: { select: { createdAt: true } },
    },
  });

  if (recentTrades.length < 10) {
    return { passed: true }; // Not enough data
  }

  // Calculate fill times
  const fillTimes = recentTrades.map(trade => {
    const orderTime = trade.buyerId === userId
      ? trade.buyOrder.createdAt.getTime()
      : trade.sellOrder.createdAt.getTime();
    return trade.executedAt.getTime() - orderTime;
  });

  const avgFillTime = fillTimes.reduce((a, b) => a + b, 0) / fillTimes.length;

  // Get user's orders to calculate fill rate
  const totalOrders = await prisma.order.count({
    where: {
      userId,
      createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
  });

  const filledOrders = await prisma.order.count({
    where: {
      userId,
      status: 'filled',
      createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
  });

  const fillRate = totalOrders > 0 ? filledOrders / totalOrders : 0;

  if (fillRate >= RISK_CONFIG.LATENCY_ARB_FILL_RATE_THRESHOLD &&
      avgFillTime <= RISK_CONFIG.LATENCY_ARB_AVG_FILL_TIME_MS) {
    await prisma.riskEvent.create({
      data: {
        eventType: 'LATENCY_ARB',
        severity: 'critical',
        userId,
        detectionRule: 'HIGH_FILL_RATE_LOW_LATENCY',
        triggerData: JSON.stringify({
          fillRate,
          avgFillTimeMs: avgFillTime,
          totalOrders,
          filledOrders,
        }),
        actionTaken: 'HALT_USER',
      },
    });

    // Flag user
    await prisma.user.update({
      where: { id: userId },
      data: {
        riskScore: { increment: RISK_CONFIG.RISK_SCORE_INCREMENT * 3 },
        isFlagged: true,
        flagReason: 'LATENCY_ARBITRAGE_SUSPECTED',
      },
    });

    return {
      passed: false,
      eventType: 'LATENCY_ARB',
      severity: 'critical',
      details: { fillRate, avgFillTimeMs: avgFillTime },
      recommendedAction: 'HALT_USER',
    };
  }

  return { passed: true };
}

// ============================================================================
// WASH TRADING DETECTION
// Detects users trading with themselves
// ============================================================================

export async function detectWashTrading(userId: string): Promise<RiskCheck> {
  // Note: Our system prevents self-trading in the matching engine,
  // but we check for users trading between linked accounts

  // Get user's IP addresses
  const userOrders = await prisma.order.findMany({
    where: {
      userId,
      createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
    select: { ipAddress: true },
  });

  const userIPs = [...new Set(userOrders.map(o => o.ipAddress).filter(Boolean))];

  if (userIPs.length === 0) {
    return { passed: true };
  }

  // Find other users who traded from same IPs
  const otherUsersOrders = await prisma.order.findMany({
    where: {
      ipAddress: { in: userIPs as string[] },
      userId: { not: userId },
      createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
    select: { userId: true },
  });

  const relatedUserIds = [...new Set(otherUsersOrders.map(o => o.userId))];

  // Check for trades between user and related users
  const crossTrades = await prisma.trade.count({
    where: {
      OR: [
        { buyerId: userId, sellerId: { in: relatedUserIds } },
        { sellerId: userId, buyerId: { in: relatedUserIds } },
      ],
      executedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
  });

  if (crossTrades >= RISK_CONFIG.WASH_TRADE_SELF_MATCH_THRESHOLD) {
    await prisma.riskEvent.create({
      data: {
        eventType: 'WASH_TRADING',
        severity: 'critical',
        userId,
        detectionRule: 'CROSS_TRADES_SAME_IP',
        triggerData: JSON.stringify({
          crossTrades,
          relatedUsers: relatedUserIds.length,
          sharedIPs: userIPs,
        }),
        actionTaken: 'HALT_USER',
      },
    });

    // Flag all related users
    await prisma.user.updateMany({
      where: { id: { in: [userId, ...relatedUserIds] } },
      data: {
        riskScore: { increment: RISK_CONFIG.RISK_SCORE_INCREMENT * 5 },
        isFlagged: true,
        flagReason: 'WASH_TRADING_SUSPECTED',
      },
    });

    return {
      passed: false,
      eventType: 'WASH_TRADING',
      severity: 'critical',
      details: { crossTrades, relatedUsers: relatedUserIds.length },
      recommendedAction: 'HALT_USER',
    };
  }

  return { passed: true };
}

// ============================================================================
// SPOOFING DETECTION
// Detects users placing and quickly cancelling orders
// ============================================================================

export async function detectSpoofing(userId: string): Promise<RiskCheck> {
  const cutoff = new Date(Date.now() - RISK_CONFIG.SPOOF_TIME_WINDOW_MIN * 60 * 1000);

  // Get user's recent orders
  const orders = await prisma.order.findMany({
    where: {
      userId,
      createdAt: { gte: cutoff },
    },
    select: { id: true, status: true },
  });

  if (orders.length < RISK_CONFIG.SPOOF_ORDER_COUNT_THRESHOLD) {
    return { passed: true }; // Not enough activity
  }

  const cancelledOrders = orders.filter(o => o.status === 'cancelled').length;
  const cancelRate = cancelledOrders / orders.length;

  if (cancelRate >= RISK_CONFIG.SPOOF_CANCEL_RATE_THRESHOLD) {
    await prisma.riskEvent.create({
      data: {
        eventType: 'SPOOFING',
        severity: 'high',
        userId,
        detectionRule: 'HIGH_CANCEL_RATE',
        triggerData: JSON.stringify({
          totalOrders: orders.length,
          cancelledOrders,
          cancelRate,
        }),
        actionTaken: 'HALT_USER',
      },
    });

    await prisma.user.update({
      where: { id: userId },
      data: {
        riskScore: { increment: RISK_CONFIG.RISK_SCORE_INCREMENT * 2 },
        isFlagged: true,
        flagReason: 'SPOOFING_SUSPECTED',
      },
    });

    return {
      passed: false,
      eventType: 'SPOOFING',
      severity: 'high',
      details: { cancelRate, totalOrders: orders.length },
      recommendedAction: 'HALT_USER',
    };
  }

  return { passed: true };
}

// ============================================================================
// COMPREHENSIVE RISK CHECK
// Runs all risk checks for a user
// ============================================================================

export async function runComprehensiveRiskCheck(
  userId: string,
  ipAddress?: string
): Promise<{
  allPassed: boolean;
  checks: RiskCheck[];
}> {
  const checks: RiskCheck[] = [];

  // Run all checks
  checks.push(await detectRapidFire(userId));
  checks.push(await detectLatencyArbitrage(userId));
  checks.push(await detectWashTrading(userId));
  checks.push(await detectSpoofing(userId));

  if (ipAddress) {
    checks.push(await detectIPCluster(ipAddress, userId));
  }

  const allPassed = checks.every(c => c.passed);

  return { allPassed, checks };
}

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get recent risk events
 */
export async function getRecentRiskEvents(
  filters: {
    eventType?: RiskEventType;
    severity?: RiskSeverity;
    userId?: string;
    marketId?: string;
    status?: string;
  },
  limit: number = 100
): Promise<RiskEventSummary[]> {
  const where: Record<string, unknown> = {};

  if (filters.eventType) where.eventType = filters.eventType;
  if (filters.severity) where.severity = filters.severity;
  if (filters.userId) where.userId = filters.userId;
  if (filters.marketId) where.marketId = filters.marketId;
  if (filters.status) where.status = filters.status;

  const events = await prisma.riskEvent.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return events.map(e => ({
    id: e.id,
    eventType: e.eventType as RiskEventType,
    severity: e.severity as RiskSeverity,
    userId: e.userId,
    marketId: e.marketId,
    ipAddress: e.ipAddress,
    actionTaken: e.actionTaken,
    status: e.status,
    createdAt: e.createdAt,
  }));
}

/**
 * Get user risk profile
 */
export async function getUserRiskProfile(userId: string): Promise<{
  userId: string;
  riskScore: number;
  isFlagged: boolean;
  flagReason: string | null;
  recentEvents: RiskEventSummary[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { riskScore: true, isFlagged: true, flagReason: true },
  });

  if (!user) {
    throw new Error('User not found');
  }

  const recentEvents = await getRecentRiskEvents({ userId }, 10);

  let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
  if (user.riskScore >= RISK_CONFIG.RISK_SCORE_BAN_THRESHOLD) {
    riskLevel = 'critical';
  } else if (user.riskScore >= RISK_CONFIG.RISK_SCORE_FLAG_THRESHOLD) {
    riskLevel = 'high';
  } else if (user.riskScore >= RISK_CONFIG.RISK_SCORE_INCREMENT * 2) {
    riskLevel = 'medium';
  }

  return {
    userId,
    riskScore: user.riskScore,
    isFlagged: user.isFlagged,
    flagReason: user.flagReason,
    recentEvents,
    riskLevel,
  };
}

/**
 * Resolve a risk event
 */
export async function resolveRiskEvent(
  eventId: string,
  adminId: string,
  resolution: 'false_positive' | 'resolved',
  notes?: string
): Promise<{ success: boolean }> {
  await prisma.riskEvent.update({
    where: { id: eventId },
    data: {
      status: resolution,
      resolvedAt: new Date(),
      resolvedById: adminId,
      resolutionNotes: notes,
    },
  });

  return { success: true };
}

// ============================================================================
// BACKGROUND WORKER
// ============================================================================

/**
 * Risk defense background worker
 * Runs periodic risk checks on active markets and users
 */
export async function riskDefenseBackgroundWorker(): Promise<{
  marketsChecked: number;
  usersChecked: number;
  eventsGenerated: number;
}> {
  let eventsGenerated = 0;

  // Check all published markets for toxic flow
  const markets = await prisma.market.findMany({
    where: { status: 'published' },
    select: { id: true },
  });

  for (const market of markets) {
    const check = await detectToxicFlow(market.id);
    if (!check.passed) eventsGenerated++;
  }

  // Check recently active users
  const recentlyActiveUsers = await prisma.order.groupBy({
    by: ['userId'],
    where: {
      createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
    },
  });

  for (const { userId } of recentlyActiveUsers) {
    const { checks } = await runComprehensiveRiskCheck(userId);
    eventsGenerated += checks.filter(c => !c.passed).length;
  }

  return {
    marketsChecked: markets.length,
    usersChecked: recentlyActiveUsers.length,
    eventsGenerated,
  };
}
