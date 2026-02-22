// ============================================================================
// DMM SERVICE - Designated Market Maker Framework
// Monitors uptime, spread consistency, and manages DMM registrations
// ============================================================================

import prisma from '@/lib/prisma';
import { writeAuditEvent } from './auditEventService';

// ============================================================================
// TYPES
// ============================================================================

export type DMMStatus = 'pending' | 'active' | 'suspended' | 'terminated';
export type DMMTier = 'standard' | 'premium' | 'institutional';
export type ComplianceStatus = 'pending' | 'compliant' | 'warning' | 'violation';

export interface DMMRegistrationInput {
  userId: string;
  tier?: DMMTier;
  minUptimePercent?: number;
  maxSpreadCents?: number;
  minLiquidityCents?: bigint;
}

export interface DMMMetricsSnapshot {
  userId: string;
  marketId: string;
  periodStart: Date;
  periodEnd: Date;
  uptimeMs: bigint;
  downtimeMs: bigint;
  uptimePercent: number;
  avgSpreadCents: number;
  maxSpreadCents: number;
  minSpreadCents: number;
  spreadViolations: number;
  volumeProvidedCents: bigint;
  tradesMatched: number;
  meetsRequirements: boolean;
}

export interface DMMPerformanceReport {
  userId: string;
  registrationStatus: DMMStatus;
  tier: DMMTier;
  complianceStatus: ComplianceStatus;
  overallUptimePercent: number;
  avgSpreadCents: number;
  totalVolumeProvidedCents: bigint;
  totalTradesMatched: number;
  warningCount: number;
  markets: {
    marketId: string;
    marketTitle: string;
    uptimePercent: number;
    avgSpreadCents: number;
    meetsRequirements: boolean;
  }[];
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const DMM_CONFIG = {
  // Default requirements by tier
  TIERS: {
    standard: {
      minUptimePercent: 90,
      maxSpreadCents: 15,
      minLiquidityCents: BigInt(50000), // $500
      apiRateLimit: 100, // requests per second
    },
    premium: {
      minUptimePercent: 95,
      maxSpreadCents: 10,
      minLiquidityCents: BigInt(100000), // $1,000
      apiRateLimit: 0, // no limit
    },
    institutional: {
      minUptimePercent: 99,
      maxSpreadCents: 5,
      minLiquidityCents: BigInt(500000), // $5,000
      apiRateLimit: 0, // no limit
    },
  },

  // Monitoring intervals
  SNAPSHOT_INTERVAL_MS: 60000, // 1 minute
  COMPLIANCE_CHECK_INTERVAL_MS: 3600000, // 1 hour

  // Warning thresholds
  WARNING_THRESHOLD_VIOLATIONS: 3,
  SUSPENSION_THRESHOLD_VIOLATIONS: 10,

  // Grace periods
  DOWNTIME_GRACE_PERIOD_MS: 300000, // 5 minutes grace
};

// ============================================================================
// REGISTRATION MANAGEMENT
// ============================================================================

/**
 * Register a user as a Designated Market Maker
 */
export async function registerDMM(
  input: DMMRegistrationInput,
  approvedById?: string
): Promise<{ success: boolean; registrationId?: string; error?: string }> {
  // Check if already registered
  const existing = await prisma.dMMRegistration.findUnique({
    where: { userId: input.userId },
  });

  if (existing && existing.status !== 'terminated') {
    return { success: false, error: 'User is already registered as DMM' };
  }

  const tier = input.tier || 'standard';
  const tierConfig = DMM_CONFIG.TIERS[tier];

  const registration = await prisma.dMMRegistration.create({
    data: {
      userId: input.userId,
      status: approvedById ? 'active' : 'pending',
      tier,
      minUptimePercent: input.minUptimePercent || tierConfig.minUptimePercent,
      maxSpreadCents: input.maxSpreadCents || tierConfig.maxSpreadCents,
      minLiquidityCents: input.minLiquidityCents || tierConfig.minLiquidityCents,
      apiRateLimit: tierConfig.apiRateLimit,
      approvedAt: approvedById ? new Date() : null,
      approvedById,
      complianceStatus: 'pending',
    },
  });

  // Log audit event
  await writeAuditEvent({
    eventType: 'ADMIN_ACCOUNT_ACTION',
    actorType: approvedById ? 'admin' : 'user',
    actorId: approvedById || input.userId,
    reasonCode: 'DMM_REGISTRATION',
    metadata: {
      userId: input.userId,
      tier,
      status: registration.status,
    },
  });

  return { success: true, registrationId: registration.id };
}

/**
 * Approve a pending DMM registration
 */
export async function approveDMMRegistration(
  userId: string,
  approvedById: string
): Promise<{ success: boolean; error?: string }> {
  const registration = await prisma.dMMRegistration.findUnique({
    where: { userId },
  });

  if (!registration) {
    return { success: false, error: 'Registration not found' };
  }

  if (registration.status !== 'pending') {
    return { success: false, error: 'Registration is not pending approval' };
  }

  await prisma.dMMRegistration.update({
    where: { userId },
    data: {
      status: 'active',
      approvedAt: new Date(),
      approvedById,
      complianceStatus: 'compliant',
    },
  });

  await writeAuditEvent({
    eventType: 'ADMIN_ACCOUNT_ACTION',
    actorType: 'admin',
    actorId: approvedById,
    reasonCode: 'DMM_APPROVED',
    metadata: { userId },
  });

  return { success: true };
}

/**
 * Suspend a DMM for compliance violations
 */
export async function suspendDMM(
  userId: string,
  reason: string,
  adminId: string
): Promise<{ success: boolean; error?: string }> {
  const registration = await prisma.dMMRegistration.findUnique({
    where: { userId },
  });

  if (!registration) {
    return { success: false, error: 'Registration not found' };
  }

  await prisma.dMMRegistration.update({
    where: { userId },
    data: {
      status: 'suspended',
      complianceStatus: 'violation',
    },
  });

  await writeAuditEvent({
    eventType: 'ADMIN_ACCOUNT_ACTION',
    actorType: 'admin',
    actorId: adminId,
    reasonCode: 'DMM_SUSPENDED',
    metadata: { userId, reason },
  });

  return { success: true };
}

// ============================================================================
// METRICS COLLECTION
// ============================================================================

/**
 * Collect DMM metrics for a specific market
 * Should be called every minute for active DMMs
 */
export async function collectDMMMetrics(
  userId: string,
  marketId: string
): Promise<DMMMetricsSnapshot | null> {
  const registration = await prisma.dMMRegistration.findUnique({
    where: { userId },
  });

  if (!registration || registration.status !== 'active') {
    return null;
  }

  const now = new Date();
  const periodStart = new Date(now.getTime() - DMM_CONFIG.SNAPSHOT_INTERVAL_MS);

  // Get user's orders in this market
  const orders = await prisma.order.findMany({
    where: {
      userId,
      marketId,
      orderType: 'limit',
      createdAt: { lte: now },
      OR: [
        { status: { in: ['open', 'partial'] } },
        { filledAt: { gte: periodStart } },
        { cancelledAt: { gte: periodStart } },
      ],
    },
  });

  // Get market liquidity state for spread calculation
  const liquidityState = await prisma.marketLiquidityState.findUnique({
    where: { marketId },
  });

  // Calculate uptime (time with active orders)
  let uptimeMs = BigInt(0);
  let downtimeMs = BigInt(0);
  let spreadSum = 0;
  let spreadCount = 0;
  let maxSpread = 0;
  let minSpread = Infinity;
  let spreadViolations = 0;

  // Check if user has both bid and ask in the market
  const hasBid = orders.some(o => o.side === 'buy' && ['open', 'partial'].includes(o.status));
  const hasAsk = orders.some(o => o.side === 'sell' && ['open', 'partial'].includes(o.status));

  if (hasBid && hasAsk) {
    uptimeMs = BigInt(DMM_CONFIG.SNAPSHOT_INTERVAL_MS);

    // Calculate spread between best bid and ask
    const bestBid = Math.max(...orders.filter(o => o.side === 'buy').map(o => o.priceCents));
    const bestAsk = Math.min(...orders.filter(o => o.side === 'sell').map(o => o.priceCents));

    if (bestBid < bestAsk) {
      const spread = bestAsk - bestBid;
      spreadSum = spread;
      spreadCount = 1;
      maxSpread = spread;
      minSpread = spread;

      // Check for spread violations
      if (spread > registration.maxSpreadCents) {
        spreadViolations = 1;
      }
    }
  } else {
    downtimeMs = BigInt(DMM_CONFIG.SNAPSHOT_INTERVAL_MS);
  }

  // Get trades matched in this period
  const trades = await prisma.trade.count({
    where: {
      marketId,
      executedAt: { gte: periodStart },
      OR: [
        { buyerId: userId },
        { sellerId: userId },
      ],
    },
  });

  // Calculate volume provided
  const volumeResult = await prisma.trade.aggregate({
    where: {
      marketId,
      executedAt: { gte: periodStart },
      OR: [
        { buyerId: userId },
        { sellerId: userId },
      ],
    },
    _sum: { quantityCents: true },
  });

  const volumeProvidedCents = BigInt(volumeResult._sum.quantityCents || 0);

  const uptimePercent = Number(uptimeMs) / DMM_CONFIG.SNAPSHOT_INTERVAL_MS * 100;
  const avgSpread = spreadCount > 0 ? Math.round(spreadSum / spreadCount) : 0;

  const meetsRequirements =
    uptimePercent >= registration.minUptimePercent &&
    avgSpread <= registration.maxSpreadCents &&
    spreadViolations === 0;

  // Upsert metrics
  const existingMetrics = await prisma.dMMMetrics.findFirst({
    where: {
      userId,
      marketId,
      periodStart: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
    },
    orderBy: { periodStart: 'desc' },
  });

  if (existingMetrics) {
    await prisma.dMMMetrics.update({
      where: { id: existingMetrics.id },
      data: {
        periodEnd: now,
        uptimeMs: { increment: uptimeMs },
        downtimeMs: { increment: downtimeMs },
        uptimePercent: (Number(existingMetrics.uptimeMs + uptimeMs) /
          (Number(existingMetrics.uptimeMs + uptimeMs + existingMetrics.downtimeMs + downtimeMs))) * 100,
        avgSpreadCents: avgSpread,
        maxSpreadCents: Math.max(existingMetrics.maxSpreadCents, maxSpread),
        minSpreadCents: Math.min(existingMetrics.minSpreadCents || Infinity, minSpread === Infinity ? 0 : minSpread),
        spreadViolations: { increment: spreadViolations },
        volumeProvidedCents: { increment: volumeProvidedCents },
        tradesMatched: { increment: trades },
        meetsRequirements,
        warningCount: meetsRequirements ? existingMetrics.warningCount : { increment: 1 },
      },
    });
  } else {
    await prisma.dMMMetrics.create({
      data: {
        userId,
        marketId,
        periodStart,
        periodEnd: now,
        uptimeMs,
        downtimeMs,
        uptimePercent,
        avgSpreadCents: avgSpread,
        maxSpreadCents: maxSpread,
        minSpreadCents: minSpread === Infinity ? 0 : minSpread,
        spreadViolations,
        volumeProvidedCents,
        tradesMatched: trades,
        meetsRequirements,
        warningCount: meetsRequirements ? 0 : 1,
      },
    });
  }

  return {
    userId,
    marketId,
    periodStart,
    periodEnd: now,
    uptimeMs,
    downtimeMs,
    uptimePercent,
    avgSpreadCents: avgSpread,
    maxSpreadCents: maxSpread,
    minSpreadCents: minSpread === Infinity ? 0 : minSpread,
    spreadViolations,
    volumeProvidedCents,
    tradesMatched: trades,
    meetsRequirements,
  };
}

// ============================================================================
// COMPLIANCE MONITORING
// ============================================================================

/**
 * Run compliance check for all active DMMs
 */
export async function runComplianceCheck(): Promise<{
  dmmsChecked: number;
  warnings: number;
  suspensions: number;
}> {
  const activeDMMs = await prisma.dMMRegistration.findMany({
    where: { status: 'active' },
  });

  let warnings = 0;
  let suspensions = 0;

  for (const dmm of activeDMMs) {
    // Get recent metrics
    const recentMetrics = await prisma.dMMMetrics.findMany({
      where: {
        userId: dmm.userId,
        periodStart: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });

    // Calculate aggregate performance
    let totalUptime = BigInt(0);
    let totalDowntime = BigInt(0);
    let totalViolations = 0;

    for (const metrics of recentMetrics) {
      totalUptime += metrics.uptimeMs;
      totalDowntime += metrics.downtimeMs;
      totalViolations += metrics.spreadViolations;
    }

    const overallUptime = Number(totalUptime) / (Number(totalUptime + totalDowntime) || 1) * 100;

    // Determine compliance status
    let newComplianceStatus: ComplianceStatus = 'compliant';

    if (totalViolations >= DMM_CONFIG.SUSPENSION_THRESHOLD_VIOLATIONS) {
      newComplianceStatus = 'violation';
      suspensions++;

      // Auto-suspend
      await prisma.dMMRegistration.update({
        where: { userId: dmm.userId },
        data: {
          status: 'suspended',
          complianceStatus: 'violation',
        },
      });

      await writeAuditEvent({
        eventType: 'ADMIN_ACCOUNT_ACTION',
        actorType: 'system',
        reasonCode: 'DMM_AUTO_SUSPENDED',
        metadata: {
          userId: dmm.userId,
          totalViolations,
          overallUptime,
        },
      });
    } else if (totalViolations >= DMM_CONFIG.WARNING_THRESHOLD_VIOLATIONS ||
               overallUptime < dmm.minUptimePercent) {
      newComplianceStatus = 'warning';
      warnings++;

      await prisma.dMMRegistration.update({
        where: { userId: dmm.userId },
        data: { complianceStatus: 'warning' },
      });
    } else {
      await prisma.dMMRegistration.update({
        where: { userId: dmm.userId },
        data: { complianceStatus: 'compliant', lastComplianceCheck: new Date() },
      });
    }
  }

  return {
    dmmsChecked: activeDMMs.length,
    warnings,
    suspensions,
  };
}

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get DMM performance report
 */
export async function getDMMPerformanceReport(userId: string): Promise<DMMPerformanceReport | null> {
  const registration = await prisma.dMMRegistration.findUnique({
    where: { userId },
  });

  if (!registration) {
    return null;
  }

  // Get all metrics for this DMM
  const metrics = await prisma.dMMMetrics.findMany({
    where: { userId },
    include: {
      market: { select: { id: true, title: true } },
    },
  });

  // Aggregate overall stats
  let totalUptime = BigInt(0);
  let totalDowntime = BigInt(0);
  let totalVolume = BigInt(0);
  let totalTrades = 0;
  let spreadSum = 0;
  let spreadCount = 0;

  const marketStats = new Map<string, {
    marketId: string;
    marketTitle: string;
    uptime: bigint;
    downtime: bigint;
    spreadSum: number;
    spreadCount: number;
    meetsRequirements: boolean;
  }>();

  for (const m of metrics) {
    totalUptime += m.uptimeMs;
    totalDowntime += m.downtimeMs;
    totalVolume += m.volumeProvidedCents;
    totalTrades += m.tradesMatched;
    spreadSum += m.avgSpreadCents;
    spreadCount++;

    const existing = marketStats.get(m.marketId);
    if (existing) {
      existing.uptime += m.uptimeMs;
      existing.downtime += m.downtimeMs;
      existing.spreadSum += m.avgSpreadCents;
      existing.spreadCount++;
      existing.meetsRequirements = existing.meetsRequirements && m.meetsRequirements;
    } else {
      marketStats.set(m.marketId, {
        marketId: m.marketId,
        marketTitle: m.market.title,
        uptime: m.uptimeMs,
        downtime: m.downtimeMs,
        spreadSum: m.avgSpreadCents,
        spreadCount: 1,
        meetsRequirements: m.meetsRequirements,
      });
    }
  }

  const markets = Array.from(marketStats.values()).map(ms => ({
    marketId: ms.marketId,
    marketTitle: ms.marketTitle,
    uptimePercent: Number(ms.uptime) / (Number(ms.uptime + ms.downtime) || 1) * 100,
    avgSpreadCents: ms.spreadCount > 0 ? Math.round(ms.spreadSum / ms.spreadCount) : 0,
    meetsRequirements: ms.meetsRequirements,
  }));

  // Count warnings from metrics
  const warningCount = await prisma.dMMMetrics.count({
    where: { userId, meetsRequirements: false },
  });

  return {
    userId,
    registrationStatus: registration.status as DMMStatus,
    tier: registration.tier as DMMTier,
    complianceStatus: registration.complianceStatus as ComplianceStatus,
    overallUptimePercent: Number(totalUptime) / (Number(totalUptime + totalDowntime) || 1) * 100,
    avgSpreadCents: spreadCount > 0 ? Math.round(spreadSum / spreadCount) : 0,
    totalVolumeProvidedCents: totalVolume,
    totalTradesMatched: totalTrades,
    warningCount,
    markets,
  };
}

/**
 * Get all active DMMs
 */
export async function getActiveDMMs() {
  return prisma.dMMRegistration.findMany({
    where: { status: 'active' },
    include: {
      user: { select: { id: true, username: true, email: true } },
    },
  });
}

/**
 * Check if user is a DMM with prioritized access
 */
export async function isDMMWithPriorityAccess(userId: string): Promise<boolean> {
  const registration = await prisma.dMMRegistration.findUnique({
    where: { userId },
  });

  return registration?.status === 'active' && registration.apiRateLimit === 0;
}

// ============================================================================
// BACKGROUND WORKER
// ============================================================================

/**
 * Main DMM monitoring background worker
 * Should be called every minute
 */
export async function dmmBackgroundWorker(): Promise<void> {
  try {
    // Get all active DMMs
    const activeDMMs = await getActiveDMMs();

    // Get all published markets
    const markets = await prisma.market.findMany({
      where: { status: 'published' },
      select: { id: true },
    });

    // Collect metrics for each DMM/market combination
    for (const dmm of activeDMMs) {
      for (const market of markets) {
        // Check if DMM has any orders in this market
        const hasOrders = await prisma.order.findFirst({
          where: {
            userId: dmm.userId,
            marketId: market.id,
            status: { in: ['open', 'partial'] },
          },
        });

        if (hasOrders) {
          await collectDMMMetrics(dmm.userId, market.id);
        }
      }
    }

    // Run compliance check periodically (every hour based on config)
    const lastCheck = await prisma.dMMRegistration.findFirst({
      where: { lastComplianceCheck: { not: null } },
      orderBy: { lastComplianceCheck: 'desc' },
    });

    if (!lastCheck?.lastComplianceCheck ||
        Date.now() - lastCheck.lastComplianceCheck.getTime() >= DMM_CONFIG.COMPLIANCE_CHECK_INTERVAL_MS) {
      await runComplianceCheck();
    }
  } catch (error) {
    console.error('DMM background worker error:', error);
    throw error;
  }
}
