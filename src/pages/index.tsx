import { useState, useMemo } from 'react';
import { useStore } from '@/store';
import MarketCard from '@/components/MarketCard';
import CategoryFilter from '@/components/CategoryFilter';
import { useAllMarketsRealTimePrice } from '@/hooks/useRealTimePrice';

export default function Home() {
  useAllMarketsRealTimePrice(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const markets = useStore((state) => state.markets);
  const user = useStore((state) => state.user);
  const positions = useStore((state) => state.getUserPositions());

  const filteredAndSortedMarkets = useMemo(() => {
    let filtered = markets;

    if (selectedCategory !== 'all') {
      filtered = filtered.filter((m) => m.category === selectedCategory);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (m) =>
          m.title.toLowerCase().includes(query) ||
          m.description.toLowerCase().includes(query)
      );
    }

    return [...filtered].sort((a, b) => b.volume - a.volume);
  }, [markets, selectedCategory, searchQuery]);

  const totalVolume = markets.reduce((sum, m) => sum + m.volume, 0);
  const openBets = markets.filter((m) => m.status === 'open').length;

  const portfolioValue = positions.reduce((sum, p) => sum + p.currentValue, 0);
  const portfolioProfit = positions.reduce((sum, p) => sum + p.profit, 0);
  const portfolioReturn = portfolioValue > 0
    ? ((portfolioProfit / (portfolioValue - portfolioProfit)) * 100).toFixed(1)
    : '0';

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(cents / 100);
  };

  const formatVolume = (volume: number) => {
    if (volume >= 1000000) {
      return `$${(volume / 1000000).toFixed(1)}M`;
    }
    return `$${(volume / 1000).toFixed(0)}K`;
  };

  // Get trending markets (top by volume)
  const trendingMarkets = [...markets].sort((a, b) => b.volume - a.volume).slice(0, 6);

  return (
    <div className="space-y-6">
      {/* Hero Stats Section */}
      <div className="bg-foremark-green rounded-2xl p-6 text-white -mx-4 sm:mx-0">
        <p className="text-sm text-white/70 uppercase tracking-wide mb-1">Portfolio Value</p>
        <p className="text-4xl font-bold text-foremark-lime mb-4">
          +{portfolioReturn}%
        </p>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white/10 rounded-xl p-3">
            <p className="text-xl font-bold">{formatVolume(totalVolume)}</p>
            <p className="text-xs text-white/70 uppercase">24H Vol</p>
          </div>
          <div className="bg-white/10 rounded-xl p-3">
            <p className="text-xl font-bold">{openBets}</p>
            <p className="text-xs text-white/70 uppercase">Open Bets</p>
          </div>
          <div className="bg-white/10 rounded-xl p-3">
            <p className="text-xl font-bold">#12</p>
            <p className="text-xs text-white/70 uppercase">Rank</p>
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="overflow-x-auto -mx-4 px-4">
        <CategoryFilter
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
        />
      </div>

      {/* Search */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search markets..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-white border border-gray-200 rounded-full px-5 py-3 pl-12 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-foremark-green focus:border-transparent"
        />
        <svg
          className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>

      {/* Trending Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-black text-gray-900 uppercase">Trending</h2>
          <button className="text-sm font-semibold text-foremark-green hover:underline">
            VIEW ALL
          </button>
        </div>

        {filteredAndSortedMarkets.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAndSortedMarkets.map((market, index) => (
              <MarketCard
                key={market.id}
                market={market}
                showHotBadge={index < 3}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
            <div className="text-5xl mb-4">🔍</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No markets found</h3>
            <p className="text-gray-500">
              Try adjusting your search or filter criteria
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
