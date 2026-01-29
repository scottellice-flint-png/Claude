import { useEffect, useCallback } from 'react';
import { useStore } from '@/store';

export function useRealTimePrice(marketId: string, enabled: boolean = true) {
  const updateMarketPrice = useStore((state) => state.updateMarketPrice);
  const market = useStore((state) => state.getMarket(marketId));

  const simulatePriceChange = useCallback(() => {
    if (!market) return;

    // Random walk with mean reversion
    const volatility = 2;
    const meanReversion = 0.1;
    const targetPrice = 50; // Neutral price

    const change =
      (Math.random() - 0.5) * volatility +
      (targetPrice - market.yesPrice) * meanReversion * 0.1;

    const newYesPrice = Math.max(1, Math.min(99, Math.round(market.yesPrice + change)));

    if (newYesPrice !== market.yesPrice) {
      updateMarketPrice(marketId, newYesPrice);
    }
  }, [market, marketId, updateMarketPrice]);

  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(simulatePriceChange, 2000 + Math.random() * 3000);

    return () => clearInterval(interval);
  }, [enabled, simulatePriceChange]);

  return market;
}

export function useAllMarketsRealTimePrice(enabled: boolean = true) {
  const markets = useStore((state) => state.markets);
  const updateMarketPrice = useStore((state) => state.updateMarketPrice);

  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(() => {
      // Randomly update one market
      const market = markets[Math.floor(Math.random() * markets.length)];
      if (!market) return;

      const change = (Math.random() - 0.5) * 3;
      const newYesPrice = Math.max(1, Math.min(99, Math.round(market.yesPrice + change)));

      if (newYesPrice !== market.yesPrice) {
        updateMarketPrice(market.id, newYesPrice);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [enabled, markets, updateMarketPrice]);
}
