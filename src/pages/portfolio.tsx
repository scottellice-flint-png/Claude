import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useStore } from '@/store';

export default function PortfolioPage() {
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const user = useStore((state) => state.user);
  const positions = useStore((state) => state.getUserPositions());
  const markets = useStore((state) => state.markets);

  const portfolioStats = useMemo(() => {
    const totalValue = positions.reduce((sum, p) => sum + p.currentValue, 0);
    const totalCost = positions.reduce((sum, p) => sum + p.avgPrice * p.quantity, 0);
    const totalProfit = positions.reduce((sum, p) => sum + p.profit, 0);
    const profitPercent = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;

    return {
      totalValue,
      totalCost,
      totalProfit,
      profitPercent,
      positionCount: positions.length,
    };
  }, [positions]);

  const getMarket = (marketId: string) => {
    return markets.find((m) => m.id === marketId);
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
    }).format(cents / 100);
  };

  // Group positions by category
  const positionsByCategory = useMemo(() => {
    const grouped: Record<string, typeof positions> = {};
    positions.forEach((pos) => {
      const market = getMarket(pos.marketId);
      if (market) {
        const category = market.category;
        if (!grouped[category]) grouped[category] = [];
        grouped[category].push(pos);
      }
    });
    return grouped;
  }, [positions, markets]);

  if (!user) {
    return (
      <div className="text-center py-16">
        <div className="text-6xl mb-4">🔒</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Please log in</h2>
        <p className="text-gray-500">You need to be logged in to view your positions.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero Stats Section */}
      <div className="bg-foremark-green rounded-2xl p-6 text-white -mx-4 sm:mx-0">
        <p className="text-sm text-white/70 uppercase tracking-wide mb-1">Active Positions</p>
        <p className="text-4xl font-bold mb-1">{formatCurrency(portfolioStats.totalValue)}</p>
        <p className={`text-sm ${portfolioStats.totalProfit >= 0 ? 'text-foremark-lime' : 'text-red-300'}`}>
          {portfolioStats.totalProfit >= 0 ? '+' : ''}
          {formatCurrency(portfolioStats.totalProfit)} All-time P/L
        </p>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="bg-white/10 rounded-xl p-3">
            <p className="text-xl font-bold">{portfolioStats.positionCount}</p>
            <p className="text-xs text-white/70 uppercase">Open Trades</p>
          </div>
          <div className="bg-white/10 rounded-xl p-3">
            <p className="text-xl font-bold">
              {portfolioStats.totalProfit >= 0 ? '+' : ''}
              {formatCurrency(portfolioStats.totalProfit)}
            </p>
            <p className="text-xs text-white/70 uppercase">24H Change</p>
          </div>
          <div className="bg-white/10 rounded-xl p-3">
            <p className="text-xl font-bold">
              {portfolioStats.profitPercent >= 0 ? '' : ''}
              {Math.abs(portfolioStats.profitPercent).toFixed(0)}%
            </p>
            <p className="text-xs text-white/70 uppercase">Win Rate</p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-gray-900 uppercase">My Positions</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('active')}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
              activeTab === 'active'
                ? 'bg-gray-900 text-white'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
              activeTab === 'history'
                ? 'bg-gray-900 text-white'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            History
          </button>
        </div>
      </div>

      {/* Positions by Category */}
      {positions.length > 0 ? (
        <div className="space-y-6">
          {Object.entries(positionsByCategory).map(([category, categoryPositions]) => (
            <div key={category}>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                {category}
              </p>
              <div className="space-y-3">
                {categoryPositions.map((position) => {
                  const market = getMarket(position.marketId);
                  if (!market) return null;

                  const currentPrice =
                    position.side === 'yes' ? market.yesPrice : market.noPrice;

                  return (
                    <div
                      key={position.id}
                      className="bg-white rounded-2xl border border-gray-200 p-4"
                    >
                      {/* Position Badge */}
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-bold mb-2 ${
                          position.side === 'yes'
                            ? 'bg-foremark-lime text-gray-900'
                            : 'bg-gray-900 text-white'
                        }`}
                      >
                        {position.side.toUpperCase()} ({currentPrice}¢)
                      </span>

                      {/* Market Title */}
                      <Link href={`/market/${market.id}`}>
                        <h3 className="font-bold text-gray-900 mb-3 hover:text-foremark-green">
                          {market.title}
                        </h3>
                      </Link>

                      {/* Value and P/L */}
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <p className="text-xs text-gray-400 uppercase">Initial Value</p>
                          <p className="text-lg font-bold text-gray-900">
                            {formatCurrency(position.avgPrice * position.quantity)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 uppercase">Current P/L</p>
                          <p
                            className={`text-lg font-bold ${
                              position.profit >= 0 ? 'text-foremark-green' : 'text-red-500'
                            }`}
                          >
                            {position.profit >= 0 ? '+' : ''}
                            {formatCurrency(position.profit)}
                          </p>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        <button className="flex-1 py-2.5 px-4 rounded-full bg-gray-900 text-white font-bold text-sm hover:bg-gray-800 transition-colors">
                          SELL {formatCurrency(position.currentValue)}
                        </button>
                        <Link
                          href={`/market/${market.id}`}
                          className="flex-1 py-2.5 px-4 rounded-full bg-white border-2 border-gray-900 text-gray-900 font-bold text-sm text-center hover:bg-gray-50 transition-colors"
                        >
                          ADD POSITION
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
          <div className="text-5xl mb-4">📊</div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">No positions yet</h3>
          <p className="text-gray-500 mb-4">Start trading to open your first position</p>
          <Link
            href="/"
            className="inline-flex items-center px-6 py-3 bg-foremark-lime text-gray-900 rounded-full font-bold hover:bg-foremark-lime-dark transition-colors"
          >
            Browse Markets
          </Link>
        </div>
      )}
    </div>
  );
}
