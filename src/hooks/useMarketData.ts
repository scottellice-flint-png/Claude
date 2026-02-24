/**
 * Market Data Hooks
 *
 * React hooks for fetching market data from the API.
 * Falls back gracefully when database is unavailable.
 */

import { useState, useEffect, useCallback } from 'react';
import { Market } from '@/types';

interface UseMarketsOptions {
  category?: string;
  sport?: string;
  refreshInterval?: number;
}

interface UseMarketsResult {
  markets: Market[];
  isLoading: boolean;
  error: string | null;
  source: 'database' | 'mock' | 'mock-fallback' | null;
  refresh: () => void;
}

export function useMarkets(options: UseMarketsOptions = {}): UseMarketsResult {
  const { category, sport, refreshInterval } = options;
  const [markets, setMarkets] = useState<Market[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<'database' | 'mock' | 'mock-fallback' | null>(null);

  const fetchMarkets = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (category) params.set('category', category);
      if (sport) params.set('sport', sport);

      const response = await fetch(`/api/markets?${params.toString()}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch markets: ${response.statusText}`);
      }

      const data = await response.json();
      setMarkets(data.markets || []);
      setSource(data.source);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [category, sport]);

  useEffect(() => {
    fetchMarkets();

    if (refreshInterval) {
      const interval = setInterval(fetchMarkets, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchMarkets, refreshInterval]);

  return { markets, isLoading, error, source, refresh: fetchMarkets };
}

interface UseMarketResult {
  market: Market | null;
  isLoading: boolean;
  error: string | null;
  source: 'database' | 'mock' | 'mock-fallback' | null;
  refresh: () => void;
}

export function useMarket(marketId: string | undefined): UseMarketResult {
  const [market, setMarket] = useState<Market | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<'database' | 'mock' | 'mock-fallback' | null>(null);

  const fetchMarket = useCallback(async () => {
    if (!marketId) {
      setMarket(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/markets/${marketId}?include=all`);

      if (!response.ok) {
        if (response.status === 404) {
          setMarket(null);
          return;
        }
        throw new Error(`Failed to fetch market: ${response.statusText}`);
      }

      const data = await response.json();
      setMarket(data.market);
      setSource(data.source);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [marketId]);

  useEffect(() => {
    fetchMarket();
  }, [fetchMarket]);

  return { market, isLoading, error, source, refresh: fetchMarket };
}

interface OrderBookLevel {
  priceCents: number;
  quantityCents: number;
  orderCount: number;
}

interface OrderBook {
  marketId: string;
  outcomeId: string;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  bestBidCents: number;
  bestAskCents: number;
  midPriceCents: number;
  spreadCents: number;
  totalBidsCents: number;
  totalAsksCents: number;
  lastUpdated: string;
  liquidity: {
    totalLiquidityCents: string;
    liquidityTier: number;
    maxBetCents: number;
    spreadMultiplier: number;
    spreadReason: string | null;
  } | null;
}

interface UseOrderBookResult {
  orderBook: OrderBook | null;
  isLoading: boolean;
  error: string | null;
  source: 'database' | 'mock' | 'mock-fallback' | null;
  refresh: () => void;
}

export function useOrderBook(
  marketId: string | undefined,
  outcomeId?: string,
  refreshInterval?: number
): UseOrderBookResult {
  const [orderBook, setOrderBook] = useState<OrderBook | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<'database' | 'mock' | 'mock-fallback' | null>(null);

  const fetchOrderBook = useCallback(async () => {
    if (!marketId) {
      setOrderBook(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams({ marketId });
      if (outcomeId) params.set('outcomeId', outcomeId);

      const response = await fetch(`/api/trading/orderbook?${params.toString()}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch order book: ${response.statusText}`);
      }

      const data = await response.json();
      setOrderBook(data);
      setSource(data.source);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [marketId, outcomeId]);

  useEffect(() => {
    fetchOrderBook();

    if (refreshInterval) {
      const interval = setInterval(fetchOrderBook, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchOrderBook, refreshInterval]);

  return { orderBook, isLoading, error, source, refresh: fetchOrderBook };
}

/**
 * Place an order via the trading API
 */
export async function placeOrder(params: {
  marketId: string;
  outcomeId: string;
  side: 'buy' | 'sell';
  priceCents: number;
  quantityCents: number;
}): Promise<{ success: boolean; orderId?: string; error?: string }> {
  try {
    const response = await fetch('/api/trading/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || 'Failed to place order' };
    }

    return { success: true, orderId: data.orderId };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}
