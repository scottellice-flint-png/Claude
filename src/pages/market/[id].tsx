import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useStore } from '@/store';
import TradePanel from '@/components/TradePanel';
import PriceChart from '@/components/PriceChart';

export default function MarketPage() {
  const router = useRouter();
  const { id } = router.query;

  const [selectedSide, setSelectedSide] = useState<'yes' | 'no'>('yes');

  const market = useStore((state) => state.getMarket(id as string));
  const updateMarketPrice = useStore((state) => state.updateMarketPrice);

  useEffect(() => {
    if (!market) return;

    const interval = setInterval(() => {
      const change = (Math.random() - 0.5) * 2;
      const newYesPrice = Math.max(1, Math.min(99, Math.round(market.yesPrice + change)));
      if (newYesPrice !== market.yesPrice) {
        updateMarketPrice(market.id, newYesPrice);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [market, updateMarketPrice]);

  if (!market) {
    return (
      <div className="text-center py-16">
        <div className="text-6xl mb-4">🔍</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Market not found</h2>
        <Link href="/" className="text-foremark-green hover:underline">
          ← Back to markets
        </Link>
      </div>
    );
  }

  const categoryLabels: Record<string, string> = {
    politics: 'POLITICS',
    economics: 'ECONOMICS',
    climate: 'CLIMATE',
    sports: 'SPORTS',
    culture: 'CULTURE',
  };

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <Link
        href="/"
        className="inline-flex items-center text-gray-500 hover:text-foremark-green transition-colors text-sm font-medium"
      >
        <svg
          className="w-4 h-4 mr-1"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 19l-7-7m0 0l7-7m-7 7h18"
          />
        </svg>
        MARKETS / {categoryLabels[market.category]}
      </Link>

      {/* Market Title */}
      <h1 className="text-2xl md:text-3xl font-black text-foremark-green uppercase leading-tight">
        {market.title}
      </h1>

      {/* Trading Section */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Chart Section */}
        <div className="lg:col-span-3 space-y-4">
          <PriceChart marketId={market.id} currentPrice={market.yesPrice} />

          {/* Current Price Display */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-4xl font-black text-gray-900">{market.yesPrice}¢</p>
                <p className="text-sm text-gray-500 uppercase tracking-wide">Current "Yes" Price</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-foremark-green">+4%</p>
                <p className="text-xs text-gray-400 uppercase">Last 24H</p>
              </div>
            </div>
          </div>

          {/* Market Info */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h3 className="font-bold text-gray-900 mb-3">About this market</h3>
            <p className="text-gray-600 text-sm leading-relaxed">{market.description}</p>

            <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-100">
              <div>
                <p className="text-xs text-gray-400 uppercase">Closes</p>
                <p className="text-sm font-semibold text-gray-900">
                  {new Date(market.closeDate).toLocaleDateString('en-AU', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase">Volume</p>
                <p className="text-sm font-semibold text-gray-900">
                  ${(market.volume / 1000000).toFixed(1)}M
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Trade Panel */}
        <div className="lg:col-span-2">
          <div className="sticky top-20">
            <TradePanel
              market={market}
              selectedSide={selectedSide}
              onSideChange={setSelectedSide}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
