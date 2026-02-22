// ============================================================================
// TRADING API - Order Book Endpoint
// GET: Get order book for a market/outcome
// ============================================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { getOrderBook, getMarketLiquidityState } from '@/services/tradingEngineService';
import prisma from '@/lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { marketId, outcomeId } = req.query;

    if (!marketId) {
      return res.status(400).json({
        error: 'Market ID is required',
        code: 'VALIDATION_ERROR',
      });
    }

    // Get market to verify it exists and get default outcome
    const market = await prisma.market.findUnique({
      where: { id: marketId as string },
      include: {
        outcomes: {
          orderBy: { position: 'asc' },
        },
      },
    });

    if (!market) {
      return res.status(404).json({
        error: 'Market not found',
        code: 'MARKET_NOT_FOUND',
      });
    }

    // Use specified outcome or default to first (Yes)
    const targetOutcomeId = outcomeId as string || market.outcomes[0]?.id;

    if (!targetOutcomeId) {
      return res.status(400).json({
        error: 'No outcomes found for market',
        code: 'NO_OUTCOMES',
      });
    }

    // Get order book
    const orderBook = await getOrderBook(marketId as string, targetOutcomeId);

    // Get liquidity state for additional info
    const liquidityState = await getMarketLiquidityState(marketId as string);

    return res.status(200).json({
      marketId: orderBook.marketId,
      outcomeId: orderBook.outcomeId,
      bids: orderBook.bids,
      asks: orderBook.asks,
      bestBidCents: orderBook.bestBidCents,
      bestAskCents: orderBook.bestAskCents,
      midPriceCents: orderBook.midPriceCents,
      spreadCents: orderBook.spreadCents,
      totalBidsCents: orderBook.totalBidsCents,
      totalAsksCents: orderBook.totalAsksCents,
      lastUpdated: orderBook.lastUpdated,

      // Liquidity info (for NT bet cap display)
      liquidity: liquidityState ? {
        totalLiquidityCents: liquidityState.totalLiquidityCents.toString(),
        liquidityTier: liquidityState.liquidityTier,
        maxBetCents: liquidityState.maxBetCents,
        spreadMultiplier: liquidityState.spreadMultiplier,
        spreadReason: liquidityState.spreadReason,
      } : null,
    });
  } catch (error) {
    console.error('Order book error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
    });
  }
}
