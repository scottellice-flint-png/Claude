// ============================================================================
// TRADING API - Liquidity State Endpoint
// GET: Get market liquidity state for Sharp Shield V2 bet cap display
// ============================================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { getMarketLiquidityState } from '@/services/tradingEngineService';

// Sharp Shield V2 Tier Configuration
const TIER_CONFIG = {
  // Thresholds in cents
  TIER_THRESHOLDS: [100000, 1000000, 10000000], // $1k, $10k, $100k
  // Max bet for takers (in cents)
  TIER_MAX_TAKER: [10000, 50000, 200000, 500000], // $100, $500, $2k, $5k
  // Max bet for makers (in cents)
  TIER_MAX_MAKER: [25000, 100000, 500000, 1000000], // $250, $1k, $5k, $10k
};

function getTierFromLiquidity(effectiveDepthCents: number): number {
  const thresholds = TIER_CONFIG.TIER_THRESHOLDS;
  if (effectiveDepthCents < thresholds[0]) return 0;
  if (effectiveDepthCents < thresholds[1]) return 1;
  if (effectiveDepthCents < thresholds[2]) return 2;
  return 3;
}

function getTierName(tier: number): string {
  const names = ['Seed', 'Growth', 'Established', 'Mature'];
  return names[tier] || 'Unknown';
}

function getLiquidityTierName(tier: number): string {
  if (tier === 0) return 'seed';
  if (tier === 1) return 'growth';
  return 'mature';
}

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
      // Return default state for markets without liquidity yet (Tier 0)
      const tier = 0;
      const maxTakerCents = TIER_CONFIG.TIER_MAX_TAKER[tier];
      const maxMakerCents = TIER_CONFIG.TIER_MAX_MAKER[tier];

      return res.status(200).json({
        marketId,
        totalLiquidityCents: '0',
        bidLiquidityCents: '0',
        askLiquidityCents: '0',
        effectiveDepthCents: 0,
        bestBidCents: null,
        bestAskCents: null,
        midPriceCents: 50,
        spreadCents: null,
        liquidityTier: 'seed',
        sharpShieldTier: tier,
        maxBetCents: maxTakerCents,
        maxTakerCents,
        maxMakerCents,
        spreadMultiplier: 1.0,
        spreadReason: 'NORMAL',
        tradesLast2Sec: 0,

        // Human-readable info for UI
        maxBetDisplay: `$${(maxTakerCents / 100).toLocaleString()}`,
        maxTakerDisplay: `$${(maxTakerCents / 100).toLocaleString()}`,
        maxMakerDisplay: `$${(maxMakerCents / 100).toLocaleString()}`,
        liquidityTierDisplay: `${getTierName(tier)} Phase`,
        betCapReason: 'New market building liquidity. Bet limits increase as liquidity grows.',
        isSpreadWidened: false,
        spreadWarning: null,
      });
    }

    // Calculate tier from effective depth
    const effectiveDepthCents = Number(liquidityState.totalLiquidityCents) || 0;
    const tier = getTierFromLiquidity(effectiveDepthCents);
    const maxTakerCents = TIER_CONFIG.TIER_MAX_TAKER[tier];
    const maxMakerCents = TIER_CONFIG.TIER_MAX_MAKER[tier];
    const liquidityTier = getLiquidityTierName(tier);

    return res.status(200).json({
      marketId: liquidityState.marketId,
      totalLiquidityCents: liquidityState.totalLiquidityCents.toString(),
      bidLiquidityCents: liquidityState.bidLiquidityCents.toString(),
      askLiquidityCents: liquidityState.askLiquidityCents.toString(),
      effectiveDepthCents,
      bestBidCents: liquidityState.bestBidCents,
      bestAskCents: liquidityState.bestAskCents,
      midPriceCents: liquidityState.midPriceCents,
      spreadCents: liquidityState.spreadCents,
      liquidityTier,
      sharpShieldTier: tier,
      maxBetCents: maxTakerCents,
      maxTakerCents,
      maxMakerCents,
      spreadMultiplier: liquidityState.spreadMultiplier,
      spreadReason: liquidityState.spreadReason,
      tradesLast2Sec: liquidityState.tradesLast2Sec,

      // Human-readable info for UI
      maxBetDisplay: `$${(maxTakerCents / 100).toLocaleString()}`,
      maxTakerDisplay: `$${(maxTakerCents / 100).toLocaleString()}`,
      maxMakerDisplay: `$${(maxMakerCents / 100).toLocaleString()}`,
      liquidityTierDisplay: `${getTierName(tier)} Phase`,
      betCapReason: tier === 0
        ? 'New market building liquidity. Bet limits increase as liquidity grows.'
        : tier === 1
        ? 'Growing market with moderate liquidity.'
        : tier === 2
        ? 'Established market with good liquidity.'
        : 'Mature market with deep liquidity.',

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
