import { useMemo } from 'react';
import Link from 'next/link';
import { useStore } from '@/store';

export default function PortfolioPage() {
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
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  if (!user) {
    return (
      <div className="text-center py-16">
        <div className="text-6xl mb-4">🔒</div>
        <h2 className="text-2xl font-bold text-white mb-4">Please log in</h2>
        <p className="text-slate-400">You need to be logged in to view your portfolio.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Portfolio</h1>
        <p className="text-slate-400">Track your positions and performance</p>
      </div>

      {/* Portfolio Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
          <p className="text-sm text-slate-400 mb-1">Total Balance</p>
          <p className="text-2xl font-bold text-white">{formatCurrency(user.balance)}</p>
        </div>
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
          <p className="text-sm text-slate-400 mb-1">Portfolio Value</p>
          <p className="text-2xl font-bold text-white">
            {formatCurrency(portfolioStats.totalValue)}
          </p>
        </div>
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
          <p className="text-sm text-slate-400 mb-1">Total P&L</p>
          <p
            className={`text-2xl font-bold ${
              portfolioStats.totalProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {portfolioStats.totalProfit >= 0 ? '+' : ''}
            {formatCurrency(portfolioStats.totalProfit)}
          </p>
        </div>
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
          <p className="text-sm text-slate-400 mb-1">Return</p>
          <p
            className={`text-2xl font-bold ${
              portfolioStats.profitPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {portfolioStats.profitPercent >= 0 ? '+' : ''}
            {portfolioStats.profitPercent.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Positions */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <div className="p-5 border-b border-slate-700">
          <h2 className="text-xl font-semibold text-white">Your Positions</h2>
          <p className="text-sm text-slate-400">{portfolioStats.positionCount} active positions</p>
        </div>

        {positions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-900/50">
                <tr className="text-left text-sm text-slate-500">
                  <th className="px-5 py-3 font-medium">Market</th>
                  <th className="px-5 py-3 font-medium">Side</th>
                  <th className="px-5 py-3 font-medium text-right">Quantity</th>
                  <th className="px-5 py-3 font-medium text-right">Avg Price</th>
                  <th className="px-5 py-3 font-medium text-right">Current Price</th>
                  <th className="px-5 py-3 font-medium text-right">Value</th>
                  <th className="px-5 py-3 font-medium text-right">P&L</th>
                  <th className="px-5 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {positions.map((position) => {
                  const market = getMarket(position.marketId);
                  if (!market) return null;

                  const currentPrice =
                    position.side === 'yes' ? market.yesPrice : market.noPrice;
                  const profitPercent =
                    position.avgPrice > 0
                      ? ((currentPrice - position.avgPrice) / position.avgPrice) * 100
                      : 0;

                  return (
                    <tr key={position.id} className="hover:bg-slate-700/30">
                      <td className="px-5 py-4">
                        <Link
                          href={`/market/${market.id}`}
                          className="text-white hover:text-primary-400 font-medium line-clamp-2"
                        >
                          {market.title}
                        </Link>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                            position.side === 'yes'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-rose-500/20 text-rose-400'
                          }`}
                        >
                          {position.side.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right text-white">{position.quantity}</td>
                      <td className="px-5 py-4 text-right text-white">{position.avgPrice}¢</td>
                      <td className="px-5 py-4 text-right text-white">{currentPrice}¢</td>
                      <td className="px-5 py-4 text-right text-white">
                        {formatCurrency(position.currentValue)}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div>
                          <span
                            className={`font-medium ${
                              position.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {position.profit >= 0 ? '+' : ''}
                            {formatCurrency(position.profit)}
                          </span>
                          <span
                            className={`block text-xs ${
                              profitPercent >= 0 ? 'text-emerald-400/70' : 'text-rose-400/70'
                            }`}
                          >
                            {profitPercent >= 0 ? '+' : ''}
                            {profitPercent.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Link
                          href={`/market/${market.id}`}
                          className="text-primary-400 hover:text-primary-300 text-sm font-medium"
                        >
                          Trade
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-10 text-center">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-lg font-semibold text-white mb-2">No positions yet</h3>
            <p className="text-slate-400 mb-4">
              Start trading to build your portfolio
            </p>
            <Link
              href="/"
              className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Browse Markets
            </Link>
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
        <h2 className="text-xl font-semibold text-white mb-4">Account Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-slate-400 mb-1">Username</p>
            <p className="text-white font-medium">{user.username}</p>
          </div>
          <div>
            <p className="text-sm text-slate-400 mb-1">Email</p>
            <p className="text-white font-medium">{user.email}</p>
          </div>
          <div>
            <p className="text-sm text-slate-400 mb-1">Member Since</p>
            <p className="text-white font-medium">
              {new Date(user.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
