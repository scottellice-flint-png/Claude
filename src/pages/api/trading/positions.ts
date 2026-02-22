// ============================================================================
// TRADING API - Positions Endpoint
// GET: Get user's positions and trades
// ============================================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { getUserPositions, getUserTrades } from '@/services/tradingEngineService';
import prisma from '@/lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get user ID from session
  const userId = req.headers['x-user-id'] as string;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
  }

  // Verify user exists
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      balanceCents: true,
      lockedBalanceCents: true,
      totalProfitCents: true,
      totalTrades: true,
      totalVolumeCents: true,
    },
  });

  if (!user) {
    return res.status(404).json({ error: 'User not found', code: 'USER_NOT_FOUND' });
  }

  try {
    const { include } = req.query;
    const includeTrades = include === 'trades';

    // Get positions
    const positions = await getUserPositions(userId);

    // Calculate position values
    const formattedPositions = positions.map(pos => {
      const currentPriceCents = pos.outcome.currentPriceCents;
      const currentValueCents = Math.floor(pos.quantityCents * currentPriceCents / 100);
      const unrealizedPnlCents = currentValueCents - pos.totalCostCents;
      const unrealizedPnlPercent = pos.totalCostCents > 0
        ? (unrealizedPnlCents / pos.totalCostCents) * 100
        : 0;

      return {
        id: pos.id,
        marketId: pos.marketId,
        marketTitle: pos.market.title,
        marketStatus: pos.market.status,
        outcomeId: pos.outcomeId,
        outcomeLabel: pos.outcome.label,
        quantityCents: pos.quantityCents,
        avgPriceCents: pos.avgPriceCents,
        totalCostCents: pos.totalCostCents,
        currentPriceCents,
        currentValueCents,
        unrealizedPnlCents,
        unrealizedPnlPercent: Math.round(unrealizedPnlPercent * 100) / 100,
        realizedPnlCents: pos.realizedPnlCents,
      };
    });

    // Calculate totals
    const totalPositionValueCents = formattedPositions.reduce(
      (sum, pos) => sum + pos.currentValueCents,
      0
    );
    const totalUnrealizedPnlCents = formattedPositions.reduce(
      (sum, pos) => sum + pos.unrealizedPnlCents,
      0
    );

    const response: Record<string, unknown> = {
      account: {
        balanceCents: Number(user.balanceCents),
        lockedBalanceCents: Number(user.lockedBalanceCents),
        availableBalanceCents: Number(user.balanceCents) - Number(user.lockedBalanceCents),
        totalPositionValueCents,
        totalUnrealizedPnlCents,
        totalRealizedPnlCents: Number(user.totalProfitCents),
        totalTrades: user.totalTrades,
        totalVolumeCents: Number(user.totalVolumeCents),
      },
      positions: formattedPositions,
      positionCount: formattedPositions.length,
    };

    // Include trades if requested
    if (includeTrades) {
      const trades = await getUserTrades(userId, 50);

      response.trades = trades.map(trade => ({
        id: trade.id,
        marketId: trade.marketId,
        marketTitle: trade.market.title,
        outcomeId: trade.outcomeId,
        outcomeLabel: trade.outcome.label,
        side: trade.buyerId === userId ? 'buy' : 'sell',
        priceCents: trade.priceCents,
        quantityCents: trade.quantityCents,
        executedAt: trade.executedAt.toISOString(),
        reasonCode: trade.reasonCode,
      }));
    }

    return res.status(200).json(response);
  } catch (error) {
    console.error('Get positions error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
    });
  }
}
