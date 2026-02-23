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
  name: string;
  description: string | null;
  takerFeeBps: number;
  makerRebateBps: number;
  venueFeeBps: number;
  minFeeCents: number;
  maxFeeCents: number | null;
  isDefault: boolean;
  isActive: boolean;
}

export interface FeeCalculation {
  tradeValueCents: number;
  takerFeeCents: number;
  makerRebateCents: number;
  venueFeeCents: number;
  feeScheduleId: string;
  takerFeeBps: number;
  makerRebateBps: number;
}

export interface FeeLedgerEntry {
  id: string;
  tradeId: string;
  marketId: string;
  userId: string | null;
  entryType: 'TAKER_FEE' | 'MAKER_REBATE' | 'VENUE_FEE';
  debitCents: number;
  creditCents: number;
  feeBps: number;
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
 * Get the default fee schedule
 */
export async function getDefaultFeeSchedule(): Promise<FeeSchedule | null> {
  const schedule = await prisma.feeSchedule.findFirst({
    where: { isDefault: true, isActive: true },
  });

  if (!schedule) return null;

  return {
    id: schedule.id,
    name: schedule.name,
    description: schedule.description,
    takerFeeBps: schedule.takerFeeBps,
    makerRebateBps: schedule.makerRebateBps,
    venueFeeBps: schedule.venueFeeBps,
    minFeeCents: schedule.minFeeCents,
    maxFeeCents: schedule.maxFeeCents,
    isDefault: schedule.isDefault,
    isActive: schedule.isActive,
  };
}

/**
 * Get all active fee schedules
 */
export async function getAllFeeSchedules(): Promise<FeeSchedule[]> {
  const schedules = await prisma.feeSchedule.findMany({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
  });

  return schedules.map(s => ({
    id: s.id,
    name: s.name,
    description: s.description,
    takerFeeBps: s.takerFeeBps,
    makerRebateBps: s.makerRebateBps,
    venueFeeBps: s.venueFeeBps,
    minFeeCents: s.minFeeCents,
    maxFeeCents: s.maxFeeCents,
    isDefault: s.isDefault,
    isActive: s.isActive,
  }));
}

/**
 * Create a new fee schedule
 */
export async function createFeeSchedule(
  input: {
    name: string;
    description?: string;
    takerFeeBps: number;
    makerRebateBps: number;
    isDefault?: boolean;
  },
  adminId: string
): Promise<FeeSchedule> {
  // Venue fee is the difference
  const venueFeeBps = input.takerFeeBps - input.makerRebateBps;

  if (venueFeeBps < 0) {
    throw new Error('Maker rebate cannot exceed taker fee');
  }

  const schedule = await prisma.$transaction(async (tx) => {
    // If setting as default, unset other defaults
    if (input.isDefault) {
      await tx.feeSchedule.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    return tx.feeSchedule.create({
      data: {
        name: input.name,
        description: input.description,
        takerFeeBps: input.takerFeeBps,
        makerRebateBps: input.makerRebateBps,
        venueFeeBps,
        isDefault: input.isDefault || false,
      },
    });
  });

  await writeAuditEvent({
    eventType: 'ADMIN_ACCOUNT_ACTION',
    actorType: 'admin',
    actorId: adminId,
    reasonCode: 'FEE_SCHEDULE_CREATED',
    metadata: {
      scheduleId: schedule.id,
      name: schedule.name,
      takerFeeBps: schedule.takerFeeBps,
      makerRebateBps: schedule.makerRebateBps,
      venueFeeBps: schedule.venueFeeBps,
    },
  });

  return {
    id: schedule.id,
    name: schedule.name,
    description: schedule.description,
    takerFeeBps: schedule.takerFeeBps,
    makerRebateBps: schedule.makerRebateBps,
    venueFeeBps: schedule.venueFeeBps,
    minFeeCents: schedule.minFeeCents,
    maxFeeCents: schedule.maxFeeCents,
    isDefault: schedule.isDefault,
    isActive: schedule.isActive,
  };
}

// ============================================================================
// FEE CALCULATION
// ============================================================================

/**
 * Calculate fees for a trade
 * Does NOT apply or record fees - just calculates
 */
export async function calculateTradeFees(
  tradeValueCents: number,
  feeScheduleId?: string
): Promise<FeeCalculation> {
  // Get fee schedule
  let schedule: FeeSchedule | null;

  if (feeScheduleId) {
    const raw = await prisma.feeSchedule.findUnique({
      where: { id: feeScheduleId },
    });
    schedule = raw ? {
      id: raw.id,
      name: raw.name,
      description: raw.description,
      takerFeeBps: raw.takerFeeBps,
      makerRebateBps: raw.makerRebateBps,
      venueFeeBps: raw.venueFeeBps,
      minFeeCents: raw.minFeeCents,
      maxFeeCents: raw.maxFeeCents,
      isDefault: raw.isDefault,
      isActive: raw.isActive,
    } : null;
  } else {
    schedule = await getDefaultFeeSchedule();
  }

  if (!schedule) {
    // No fees if no schedule
    return {
      tradeValueCents,
      takerFeeCents: 0,
      makerRebateCents: 0,
      venueFeeCents: 0,
      feeScheduleId: '',
      takerFeeBps: 0,
      makerRebateBps: 0,
    };
  }

  // Calculate fees
  // fee = tradeValue * bps / 10000
  let takerFeeCents = Math.floor(tradeValueCents * schedule.takerFeeBps / 10000);
  const makerRebateCents = Math.floor(tradeValueCents * schedule.makerRebateBps / 10000);

  // Apply min/max
  takerFeeCents = Math.max(schedule.minFeeCents, takerFeeCents);
  if (schedule.maxFeeCents !== null) {
    takerFeeCents = Math.min(schedule.maxFeeCents, takerFeeCents);
  }

  // Venue keeps difference
  const venueFeeCents = takerFeeCents - makerRebateCents;

  return {
    tradeValueCents,
    takerFeeCents,
    makerRebateCents,
    venueFeeCents,
    feeScheduleId: schedule.id,
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
  fees: FeeCalculation
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
        marketId,
        userId: takerId,
        entryType: 'TAKER_FEE',
        debitCents: fees.takerFeeCents,
        creditCents: 0,
        feeBps: fees.takerFeeBps,
        feeScheduleId: fees.feeScheduleId || null,
      },
    });
    entries.push({
      id: takerEntry.id,
      tradeId: takerEntry.tradeId,
      marketId: takerEntry.marketId,
      userId: takerEntry.userId,
      entryType: takerEntry.entryType as 'TAKER_FEE',
      debitCents: takerEntry.debitCents,
      creditCents: takerEntry.creditCents,
      feeBps: takerEntry.feeBps,
      createdAt: takerEntry.createdAt,
    });

    // Maker receives rebate (CREDIT)
    if (fees.makerRebateCents > 0) {
      const makerEntry = await tx.feeLedger.create({
        data: {
          tradeId,
          marketId,
          userId: makerId,
          entryType: 'MAKER_REBATE',
          debitCents: 0,
          creditCents: fees.makerRebateCents,
          feeBps: fees.makerRebateBps,
          feeScheduleId: fees.feeScheduleId || null,
        },
      });
      entries.push({
        id: makerEntry.id,
        tradeId: makerEntry.tradeId,
        marketId: makerEntry.marketId,
        userId: makerEntry.userId,
        entryType: makerEntry.entryType as 'MAKER_REBATE',
        debitCents: makerEntry.debitCents,
        creditCents: makerEntry.creditCents,
        feeBps: makerEntry.feeBps,
        createdAt: makerEntry.createdAt,
      });

      // Credit maker's balance
      await tx.user.update({
        where: { id: makerId },
        data: { balanceCents: { increment: fees.makerRebateCents } },
      });
    }

    // Venue keeps difference (CREDIT)
    if (fees.venueFeeCents > 0) {
      const venueEntry = await tx.feeLedger.create({
        data: {
          tradeId,
          marketId,
          userId: null, // Venue has no user ID
          entryType: 'VENUE_FEE',
          debitCents: 0,
          creditCents: fees.venueFeeCents,
          feeBps: fees.takerFeeBps - fees.makerRebateBps,
          feeScheduleId: fees.feeScheduleId || null,
        },
      });
      entries.push({
        id: venueEntry.id,
        tradeId: venueEntry.tradeId,
        marketId: venueEntry.marketId,
        userId: venueEntry.userId,
        entryType: venueEntry.entryType as 'VENUE_FEE',
        debitCents: venueEntry.debitCents,
        creditCents: venueEntry.creditCents,
        feeBps: venueEntry.feeBps,
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
      feeScheduleId: fees.feeScheduleId,
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
    userId: e.userId,
    entryType: e.entryType as 'TAKER_FEE' | 'MAKER_REBATE' | 'VENUE_FEE',
    debitCents: e.debitCents,
    creditCents: e.creditCents,
    feeBps: e.feeBps,
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
  const where: Record<string, unknown> = { userId };
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) (where.createdAt as Record<string, Date>).gte = startDate;
    if (endDate) (where.createdAt as Record<string, Date>).lte = endDate;
  }

  const [feesPaid, rebatesReceived] = await Promise.all([
    prisma.feeLedger.aggregate({
      where: { ...where, entryType: 'TAKER_FEE' },
      _sum: { debitCents: true },
      _count: { id: true },
    }),
    prisma.feeLedger.aggregate({
      where: { ...where, entryType: 'MAKER_REBATE' },
      _sum: { creditCents: true },
    }),
  ]);

  const totalFeesPaidCents = feesPaid._sum.debitCents || 0;
  const totalRebatesReceivedCents = rebatesReceived._sum.creditCents || 0;

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
      _sum: { debitCents: true },
      _count: { id: true },
    }),
    prisma.feeLedger.aggregate({
      where: { ...where, entryType: 'MAKER_REBATE' },
      _sum: { creditCents: true },
    }),
    prisma.feeLedger.aggregate({
      where: { ...where, entryType: 'VENUE_FEE' },
      _sum: { creditCents: true },
    }),
  ]);

  // Get total volume
  const trades = await prisma.trade.aggregate({
    where: { marketId },
    _sum: { quantityCents: true },
  });

  return {
    totalTakerFeesCents: takerFees._sum.debitCents || 0,
    totalMakerRebatesCents: makerRebates._sum.creditCents || 0,
    totalVenueFeesCents: venueFees._sum.creditCents || 0,
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
    _sum: { creditCents: true },
    _count: { id: true },
  });

  const takerFees = await prisma.feeLedger.aggregate({
    where: {
      entryType: 'TAKER_FEE',
      createdAt: { gte: startDate, lte: endDate },
    },
    _sum: { debitCents: true },
  });

  const makerRebates = await prisma.feeLedger.aggregate({
    where: {
      entryType: 'MAKER_REBATE',
      createdAt: { gte: startDate, lte: endDate },
    },
    _sum: { creditCents: true },
  });

  return {
    totalVenueFeesCents: venueFees._sum.creditCents || 0,
    totalTakerFeesCents: takerFees._sum.debitCents || 0,
    totalMakerRebatesCents: makerRebates._sum.creditCents || 0,
    netRevenueCents: venueFees._sum.creditCents || 0,
    tradeCount: venueFees._count.id,
    periodStart: startDate,
    periodEnd: endDate,
  };
}

// ============================================================================
// LEDGER INTEGRITY VERIFICATION
// ============================================================================

/**
 * Verify ledger integrity - sum of all entries should be zero
 */
export async function verifyLedgerIntegrity(): Promise<{
  valid: boolean;
  totalDebits: number;
  totalCredits: number;
  imbalance: number;
}> {
  const [debits, credits] = await Promise.all([
    prisma.feeLedger.aggregate({
      _sum: { debitCents: true },
    }),
    prisma.feeLedger.aggregate({
      _sum: { creditCents: true },
    }),
  ]);

  const totalDebits = debits._sum.debitCents || 0;
  const totalCredits = credits._sum.creditCents || 0;
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

  const totalDebits = entries.reduce((sum, e) => sum + e.debitCents, 0);
  const totalCredits = entries.reduce((sum, e) => sum + e.creditCents, 0);

  return {
    valid: totalDebits === totalCredits,
    entries,
    totalDebits,
    totalCredits,
  };
}
