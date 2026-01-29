import { useState, useMemo } from 'react';
import { useStore } from '@/store';
import MarketCard from '@/components/MarketCard';
import CategoryFilter from '@/components/CategoryFilter';
import { useAllMarketsRealTimePrice } from '@/hooks/useRealTimePrice';

export default function Home() {
  // Enable real-time price updates
  useAllMarketsRealTimePrice(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'volume' | 'newest' | 'closing'>('volume');

  const markets = useStore((state) => state.markets);

  const filteredAndSortedMarkets = useMemo(() => {
    let filtered = markets;

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((m) => m.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (m) =>
          m.title.toLowerCase().includes(query) ||
          m.description.toLowerCase().includes(query)
      );
    }

    // Sort
    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'volume':
          return b.volume - a.volume;
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'closing':
          return new Date(a.closeDate).getTime() - new Date(b.closeDate).getTime();
        default:
          return 0;
      }
    });
  }, [markets, selectedCategory, searchQuery, sortBy]);

  const totalVolume = markets.reduce((sum, m) => sum + m.volume, 0);
  const activeMarkets = markets.filter((m) => m.status === 'open').length;

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center py-8">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
          Trade on Real-World Events
        </h1>
        <p className="text-xl text-slate-400 max-w-2xl mx-auto">
          Make predictions and profit from your knowledge. Buy and sell contracts on the outcomes of events.
        </p>

        {/* Stats */}
        <div className="flex justify-center space-x-8 mt-8">
          <div className="text-center">
            <p className="text-3xl font-bold text-primary-400">
              ${(totalVolume / 1000000).toFixed(1)}M+
            </p>
            <p className="text-sm text-slate-500">Total Volume</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-primary-400">{activeMarkets}</p>
            <p className="text-sm text-slate-500">Active Markets</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-primary-400">24/7</p>
            <p className="text-sm text-slate-500">Trading</p>
          </div>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          {/* Search Input */}
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Search markets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 pl-10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <svg
              className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-500"
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

          {/* Sort Dropdown */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'volume' | 'newest' | 'closing')}
            className="bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="volume">Sort by Volume</option>
            <option value="newest">Newest First</option>
            <option value="closing">Closing Soon</option>
          </select>
        </div>

        {/* Category Filter */}
        <CategoryFilter
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
        />
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-slate-400">
          Showing <span className="text-white font-medium">{filteredAndSortedMarkets.length}</span> markets
        </p>
      </div>

      {/* Markets Grid */}
      {filteredAndSortedMarkets.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAndSortedMarkets.map((market) => (
            <MarketCard key={market.id} market={market} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-xl font-semibold text-white mb-2">No markets found</h3>
          <p className="text-slate-400">
            Try adjusting your search or filter criteria
          </p>
        </div>
      )}
    </div>
  );
}
