import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useStore } from '@/store';
import { Market, SportType, SportSubcategory } from '@/types';
import CategoryTabs from '@/components/CategoryTabs';

// Sports configuration with labels and icons
const SPORTS_CONFIG: { id: SportType | 'all'; label: string; icon: string }[] = [
  { id: 'all', label: 'All', icon: '🏆' },
  { id: 'american-football', label: 'American Football', icon: '🏈' },
  { id: 'australian-rules', label: 'Australian Rules', icon: '🏉' },
  { id: 'baseball', label: 'Baseball', icon: '⚾' },
  { id: 'basketball', label: 'Basketball', icon: '🏀' },
  { id: 'boxing', label: 'Boxing', icon: '🥊' },
  { id: 'cricket', label: 'Cricket', icon: '🏏' },
  { id: 'golf', label: 'Golf', icon: '⛳' },
  { id: 'racing', label: 'Racing', icon: '🏇' },
  { id: 'rugby-league', label: 'Rugby League', icon: '🏈' },
  { id: 'rugby-union', label: 'Rugby Union', icon: '🏉' },
  { id: 'soccer', label: 'Soccer', icon: '⚽' },
  { id: 'tennis', label: 'Tennis', icon: '🎾' },
];

const SUBCATEGORIES: { id: SportSubcategory | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'games', label: 'Games' },
  { id: 'props', label: 'Props' },
  { id: 'futures', label: 'Futures' },
  { id: 'awards', label: 'Awards' },
];

export default function SportsPage() {
  const [selectedSport, setSelectedSport] = useState<SportType | 'all'>('all');
  const [selectedSubcategory, setSelectedSubcategory] = useState<SportSubcategory | 'all'>('all');
  const [isSportModalOpen, setIsSportModalOpen] = useState(false);

  const markets = useStore((state) => state.markets);
  const marketsLoaded = useStore((state) => state.marketsLoaded);
  const marketsLoading = useStore((state) => state.marketsLoading);
  const fetchMarkets = useStore((state) => state.fetchMarkets);

  // Ensure markets are loaded when component mounts
  useEffect(() => {
    if (!marketsLoaded && !marketsLoading) {
      fetchMarkets();
    }
  }, [marketsLoaded, marketsLoading, fetchMarkets]);

  // Filter sports markets
  const filteredMarkets = useMemo(() => {
    let filtered = markets.filter((m) => m.category === 'sports');

    if (selectedSport !== 'all') {
      filtered = filtered.filter((m) => m.sport === selectedSport);
    }

    if (selectedSubcategory !== 'all') {
      filtered = filtered.filter((m) => m.sportSubcategory === selectedSubcategory);
    }

    return filtered.sort((a, b) => b.volume - a.volume);
  }, [markets, selectedSport, selectedSubcategory]);

  // Get market counts per sport
  const sportCounts = useMemo(() => {
    const sportsMarkets = markets.filter((m) => m.category === 'sports');
    const counts: Record<string, number> = { all: sportsMarkets.length };

    SPORTS_CONFIG.forEach((sport) => {
      if (sport.id !== 'all') {
        counts[sport.id] = sportsMarkets.filter((m) => m.sport === sport.id).length;
      }
    });

    return counts;
  }, [markets]);

  const getSelectedSportLabel = () => {
    const sport = SPORTS_CONFIG.find((s) => s.id === selectedSport);
    return sport?.label || 'Sports';
  };

  const handleSportSelect = (sportId: SportType | 'all') => {
    setSelectedSport(sportId);
    setIsSportModalOpen(false);
  };

  return (
    <div className="space-y-4">
      {/* Global Category Tabs */}
      <CategoryTabs activeCategory="sports" />

      {/* Sports Content */}
      <div className="flex gap-6">
        {/* Left Sidebar - Sports List (Desktop) */}
        <aside className="hidden lg:block w-56 flex-shrink-0">
          <div className="sticky top-20">
            <nav className="space-y-1">
              {SPORTS_CONFIG.map((sport) => {
                const isActive = selectedSport === sport.id;
                const count = sportCounts[sport.id] || 0;

                // Only show sports with markets
                if (sport.id !== 'all' && count === 0) return null;

                return (
                  <button
                    key={sport.id}
                    onClick={() => setSelectedSport(sport.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-foremark-lime text-gray-900'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span>{sport.icon}</span>
                      <span>{sport.label}</span>
                    </span>
                    <span className={`text-xs ${isActive ? 'text-gray-700' : 'text-gray-400'}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          {/* Mobile Sports Header with Dropdown Trigger */}
          <div className="lg:hidden mb-4">
            <button
              onClick={() => setIsSportModalOpen(true)}
              className="flex items-center gap-2 text-2xl font-bold text-gray-900"
            >
              <span>{getSelectedSportLabel()}</span>
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          {/* Desktop Header */}
          <div className="hidden lg:flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">
              {selectedSport === 'all' ? 'Sports' : getSelectedSportLabel()}
            </h1>
          </div>

          {/* Subcategory Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-4 border-b border-gray-200">
            {SUBCATEGORIES.map((subcat) => (
              <button
                key={subcat.id}
                onClick={() => setSelectedSubcategory(subcat.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedSubcategory === subcat.id
                    ? 'bg-foremark-lime text-gray-900'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {subcat.label}
              </button>
            ))}
          </div>

          {/* Markets List */}
          {marketsLoading && !marketsLoaded ? (
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-8 h-8 bg-gray-200 rounded"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-gray-200 rounded w-24"></div>
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="h-10 bg-gray-200 rounded"></div>
                    <div className="h-10 bg-gray-200 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredMarkets.length > 0 ? (
            <div className="space-y-4">
              {filteredMarkets.map((market) => (
                <SportsMarketCard key={market.id} market={market} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
              <div className="text-5xl mb-4">🏆</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No markets found</h3>
              <p className="text-gray-500">
                Try selecting a different sport or category
              </p>
            </div>
          )}
        </main>
      </div>

      {/* Mobile Sports Modal */}
      {isSportModalOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setIsSportModalOpen(false)}
          />

          {/* Modal */}
          <div className="absolute inset-x-0 bottom-0 bg-white rounded-t-2xl max-h-[80vh] overflow-hidden animate-slide-up">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200">
              <button
                onClick={() => setIsSportModalOpen(false)}
                className="p-1"
              >
                <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <h2 className="text-lg font-semibold text-gray-900">Sports</h2>
              <div className="w-6" /> {/* Spacer for centering */}
            </div>

            {/* Sports List */}
            <div className="overflow-y-auto max-h-[calc(80vh-60px)]">
              {SPORTS_CONFIG.map((sport) => {
                const count = sportCounts[sport.id] || 0;
                const isActive = selectedSport === sport.id;

                // Only show sports with markets
                if (sport.id !== 'all' && count === 0) return null;

                return (
                  <button
                    key={sport.id}
                    onClick={() => handleSportSelect(sport.id)}
                    className={`w-full flex items-center justify-between px-4 py-4 border-b border-gray-100 transition-colors ${
                      isActive ? 'bg-foremark-lime/20' : 'hover:bg-gray-50'
                    }`}
                  >
                    <span className={`text-base ${isActive ? 'font-semibold text-foremark-green' : 'text-gray-900'}`}>
                      {sport.label}
                    </span>
                    {count > 0 && (
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}

// Sports Market Card Component
function SportsMarketCard({ market }: { market: Market }) {
  const formatVolume = (volume: number) => {
    if (volume >= 1000000) {
      return `$${(volume / 1000000).toFixed(1)}M`;
    }
    return `$${(volume / 1000).toFixed(0)}K`;
  };

  const getSportLabel = (sport?: SportType) => {
    const config = SPORTS_CONFIG.find((s) => s.id === sport);
    return config?.label || 'Sports';
  };

  return (
    <Link href={`/market/${market.id}`}>
      <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md hover:border-gray-300 transition-all">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-3 flex-1">
            <div className="text-2xl">{market.icon || '🏆'}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                <span>{getSportLabel(market.sport)}</span>
                {market.sportSubcategory && (
                  <>
                    <span>•</span>
                    <span className="capitalize">{market.sportSubcategory}</span>
                  </>
                )}
              </div>
              <h3 className="text-base font-semibold text-gray-900 leading-tight">
                {market.title}
              </h3>
            </div>
          </div>
          <div className="text-xs text-gray-400 ml-4">
            {formatVolume(market.volume)}
          </div>
        </div>

        {/* Outcomes */}
        <div className="space-y-2">
          {market.outcomes ? (
            market.outcomes.slice(0, 3).map((outcome) => (
              <div key={outcome.id} className="flex items-center justify-between py-2 border-t border-gray-100 first:border-t-0 first:pt-0">
                <span className="text-gray-700 text-sm">{outcome.name}</span>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-gray-900 w-12 text-right">
                    {outcome.probability}%
                  </span>
                  <button className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-foremark-lime text-gray-900 hover:bg-foremark-lime-dark transition-colors">
                    Yes {outcome.yesPrice}¢
                  </button>
                  <button className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors">
                    No {outcome.noPrice}¢
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="flex items-center justify-between py-2">
              <span className="text-gray-700 text-sm">Chance</span>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-gray-900 w-12 text-right">
                  {market.yesPrice}%
                </span>
                <button className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-foremark-lime text-gray-900 hover:bg-foremark-lime-dark transition-colors">
                  Yes {market.yesPrice}¢
                </button>
                <button className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors">
                  No {market.noPrice}¢
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Show more outcomes indicator */}
        {market.outcomes && market.outcomes.length > 3 && (
          <div className="mt-3 pt-3 border-t border-gray-100 text-right">
            <span className="text-xs text-foremark-green font-medium">
              +{market.outcomes.length - 3} more
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}
