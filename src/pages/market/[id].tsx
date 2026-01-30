import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useStore } from '@/store';
import OrderBook from '@/components/OrderBook';
import TradePanel from '@/components/TradePanel';
import PriceChart from '@/components/PriceChart';

export default function MarketPage() {
  const router = useRouter();
  const { id } = router.query;

  const [selectedSide, setSelectedSide] = useState<'yes' | 'no'>('yes');
  const [selectedPrice, setSelectedPrice] = useState<number | undefined>();

  const market = useStore((state) => state.getMarket(id as string));
  const orderBook = useStore((state) => state.getOrderBook(id as string));
  const updateMarketPrice = useStore((state) => state.updateMarketPrice);

  // Simulate real-time price updates
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
        <h2 className="text-2xl font-bold text-white mb-4">Market not found</h2>
        <Link href="/" className="text-primary-400 hover:text-primary-300">
          ← Back to markets
        </Link>
      </div>
    );
  }

  const formatVolume = (volume: number) => {
    if (volume >= 1000000) {
      return `$${(volume / 1000000).toFixed(1)}M`;
    }
    if (volume >= 1000) {
      return `$${(volume / 1000).toFixed(0)}K`;
    }
    return `$${volume}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
    });
  };

  const categoryColors: Record<string, string> = {
    politics: 'bg-purple-500/20 text-purple-400',
    economics: 'bg-blue-500/20 text-blue-400',
    climate: 'bg-green-500/20 text-green-400',
    sports: 'bg-orange-500/20 text-orange-400',
    culture: 'bg-pink-500/20 text-pink-400',
  };

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <Link
        href="/"
        className="inline-flex items-center text-slate-400 hover:text-white transition-colors"
      >
        <svg
          className="w-5 h-5 mr-2"
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
        Back to markets
      </Link>

      {/* Market Header */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
        <div className="flex items-start justify-between mb-4">
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${
              categoryColors[market.category] || 'bg-slate-500/20 text-slate-400'
            }`}
          >
            {market.category}
          </span>
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              market.status === 'open'
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'bg-slate-500/20 text-slate-400'
            }`}
          >
            {market.status === 'open' ? 'Trading Open' : 'Closed'}
          </span>
        </div>

        <h1 className="text-2xl md:text-3xl font-bold text-white mb-4">{market.title}</h1>
        <p className="text-slate-400 mb-6">{market.description}</p>

        {/* Price Display */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-emerald-500/10 rounded-xl p-4 text-center">
            <p className="text-sm text-slate-400 mb-1">Yes</p>
            <p className="text-3xl font-bold text-emerald-400">{market.yesPrice}¢</p>
          </div>
          <div className="bg-rose-500/10 rounded-xl p-4 text-center">
            <p className="text-sm text-slate-400 mb-1">No</p>
            <p className="text-3xl font-bold text-rose-400">{market.noPrice}¢</p>
          </div>
          <div className="bg-slate-700/50 rounded-xl p-4 text-center">
            <p className="text-sm text-slate-400 mb-1">Volume</p>
            <p className="text-xl font-bold text-white">{formatVolume(market.volume)}</p>
          </div>
          <div className="bg-slate-700/50 rounded-xl p-4 text-center">
            <p className="text-sm text-slate-400 mb-1">Liquidity</p>
            <p className="text-xl font-bold text-white">{formatVolume(market.liquidity)}</p>
          </div>
        </div>

        {/* Market Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="bg-slate-900/50 rounded-lg p-3">
            <span className="text-slate-500">Market Closes</span>
            <p className="text-white">{formatDate(market.closeDate)}</p>
          </div>
          <div className="bg-slate-900/50 rounded-lg p-3">
            <span className="text-slate-500">Settlement Date</span>
            <p className="text-white">{formatDate(market.settlementDate)}</p>
          </div>
        </div>
      </div>

      {/* Trading Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart and Order Book */}
        <div className="lg:col-span-2 space-y-6">
          <PriceChart marketId={market.id} currentPrice={market.yesPrice} />
          <OrderBook
            orderBook={orderBook}
            selectedSide={selectedSide}
            onPriceSelect={setSelectedPrice}
          />
        </div>

        {/* Trade Panel */}
        <div className="lg:col-span-1">
          <div className="sticky top-24">
            <TradePanel
              market={market}
              selectedSide={selectedSide}
              onSideChange={setSelectedSide}
              selectedPrice={selectedPrice}
            />
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
        <h2 className="text-xl font-bold text-white mb-4">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-primary-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl">1</span>
            </div>
            <h3 className="font-semibold text-white mb-2">Buy Contracts</h3>
            <p className="text-sm text-slate-400">
              Buy Yes or No contracts at the current market price or set your own limit price.
            </p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-primary-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl">2</span>
            </div>
            <h3 className="font-semibold text-white mb-2">Trade Anytime</h3>
            <p className="text-sm text-slate-400">
              Sell your position at any time before the market closes to lock in profits or cut losses.
            </p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-primary-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl">3</span>
            </div>
            <h3 className="font-semibold text-white mb-2">Get Paid</h3>
            <p className="text-sm text-slate-400">
              If your prediction is correct, each contract pays out $1.00. Wrong predictions pay $0.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
