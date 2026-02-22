// ============================================================================
// TRADING API - Liquidity State Endpoint
// GET: Get market liquidity state for NT bet cap display
// ============================================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { getMarketLiquidityState } from '@/services/tradingEngineService';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { marketId } = req.query;

    if (!marketId) {
      return res.status(400).json({
        error: 'Market ID is required',
        code: 'VALIDATION_ERROR',
      });
    }

    const liquidityState = await getMarketLiquidityState(marketId as string);

    if (!liquidityState) {
      // Return default state for markets without liquidity yet
      return res.status(200).json({
        marketId,
        totalLiquidityCents: '0',
        bidLiquidityCents: '0',
        askLiquidityCents: '0',
        bestBidCents: null,
        bestAskCents: null,
        midPriceCents: 50,
        spreadCents: null,
        liquidityTier: 'seed',
        maxBetCents: 50000, // $500 default cap
        spreadMultiplier: 1.0,
        spreadReason: 'NORMAL',
        tradesLast2Sec: 0,

        // Human-readable info for UI
        maxBetDisplay: '$500.00',
        liquidityTierDisplay: 'Seed Phase',
        betCapReason: 'Market liquidity is below $10,000. Maximum bet is capped at $500 to protect traders.',
      });
    }

    // Format for response
    const maxBetDisplay = `$${(liquidityState.maxBetCents / 100).toFixed(2)}`;
    const tierDisplayMap: Record<string, string> = {
      seed: 'Seed Phase',
      growth: 'Growth Phase',
      mature: 'Mature Market',
    };

    const betCapReasonMap: Record<string, string> = {
      seed: 'Market liquidity is below $10,000. Maximum bet is capped at $500 to protect traders.',
      growth: 'Market liquidity is between $10,000 and $100,000. Maximum bet is $5,000.',
      mature: 'Market has sufficient liquidity. Maximum bet is $50,000.',
    };

    return res.status(200).json({
      marketId: liquidityState.marketId,
      totalLiquidityCents: liquidityState.totalLiquidityCents.toString(),
      bidLiquidityCents: liquidityState.bidLiquidityCents.toString(),
      askLiquidityCents: liquidityState.askLiquidityCents.toString(),
      bestBidCents: liquidityState.bestBidCents,
      bestAskCents: liquidityState.bestAskCents,
      midPriceCents: liquidityState.midPriceCents,
      spreadCents: liquidityState.spreadCents,
      liquidityTier: liquidityState.liquidityTier,
      maxBetCents: liquidityState.maxBetCents,
      spreadMultiplier: liquidityState.spreadMultiplier,
      spreadReason: liquidityState.spreadReason,
      tradesLast2Sec: liquidityState.tradesLast2Sec,

      // Human-readable info for UI
      maxBetDisplay,
      liquidityTierDisplay: tierDisplayMap[liquidityState.liquidityTier] || 'Unknown',
      betCapReason: betCapReasonMap[liquidityState.liquidityTier] || '',

      // Warning if spread is widened
      isSpreadWidened: liquidityState.spreadMultiplier > 1,
      spreadWarning: liquidityState.spreadMultiplier > 1
        ? `Spread widened ${Math.round(liquidityState.spreadMultiplier * 100)}% due to ${liquidityState.spreadReason}`
        : null,
    });
  } catch (error) {
    console.error('Liquidity state error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
    });
  }
}
