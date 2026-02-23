// ============================================================================
// FEE ACCOUNTING SERVICE - Double-Entry Ledger
// Maker/Taker Fee Model | NT 2024 Compliant
// ============================================================================
//
// Fee Structure:
// - Taker pays taker_fee_bps (default 1.00% = 100 bps)
// - Maker receives maker_rebate_bps (default 0.25% = 25 bps)
// - Venue keeps difference (default 0.75% = 75 bps)
//
// Double-Entry Ledger:
// - Every fee transaction has debit and credit entries
// - Sum of all entries must be zero (balanced)
// ============================================================================

import prisma from '@/lib/prisma';
import { writeAuditEvent } from './auditEventService';

// ============================================================================
// TYPES
// ============================================================================

export interface FeeSchedule {
  id: string;
  liquidityTier: number;
  takerFeeBps: number;
  makerRebateBps: number;
  venueFeeNetBps: number;
  minEffectiveDepthCents: bigint;
  maxEffectiveDepthCents: bigint | null;
  maxOrderSizeCents: bigint | null;
  isActive: boolean;
}

export interface FeeCalculation {
  tradeValueCents: number;
  takerFeeCents: number;
  makerRebateCents: number;
  venueFeeCents: number;
  liquidityTier: number;
  takerFeeBps: number;
  makerRebateBps: number;
}

export interface FeeLedgerEntry {
  id: string;
  tradeId: string;
  marketId: string;
  accountType: string;
  accountId: string | null;
  entryType: 'TAKER_FEE' | 'MAKER_REBATE' | 'VENUE_FEE';
  entryDirection: 'DEBIT' | 'CREDIT';
  amountCents: number;
  liquidityTier: number;
  createdAt: Date;
}

export interface FeeSummary {
  totalTakerFeesCents: number;
  totalMakerRebatesCents: number;
  totalVenueFeesCents: number;
  tradeCount: number;
  volumeCents: number;
}

// ============================================================================
// FEE SCHEDULE MANAGEMENT
// ============================================================================

/**
 * Get the fee schedule for a specific liquidity tier
 */
export async function getFeeScheduleForTier(liquidityTier: number): Promise<FeeSchedule | null> {
  const schedule = await prisma.feeSchedule.findFirst({
    where: { liquidityTier, isActive: true },
  });

  if (!schedule) return null;

  return {
    id: schedule.id,
    liquidityTier: schedule.liquidityTier,
    takerFeeBps: schedule.takerFeeBps,
    makerRebateBps: schedule.makerRebateBps,
    venueFeeNetBps: schedule.venueFeeNetBps,
    minEffectiveDepthCents: schedule.minEffectiveDepthCents,
    maxEffectiveDepthCents: schedule.maxEffectiveDepthCents,
    maxOrderSizeCents: schedule.maxOrderSizeCents,
    isActive: schedule.isActive,
  };
}

/**
 * Get the default fee schedule (tier 0)
 */
export async function getDefaultFeeSchedule(): Promise<FeeSchedule | null> {
  return getFeeScheduleForTier(0);
}

/**
 * Get all active fee schedules
 */
export async function getAllFeeSchedules(): Promise<FeeSchedule[]> {
  const schedules = await prisma.feeSchedule.findMany({
    where: { isActive: true },
    orderBy: { liquidityTier: 'asc' },
  });

  return schedules.map(s => ({
    id: s.id,
    liquidityTier: s.liquidityTier,
    takerFeeBps: s.takerFeeBps,
    makerRebateBps: s.makerRebateBps,
    venueFeeNetBps: s.venueFeeNetBps,
    minEffectiveDepthCents: s.minEffectiveDepthCents,
    maxEffectiveDepthCents: s.maxEffectiveDepthCents,
    maxOrderSizeCents: s.maxOrderSizeCents,
    isActive: s.isActive,
  }));
}

/**
 * Create a new fee schedule for a liquidity tier
 */
export async function createFeeSchedule(
  input: {
    liquidityTier: number;
    takerFeeBps: number;
    makerRebateBps: number;
    minEffectiveDepthCents?: bigint;
    maxEffectiveDepthCents?: bigint;
    maxOrderSizeCents?: bigint;
  },
  adminId: string
): Promise<FeeSchedule> {
  // Venue fee is the difference
  const venueFeeNetBps = input.takerFeeBps - input.makerRebateBps;

  if (venueFeeNetBps < 0) {
    throw new Error('Maker rebate cannot exceed taker fee');
  }

  const schedule = await prisma.feeSchedule.create({
    data: {
      liquidityTier: input.liquidityTier,
      takerFeeBps: input.takerFeeBps,
      makerRebateBps: input.makerRebateBps,
      venueFeeNetBps,
      minEffectiveDepthCents: input.minEffectiveDepthCents ?? BigInt(0),
      maxEffectiveDepthCents: input.maxEffectiveDepthCents ?? null,
      maxOrderSizeCents: input.maxOrderSizeCents ?? null,
      isActive: true,
    },
  });

  await writeAuditEvent({
    eventType: 'ADMIN_ACCOUNT_ACTION',
    actorType: 'admin',
    actorId: adminId,
    reasonCode: 'FEE_SCHEDULE_CREATED',
    metadata: {
      scheduleId: schedule.id,
      liquidityTier: schedule.liquidityTier,
      takerFeeBps: schedule.takerFeeBps,
      makerRebateBps: schedule.makerRebateBps,
      venueFeeNetBps: schedule.venueFeeNetBps,
    },
  });

  return {
    id: schedule.id,
    liquidityTier: schedule.liquidityTier,
    takerFeeBps: schedule.takerFeeBps,
    makerRebateBps: schedule.makerRebateBps,
    venueFeeNetBps: schedule.venueFeeNetBps,
    minEffectiveDepthCents: schedule.minEffectiveDepthCents,
    maxEffectiveDepthCents: schedule.maxEffectiveDepthCents,
    maxOrderSizeCents: schedule.maxOrderSizeCents,
    isActive: schedule.isActive,
  };
}

// ============================================================================
// FEE CALCULATION
// ============================================================================

/**
 * Calculate fees for a trade based on liquidity tier
 * Does NOT apply or record fees - just calculates
 */
export async function calculateTradeFees(
  tradeValueCents: number,
  liquidityTier: number = 0
): Promise<FeeCalculation> {
  // Get fee schedule for the tier
  const schedule = await getFeeScheduleForTier(liquidityTier);

  if (!schedule) {
    // No fees if no schedule - use defaults
    return {
      tradeValueCents,
      takerFeeCents: Math.floor(tradeValueCents * 100 / 10000), // 1% default
      makerRebateCents: Math.floor(tradeValueCents * 25 / 10000), // 0.25% default
      venueFeeCents: Math.floor(tradeValueCents * 75 / 10000), // 0.75% default
      liquidityTier,
      takerFeeBps: 100,
      makerRebateBps: 25,
    };
  }

  // Calculate fees
  // fee = tradeValue * bps / 10000
  const takerFeeCents = Math.floor(tradeValueCents * schedule.takerFeeBps / 10000);
  const makerRebateCents = Math.floor(tradeValueCents * schedule.makerRebateBps / 10000);

  // Venue keeps difference
  const venueFeeCents = takerFeeCents - makerRebateCents;

  return {
    tradeValueCents,
    takerFeeCents,
    makerRebateCents,
    venueFeeCents,
    liquidityTier: schedule.liquidityTier,
    takerFeeBps: schedule.takerFeeBps,
    makerRebateBps: schedule.makerRebateBps,
  };
}

// ============================================================================
// FEE LEDGER OPERATIONS
// ============================================================================

/**
 * Record fee ledger entries for a trade
 * Uses double-entry accounting:
 * - Taker: DEBIT (pays fee)
 * - Maker: CREDIT (receives rebate)
 * - Venue: CREDIT (keeps difference)
 */
export async function recordTradeFees(
  tradeId: string,
  marketId: string,
  takerId: string,
  makerId: string,
  fees: FeeCalculation,
  batchId?: string
): Promise<FeeLedgerEntry[]> {
  const entries: FeeLedgerEntry[] = [];

  if (fees.takerFeeCents === 0) {
    return entries;
  }

  await prisma.$transaction(async (tx) => {
    // Taker pays fee (DEBIT)
    const takerEntry = await tx.feeLedger.create({
      data: {
        tradeId,
        batchId: batchId ?? null,
        marketId,
        accountType: 'user',
        accountId: takerId,
        entryType: 'TAKER_FEE',
        entryDirection: 'DEBIT',
        amountCents: fees.takerFeeCents,
        liquidityTier: fees.liquidityTier,
        reasonCode: 'TRADE_EXECUTION',
      },
    });
    entries.push({
      id: takerEntry.id,
      tradeId: takerEntry.tradeId,
      marketId: takerEntry.marketId,
      accountType: takerEntry.accountType,
      accountId: takerEntry.accountId,
      entryType: takerEntry.entryType as 'TAKER_FEE',
      entryDirection: takerEntry.entryDirection as 'DEBIT',
      amountCents: takerEntry.amountCents,
      liquidityTier: takerEntry.liquidityTier,
      createdAt: takerEntry.createdAt,
    });

    // Debit taker's balance
    await tx.user.update({
      where: { id: takerId },
      data: {
        balanceCents: { decrement: fees.takerFeeCents },
        totalTakerFeesPaidCents: { increment: fees.takerFeeCents },
        netFeesCents: { increment: fees.takerFeeCents },
      },
    });

    // Maker receives rebate (CREDIT)
    if (fees.makerRebateCents > 0) {
      const makerEntry = await tx.feeLedger.create({
        data: {
          tradeId,
          batchId: batchId ?? null,
          marketId,
          accountType: 'user',
          accountId: makerId,
          entryType: 'MAKER_REBATE',
          entryDirection: 'CREDIT',
          amountCents: fees.makerRebateCents,
          liquidityTier: fees.liquidityTier,
          reasonCode: 'TRADE_EXECUTION',
        },
      });
      entries.push({
        id: makerEntry.id,
        tradeId: makerEntry.tradeId,
        marketId: makerEntry.marketId,
        accountType: makerEntry.accountType,
        accountId: makerEntry.accountId,
        entryType: makerEntry.entryType as 'MAKER_REBATE',
        entryDirection: makerEntry.entryDirection as 'CREDIT',
        amountCents: makerEntry.amountCents,
        liquidityTier: makerEntry.liquidityTier,
        createdAt: makerEntry.createdAt,
      });

      // Credit maker's balance
      await tx.user.update({
        where: { id: makerId },
        data: {
          balanceCents: { increment: fees.makerRebateCents },
          totalMakerRebatesEarnedCents: { increment: fees.makerRebateCents },
          netFeesCents: { decrement: fees.makerRebateCents },
        },
      });
    }

    // Venue keeps difference (CREDIT)
    if (fees.venueFeeCents > 0) {
      const venueEntry = await tx.feeLedger.create({
        data: {
          tradeId,
          batchId: batchId ?? null,
          marketId,
          accountType: 'venue',
          accountId: null, // Venue has no user ID
          entryType: 'VENUE_FEE',
          entryDirection: 'CREDIT',
          amountCents: fees.venueFeeCents,
          liquidityTier: fees.liquidityTier,
          reasonCode: 'TRADE_EXECUTION',
        },
      });
      entries.push({
        id: venueEntry.id,
        tradeId: venueEntry.tradeId,
        marketId: venueEntry.marketId,
        accountType: venueEntry.accountType,
        accountId: venueEntry.accountId,
        entryType: venueEntry.entryType as 'VENUE_FEE',
        entryDirection: venueEntry.entryDirection as 'CREDIT',
        amountCents: venueEntry.amountCents,
        liquidityTier: venueEntry.liquidityTier,
        createdAt: venueEntry.createdAt,
      });
    }
  });

  // Log to audit
  await writeAuditEvent({
    eventType: 'COMMISSION_APPLIED',
    actorType: 'system',
    tradeId,
    marketId,
    metadata: {
      takerId,
      makerId,
      takerFeeCents: fees.takerFeeCents,
      makerRebateCents: fees.makerRebateCents,
      venueFeeCents: fees.venueFeeCents,
      liquidityTier: fees.liquidityTier,
    },
  });

  return entries;
}

// ============================================================================
// FEE QUERIES
// ============================================================================

/**
 * Get fee ledger entries for a trade
 */
export async function getTradeFees(tradeId: string): Promise<FeeLedgerEntry[]> {
  const entries = await prisma.feeLedger.findMany({
    where: { tradeId },
    orderBy: { createdAt: 'asc' },
  });

  return entries.map(e => ({
    id: e.id,
    tradeId: e.tradeId,
    marketId: e.marketId,
    accountType: e.accountType,
    accountId: e.accountId,
    entryType: e.entryType as 'TAKER_FEE' | 'MAKER_REBATE' | 'VENUE_FEE',
    entryDirection: e.entryDirection as 'DEBIT' | 'CREDIT',
    amountCents: e.amountCents,
    liquidityTier: e.liquidityTier,
    createdAt: e.createdAt,
  }));
}

/**
 * Get fee summary for a user
 */
export async function getUserFeeSummary(
  userId: string,
  startDate?: Date,
  endDate?: Date
): Promise<{
  totalFeesPaidCents: number;
  totalRebatesReceivedCents: number;
  netFeeCents: number;
  tradeCount: number;
}> {
  const where: Record<string, unknown> = { accountId: userId };
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) (where.createdAt as Record<string, Date>).gte = startDate;
    if (endDate) (where.createdAt as Record<string, Date>).lte = endDate;
  }

  const [feesPaid, rebatesReceived] = await Promise.all([
    prisma.feeLedger.aggregate({
      where: { ...where, entryType: 'TAKER_FEE' },
      _sum: { amountCents: true },
      _count: { id: true },
    }),
    prisma.feeLedger.aggregate({
      where: { ...where, entryType: 'MAKER_REBATE' },
      _sum: { amountCents: true },
    }),
  ]);

  const totalFeesPaidCents = feesPaid._sum.amountCents || 0;
  const totalRebatesReceivedCents = rebatesReceived._sum.amountCents || 0;

  return {
    totalFeesPaidCents,
    totalRebatesReceivedCents,
    netFeeCents: totalFeesPaidCents - totalRebatesReceivedCents,
    tradeCount: feesPaid._count.id,
  };
}

/**
 * Get fee summary for a market
 */
export async function getMarketFeeSummary(
  marketId: string,
  startDate?: Date,
  endDate?: Date
): Promise<FeeSummary> {
  const where: Record<string, unknown> = { marketId };
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) (where.createdAt as Record<string, Date>).gte = startDate;
    if (endDate) (where.createdAt as Record<string, Date>).lte = endDate;
  }

  const [takerFees, makerRebates, venueFees] = await Promise.all([
    prisma.feeLedger.aggregate({
      where: { ...where, entryType: 'TAKER_FEE' },
      _sum: { amountCents: true },
      _count: { id: true },
    }),
    prisma.feeLedger.aggregate({
      where: { ...where, entryType: 'MAKER_REBATE' },
      _sum: { amountCents: true },
    }),
    prisma.feeLedger.aggregate({
      where: { ...where, entryType: 'VENUE_FEE' },
      _sum: { amountCents: true },
    }),
  ]);

  // Get total volume
  const trades = await prisma.trade.aggregate({
    where: { marketId },
    _sum: { quantityCents: true },
  });

  return {
    totalTakerFeesCents: takerFees._sum.amountCents || 0,
    totalMakerRebatesCents: makerRebates._sum.amountCents || 0,
    totalVenueFeesCents: venueFees._sum.amountCents || 0,
    tradeCount: takerFees._count.id,
    volumeCents: trades._sum.quantityCents || 0,
  };
}

/**
 * Get venue fee totals (revenue report)
 */
export async function getVenueFeeTotals(
  startDate: Date,
  endDate: Date
): Promise<{
  totalVenueFeesCents: number;
  totalTakerFeesCents: number;
  totalMakerRebatesCents: number;
  netRevenueCents: number;
  tradeCount: number;
  periodStart: Date;
  periodEnd: Date;
}> {
  const venueFees = await prisma.feeLedger.aggregate({
    where: {
      entryType: 'VENUE_FEE',
      createdAt: { gte: startDate, lte: endDate },
    },
    _sum: { amountCents: true },
    _count: { id: true },
  });

  const takerFees = await prisma.feeLedger.aggregate({
    where: {
      entryType: 'TAKER_FEE',
      createdAt: { gte: startDate, lte: endDate },
    },
    _sum: { amountCents: true },
  });

  const makerRebates = await prisma.feeLedger.aggregate({
    where: {
      entryType: 'MAKER_REBATE',
      createdAt: { gte: startDate, lte: endDate },
    },
    _sum: { amountCents: true },
  });

  return {
    totalVenueFeesCents: venueFees._sum.amountCents || 0,
    totalTakerFeesCents: takerFees._sum.amountCents || 0,
    totalMakerRebatesCents: makerRebates._sum.amountCents || 0,
    netRevenueCents: venueFees._sum.amountCents || 0,
    tradeCount: venueFees._count.id,
    periodStart: startDate,
    periodEnd: endDate,
  };
}

// ============================================================================
// LEDGER INTEGRITY VERIFICATION
// ============================================================================

/**
 * Verify ledger integrity - debits should equal credits
 */
export async function verifyLedgerIntegrity(): Promise<{
  valid: boolean;
  totalDebits: number;
  totalCredits: number;
  imbalance: number;
}> {
  const [debits, credits] = await Promise.all([
    prisma.feeLedger.aggregate({
      where: { entryDirection: 'DEBIT' },
      _sum: { amountCents: true },
    }),
    prisma.feeLedger.aggregate({
      where: { entryDirection: 'CREDIT' },
      _sum: { amountCents: true },
    }),
  ]);

  const totalDebits = debits._sum.amountCents || 0;
  const totalCredits = credits._sum.amountCents || 0;
  const imbalance = totalDebits - totalCredits;

  return {
    valid: imbalance === 0,
    totalDebits,
    totalCredits,
    imbalance,
  };
}

/**
 * Verify ledger for a specific trade
 */
export async function verifyTradeLedger(tradeId: string): Promise<{
  valid: boolean;
  entries: FeeLedgerEntry[];
  totalDebits: number;
  totalCredits: number;
}> {
  const entries = await getTradeFees(tradeId);

  const totalDebits = entries
    .filter(e => e.entryDirection === 'DEBIT')
    .reduce((sum, e) => sum + e.amountCents, 0);
  const totalCredits = entries
    .filter(e => e.entryDirection === 'CREDIT')
    .reduce((sum, e) => sum + e.amountCents, 0);

  return {
    valid: totalDebits === totalCredits,
    entries,
    totalDebits,
    totalCredits,
  };
}
