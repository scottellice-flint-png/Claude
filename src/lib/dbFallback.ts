/**
 * Database Fallback Utility
 *
 * Provides graceful fallback to mock store data when PostgreSQL is unavailable.
 * This allows the app to work in demo mode without a database connection.
 */

import { useStore } from '@/store';

// Check if we can use the database
let dbAvailable: boolean | null = null;

export async function isDatabaseAvailable(): Promise<boolean> {
  // Return cached result if we've already checked
  if (dbAvailable !== null) {
    return dbAvailable;
  }

  try {
    // Dynamic import to avoid build errors when Prisma isn't available
    const { default: prisma } = await import('@/lib/prisma');
    await prisma.$queryRaw`SELECT 1`;
    dbAvailable = true;
    console.log('[DB] PostgreSQL connection successful');
    return true;
  } catch (error) {
    dbAvailable = false;
    console.log('[DB] PostgreSQL unavailable, using mock data fallback');
    return false;
  }
}

// Reset the cached status (useful for testing)
export function resetDatabaseStatus(): void {
  dbAvailable = null;
}

/**
 * Get mock markets from the Zustand store
 * Server-side compatible version
 */
export function getMockMarkets() {
  // Access the store's getState() for server-side usage
  const state = useStore.getState();
  return state.markets;
}

export function getMockMarket(id: string) {
  const state = useStore.getState();
  return state.getMarket(id);
}

export function getMockMarketComments(marketId: string) {
  const state = useStore.getState();
  return state.getMarketComments(marketId);
}

export function getMockMarketRules(marketId: string) {
  const state = useStore.getState();
  return state.getMarketRules(marketId);
}

/**
 * Generate a mock order book for a market outcome
 */
export function getMockOrderBook(marketId: string, outcomeId?: string) {
  const market = getMockMarket(marketId);
  if (!market) return null;

  // Find the outcome
  let yesPrice = market.yesPrice;
  let noPrice = market.noPrice;
  let outcomeName = 'Yes';

  if (outcomeId && market.outcomes) {
    const outcome = market.outcomes.find(o => o.id === outcomeId);
    if (outcome) {
      yesPrice = outcome.yesPrice;
      noPrice = outcome.noPrice;
      outcomeName = outcome.name;
    }
  }

  // Generate mock order book around the current price
  const midPrice = yesPrice;
  const spread = 1; // 1 cent spread

  // Generate bid levels (buy orders)
  const bids = [];
  for (let i = 0; i < 5; i++) {
    const price = midPrice - spread - i;
    if (price > 0) {
      bids.push({
        priceCents: price,
        quantityCents: Math.floor(Math.random() * 50000) + 10000,
        orderCount: Math.floor(Math.random() * 10) + 1,
      });
    }
  }

  // Generate ask levels (sell orders)
  const asks = [];
  for (let i = 0; i < 5; i++) {
    const price = midPrice + i;
    if (price <= 99) {
      asks.push({
        priceCents: price,
        quantityCents: Math.floor(Math.random() * 50000) + 10000,
        orderCount: Math.floor(Math.random() * 10) + 1,
      });
    }
  }

  const bestBid = bids[0]?.priceCents || midPrice - 1;
  const bestAsk = asks[0]?.priceCents || midPrice;

  return {
    marketId,
    outcomeId: outcomeId || `${marketId}-yes`,
    outcomeName,
    bids,
    asks,
    bestBidCents: bestBid,
    bestAskCents: bestAsk,
    midPriceCents: Math.round((bestBid + bestAsk) / 2),
    spreadCents: bestAsk - bestBid,
    totalBidsCents: bids.reduce((sum, b) => sum + b.quantityCents, 0),
    totalAsksCents: asks.reduce((sum, a) => sum + a.quantityCents, 0),
    lastUpdated: new Date().toISOString(),
    // Mock liquidity info
    liquidity: {
      totalLiquidityCents: String(Math.min(
        bids.reduce((sum, b) => sum + b.quantityCents, 0),
        asks.reduce((sum, a) => sum + a.quantityCents, 0)
      )),
      liquidityTier: 2,
      maxBetCents: 200000, // $2,000 max bet
      spreadMultiplier: 1.0,
      spreadReason: null,
    },
  };
}

/**
 * Generate mock user positions
 */
export function getMockPositions(userId: string) {
  // Return some sample positions
  return {
    account: {
      balanceCents: 1000000, // $10,000
      lockedBalanceCents: 50000, // $500 locked
      availableBalanceCents: 950000,
      totalProfitCents: 25000, // $250 profit
      totalTrades: 15,
    },
    positions: [
      {
        marketId: '1',
        marketTitle: 'Who will win the next Australian Federal Election?',
        outcomeId: '1-labor',
        outcomeName: 'Labor',
        side: 'yes',
        quantityCents: 50000,
        avgPriceCents: 52,
        currentPriceCents: 53,
        unrealizedPnlCents: 500,
      },
    ],
    recentTrades: [],
  };
}
