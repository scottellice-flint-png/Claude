// ============================================================================
// ADMIN API - Settlement Endpoint
// POST: Settle or refund a market (NT 2024 compliant)
// GET: Get settlement status and history
// ============================================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { withAdminAuth, type AdminSession, type AdminContext } from '@/lib/adminAuth';
import {
  settleMarket,
  refundMarket,
  getSettlement,
  getMarketSettlements,
  getPendingSettlements,
  getSettlementStats,
} from '@/services/settlementService';

async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  _session: AdminSession,
  ctx: AdminContext
) {
  switch (req.method) {
    case 'POST':
      return handleSettlement(req, res, ctx.userId);

    case 'GET':
      return handleGetSettlement(req, res);

    default:
      res.setHeader('Allow', ['POST', 'GET']);
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

// ============================================================================
// SETTLEMENT (POST)
// ============================================================================

async function handleSettlement(
  req: NextApiRequest,
  res: NextApiResponse,
  adminId: string
) {
  try {
    const { action, marketId, winningOutcomeId, resolutionSource, resolutionEvidence, reason } = req.body;

    if (!marketId) {
      return res.status(400).json({
        error: 'Market ID is required',
        code: 'VALIDATION_ERROR',
      });
    }

    if (!['settle', 'refund'].includes(action)) {
      return res.status(400).json({
        error: 'Action must be "settle" or "refund"',
        code: 'VALIDATION_ERROR',
      });
    }

    if (action === 'settle') {
      // NT 2024 requirement: must have resolution source
      if (!resolutionSource) {
        return res.status(400).json({
          error: 'Resolution source is required for NT compliance',
          code: 'NT_COMPLIANCE_ERROR',
        });
      }

      if (!winningOutcomeId) {
        return res.status(400).json({
          error: 'Winning outcome ID is required for settlement',
          code: 'VALIDATION_ERROR',
        });
      }

      const result = await settleMarket({
        marketId,
        winningOutcomeId,
        resolutionSource,
        resolutionEvidence,
        adminId,
      });

      if (!result.success) {
        return res.status(400).json({
          error: result.error,
          code: result.reasonCode,
        });
      }

      return res.status(200).json({
        success: true,
        settlementId: result.settlementId,
        totalPayoutCents: result.totalPayoutCents,
        payoutsProcessed: result.payoutsProcessed,
        reasonCode: result.reasonCode,
      });
    } else {
      // Refund
      if (!reason) {
        return res.status(400).json({
          error: 'Reason is required for refund',
          code: 'VALIDATION_ERROR',
        });
      }

      const result = await refundMarket({
        marketId,
        reason,
        adminId,
      });

      if (!result.success) {
        return res.status(400).json({
          error: result.error,
          code: result.reasonCode,
        });
      }

      return res.status(200).json({
        success: true,
        settlementId: result.settlementId,
        totalRefundCents: result.totalRefundCents,
        payoutsProcessed: result.payoutsProcessed,
        reasonCode: result.reasonCode,
      });
    }
  } catch (error) {
    console.error('Settlement error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
    });
  }
}

// ============================================================================
// GET SETTLEMENT (GET)
// ============================================================================

async function handleGetSettlement(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const { settlementId, marketId, pending, stats, startDate, endDate } = req.query;

    // Get specific settlement
    if (settlementId) {
      const settlement = await getSettlement(settlementId as string);

      if (!settlement) {
        return res.status(404).json({
          error: 'Settlement not found',
          code: 'NOT_FOUND',
        });
      }

      return res.status(200).json({ settlement });
    }

    // Get market settlements
    if (marketId) {
      const settlements = await getMarketSettlements(marketId as string);
      return res.status(200).json({ settlements });
    }

    // Get pending settlements
    if (pending === 'true') {
      const settlements = await getPendingSettlements();
      return res.status(200).json({ settlements });
    }

    // Get settlement stats
    if (stats === 'true') {
      const statsData = await getSettlementStats(
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );

      return res.status(200).json({
        stats: {
          ...statsData,
          totalPayoutCents: statsData.totalPayoutCents.toString(),
          totalRefundCents: statsData.totalRefundCents.toString(),
        },
      });
    }

    // Default: get pending settlements
    const settlements = await getPendingSettlements();
    return res.status(200).json({ settlements });
  } catch (error) {
    console.error('Get settlement error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
    });
  }
}

export default withAdminAuth(handler, 'market:settle');
