// ============================================================================
// SETTLEMENT SERVICE - NT 2024 Compliant Settlement & Refunds
// Handles market resolution, payouts, and regulatory compliance
// ============================================================================

import prisma from '@/lib/prisma';
import { writeAuditEvent } from './auditEventService';

// ============================================================================
// TYPES
// ============================================================================

export type SettlementType = 'NORMAL' | 'VOID' | 'REFUND';
export type SettlementStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface SettlementInput {
  marketId: string;
  winningOutcomeId?: string; // Required for NORMAL settlement
  resolutionSource: string;
  resolutionEvidence?: Record<string, unknown>;
  adminId: string;
}

export interface RefundInput {
  marketId: string;
  reason: string;
  adminId: string;
}

export interface SettlementResult {
  success: boolean;
  settlementId?: string;
  totalPayoutCents?: number;
  totalRefundCents?: number;
  payoutsProcessed?: number;
  error?: string;
  reasonCode: string;
}

export interface UserPayout {
  userId: string;
  positionId: string;
  payoutType: 'WIN' | 'REFUND' | 'LOSS';
  amountCents: number;
  positionQuantityCents: number;
  positionAvgPriceCents: number;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const SETTLEMENT_CONFIG = {
  // Retry configuration
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 5000,

  // Batch processing
  BATCH_SIZE: 100,

  // NT compliance
  AUDIT_RETENTION_YEARS: 7,
  REQUIRE_RESOLUTION_SOURCE: true,
  REQUIRE_ADMIN_APPROVAL: true,
};

// ============================================================================
// SETTLEMENT FUNCTIONS
// ============================================================================

/**
 * Settle a market with a winning outcome (NT 2024 compliant)
 * This distributes payouts to all winning positions
 */
export async function settleMarket(input: SettlementInput): Promise<SettlementResult> {
  const { marketId, winningOutcomeId, resolutionSource, resolutionEvidence, adminId } = input;

  try {
    // Validate market state
    const market = await prisma.market.findUnique({
      where: { id: marketId },
      include: { outcomes: true },
    });

    if (!market) {
      return { success: false, error: 'Market not found', reasonCode: 'MARKET_NOT_FOUND' };
    }

    if (market.status !== 'resolved') {
      return {
        success: false,
        error: 'Market must be resolved before settlement',
        reasonCode: 'MARKET_NOT_RESOLVED',
      };
    }

    if (!winningOutcomeId) {
      return {
        success: false,
        error: 'Winning outcome ID is required',
        reasonCode: 'MISSING_WINNING_OUTCOME',
      };
    }

    // Validate winning outcome exists
    const winningOutcome = market.outcomes.find(o => o.id === winningOutcomeId);
    if (!winningOutcome) {
      return {
        success: false,
        error: 'Invalid winning outcome',
        reasonCode: 'INVALID_WINNING_OUTCOME',
      };
    }

    // NT compliance: require resolution source
    if (SETTLEMENT_CONFIG.REQUIRE_RESOLUTION_SOURCE && !resolutionSource) {
      return {
        success: false,
        error: 'Resolution source is required for NT compliance',
        reasonCode: 'NT_COMPLIANCE_MISSING_SOURCE',
      };
    }

    // Create settlement record
    const settlementId = crypto.randomUUID();

    await prisma.settlementRecord.create({
      data: {
        id: settlementId,
        marketId,
        settlementType: 'NORMAL',
        winningOutcomeId,
        resolutionSource,
        resolutionEvidence: resolutionEvidence ? JSON.stringify(resolutionEvidence) : null,
        status: 'processing',
        reasonCode: 'ORACLE_RESULT',
        processedById: adminId,
      },
    });

    // Get all positions for this market
    const positions = await prisma.position.findMany({
      where: {
        marketId,
        quantityCents: { gt: 0 },
      },
    });

    let totalPayoutCents = BigInt(0);
    let payoutsProcessed = 0;
    const payouts: UserPayout[] = [];

    // Process positions in batches
    for (let i = 0; i < positions.length; i += SETTLEMENT_CONFIG.BATCH_SIZE) {
      const batch = positions.slice(i, i + SETTLEMENT_CONFIG.BATCH_SIZE);

      for (const position of batch) {
        // Calculate payout
        let payoutCents = 0;
        let payoutType: 'WIN' | 'LOSS';

        if (position.outcomeId === winningOutcomeId) {
          // Winner: each share is worth 100 cents ($1)
          payoutCents = position.quantityCents;
          payoutType = 'WIN';
        } else {
          // Loser: no payout
          payoutCents = 0;
          payoutType = 'LOSS';
        }

        // Create payout record
        await prisma.settlementPayout.create({
          data: {
            settlementId,
            userId: position.userId,
            positionId: position.id,
            payoutType,
            amountCents: payoutCents,
            positionQuantityCents: position.quantityCents,
            positionAvgPriceCents: position.avgPriceCents,
            status: 'pending',
          },
        });

        // Credit user balance for winners
        if (payoutCents > 0) {
          const profitCents = payoutCents - position.totalCostCents;

          await prisma.user.update({
            where: { id: position.userId },
            data: {
              balanceCents: { increment: payoutCents },
              totalProfitCents: { increment: profitCents },
            },
          });

          totalPayoutCents += BigInt(payoutCents);
        }

        payouts.push({
          userId: position.userId,
          positionId: position.id,
          payoutType,
          amountCents: payoutCents,
          positionQuantityCents: position.quantityCents,
          positionAvgPriceCents: position.avgPriceCents,
        });

        payoutsProcessed++;
      }
    }

    // Update settlement record
    await prisma.settlementRecord.update({
      where: { id: settlementId },
      data: {
        totalPayoutCents,
        status: 'completed',
        completedAt: new Date(),
      },
    });

    // Mark all payouts as processed
    await prisma.settlementPayout.updateMany({
      where: { settlementId },
      data: { status: 'processed', processedAt: new Date() },
    });

    // Update market status
    await prisma.market.update({
      where: { id: marketId },
      data: {
        status: 'settled',
        settledAt: new Date(),
      },
    });

    // Mark winning outcome
    await prisma.marketOutcome.update({
      where: { id: winningOutcomeId },
      data: { isWinner: true, isResolved: true },
    });

    // Mark losing outcomes
    await prisma.marketOutcome.updateMany({
      where: { marketId, id: { not: winningOutcomeId } },
      data: { isWinner: false, isResolved: true },
    });

    // Cancel all open orders
    await prisma.order.updateMany({
      where: {
        marketId,
        status: { in: ['pending', 'open', 'partial'] },
      },
      data: {
        status: 'cancelled',
        cancelledAt: new Date(),
        reasonCode: 'MARKET_SETTLED',
      },
    });

    // Log audit event
    await writeAuditEvent({
      eventType: 'MARKET_SETTLED',
      actorType: 'admin',
      actorId: adminId,
      marketId,
      reasonCode: 'ORACLE_RESULT',
      afterState: {
        settlementId,
        winningOutcomeId,
        totalPayoutCents: totalPayoutCents.toString(),
        payoutsProcessed,
      },
      metadata: {
        resolutionSource,
        resolutionEvidence,
      },
    });

    return {
      success: true,
      settlementId,
      totalPayoutCents: Number(totalPayoutCents),
      payoutsProcessed,
      reasonCode: 'SETTLEMENT_COMPLETE',
    };
  } catch (error) {
    console.error('Settlement error:', error);

    // Update settlement record with error
    await prisma.settlementRecord.updateMany({
      where: { marketId, status: 'processing' },
      data: {
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        retryCount: { increment: 1 },
      },
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Settlement failed',
      reasonCode: 'SETTLEMENT_ERROR',
    };
  }
}

/**
 * Refund a market (NT 2024 requirement for cancellations)
 * This returns all positions at their cost basis
 */
export async function refundMarket(input: RefundInput): Promise<SettlementResult> {
  const { marketId, reason, adminId } = input;

  try {
    // Validate market
    const market = await prisma.market.findUnique({
      where: { id: marketId },
    });

    if (!market) {
      return { success: false, error: 'Market not found', reasonCode: 'MARKET_NOT_FOUND' };
    }

    // Can only refund markets that haven't been settled
    if (market.status === 'settled') {
      return {
        success: false,
        error: 'Cannot refund a settled market',
        reasonCode: 'MARKET_ALREADY_SETTLED',
      };
    }

    // Create settlement record for refund
    const settlementId = crypto.randomUUID();

    await prisma.settlementRecord.create({
      data: {
        id: settlementId,
        marketId,
        settlementType: 'REFUND',
        status: 'processing',
        reasonCode: 'MARKET_CANCELLED',
        processedById: adminId,
      },
    });

    // Get all positions
    const positions = await prisma.position.findMany({
      where: {
        marketId,
        quantityCents: { gt: 0 },
      },
    });

    let totalRefundCents = BigInt(0);
    let refundsProcessed = 0;

    // Process refunds
    for (const position of positions) {
      // Refund amount = total cost basis
      const refundCents = position.totalCostCents;

      // Create payout record
      await prisma.settlementPayout.create({
        data: {
          settlementId,
          userId: position.userId,
          positionId: position.id,
          payoutType: 'REFUND',
          amountCents: refundCents,
          positionQuantityCents: position.quantityCents,
          positionAvgPriceCents: position.avgPriceCents,
          status: 'pending',
        },
      });

      // Credit user balance
      await prisma.user.update({
        where: { id: position.userId },
        data: {
          balanceCents: { increment: refundCents },
        },
      });

      totalRefundCents += BigInt(refundCents);
      refundsProcessed++;
    }

    // Release locked balances from open orders
    const openOrders = await prisma.order.findMany({
      where: {
        marketId,
        status: { in: ['pending', 'open', 'partial'] },
      },
    });

    for (const order of openOrders) {
      const lockedAmount = order.side === 'buy'
        ? Math.floor(order.remainingCents * order.priceCents / 100)
        : Math.floor(order.remainingCents * (100 - order.priceCents) / 100);

      await prisma.user.update({
        where: { id: order.userId },
        data: {
          lockedBalanceCents: { decrement: lockedAmount },
        },
      });
    }

    // Cancel all open orders
    await prisma.order.updateMany({
      where: {
        marketId,
        status: { in: ['pending', 'open', 'partial'] },
      },
      data: {
        status: 'cancelled',
        cancelledAt: new Date(),
        reasonCode: 'MARKET_CANCELLED',
      },
    });

    // Update settlement record
    await prisma.settlementRecord.update({
      where: { id: settlementId },
      data: {
        totalRefundCents,
        status: 'completed',
        completedAt: new Date(),
      },
    });

    // Mark all payouts as processed
    await prisma.settlementPayout.updateMany({
      where: { settlementId },
      data: { status: 'processed', processedAt: new Date() },
    });

    // Update market status
    await prisma.market.update({
      where: { id: marketId },
      data: {
        status: 'archived',
      },
    });

    // Log audit event
    await writeAuditEvent({
      eventType: 'ADMIN_MARKET_VOIDED',
      actorType: 'admin',
      actorId: adminId,
      marketId,
      reasonCode: 'MARKET_CANCELLED',
      afterState: {
        settlementId,
        reason,
        totalRefundCents: totalRefundCents.toString(),
        refundsProcessed,
      },
    });

    return {
      success: true,
      settlementId,
      totalRefundCents: Number(totalRefundCents),
      payoutsProcessed: refundsProcessed,
      reasonCode: 'REFUND_COMPLETE',
    };
  } catch (error) {
    console.error('Refund error:', error);

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Refund failed',
      reasonCode: 'REFUND_ERROR',
    };
  }
}

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get settlement details
 */
export async function getSettlement(settlementId: string) {
  return prisma.settlementRecord.findUnique({
    where: { id: settlementId },
    include: {
      market: { select: { id: true, title: true, status: true } },
      payouts: {
        include: {
          user: { select: { id: true, username: true, email: true } },
        },
      },
    },
  });
}

/**
 * Get market's settlement history
 */
export async function getMarketSettlements(marketId: string) {
  return prisma.settlementRecord.findMany({
    where: { marketId },
    include: {
      payouts: { select: { id: true, userId: true, payoutType: true, amountCents: true } },
    },
    orderBy: { initiatedAt: 'desc' },
  });
}

/**
 * Get user's payout history
 */
export async function getUserPayouts(userId: string, limit: number = 50) {
  return prisma.settlementPayout.findMany({
    where: { userId },
    include: {
      settlement: {
        include: {
          market: { select: { id: true, title: true } },
        },
      },
    },
    orderBy: { processedAt: 'desc' },
    take: limit,
  });
}

/**
 * Get pending settlements for admin review
 */
export async function getPendingSettlements() {
  return prisma.settlementRecord.findMany({
    where: { status: { in: ['pending', 'processing'] } },
    include: {
      market: { select: { id: true, title: true, status: true } },
      processedBy: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: { initiatedAt: 'asc' },
  });
}

/**
 * Get settlement statistics
 */
export async function getSettlementStats(startDate?: Date, endDate?: Date) {
  const where: Record<string, unknown> = { status: 'completed' };

  if (startDate || endDate) {
    where.completedAt = {};
    if (startDate) (where.completedAt as Record<string, Date>).gte = startDate;
    if (endDate) (where.completedAt as Record<string, Date>).lte = endDate;
  }

  const [normalCount, refundCount, totalPayout, totalRefund] = await Promise.all([
    prisma.settlementRecord.count({
      where: { ...where, settlementType: 'NORMAL' },
    }),
    prisma.settlementRecord.count({
      where: { ...where, settlementType: 'REFUND' },
    }),
    prisma.settlementRecord.aggregate({
      where: { ...where, settlementType: 'NORMAL' },
      _sum: { totalPayoutCents: true },
    }),
    prisma.settlementRecord.aggregate({
      where: { ...where, settlementType: 'REFUND' },
      _sum: { totalRefundCents: true },
    }),
  ]);

  return {
    normalSettlements: normalCount,
    refundSettlements: refundCount,
    totalPayoutCents: totalPayout._sum.totalPayoutCents || BigInt(0),
    totalRefundCents: totalRefund._sum.totalRefundCents || BigInt(0),
    period: { startDate, endDate },
  };
}

// ============================================================================
// RETRY LOGIC FOR FAILED SETTLEMENTS
// ============================================================================

/**
 * Retry failed settlements
 */
export async function retryFailedSettlements(): Promise<{
  retried: number;
  succeeded: number;
  failed: number;
}> {
  const failedSettlements = await prisma.settlementRecord.findMany({
    where: {
      status: 'failed',
      retryCount: { lt: SETTLEMENT_CONFIG.MAX_RETRIES },
    },
  });

  let retried = 0;
  let succeeded = 0;
  let failed = 0;

  for (const settlement of failedSettlements) {
    retried++;

    try {
      if (settlement.settlementType === 'NORMAL' && settlement.winningOutcomeId) {
        const result = await settleMarket({
          marketId: settlement.marketId,
          winningOutcomeId: settlement.winningOutcomeId,
          resolutionSource: settlement.resolutionSource || 'Retry',
          adminId: settlement.processedById || 'system',
        });

        if (result.success) {
          succeeded++;
        } else {
          failed++;
        }
      } else if (settlement.settlementType === 'REFUND') {
        const result = await refundMarket({
          marketId: settlement.marketId,
          reason: 'Retry of failed refund',
          adminId: settlement.processedById || 'system',
        });

        if (result.success) {
          succeeded++;
        } else {
          failed++;
        }
      }
    } catch (error) {
      failed++;
      console.error(`Retry failed for settlement ${settlement.id}:`, error);
    }

    // Wait between retries
    await new Promise(resolve => setTimeout(resolve, SETTLEMENT_CONFIG.RETRY_DELAY_MS));
  }

  return { retried, succeeded, failed };
}
