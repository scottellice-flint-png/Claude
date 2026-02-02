import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useStore } from '@/store';
import { Market } from '@/types';
import { useAllMarketsRealTimePrice } from '@/hooks/useRealTimePrice';
import CategoryTabs from '@/components/CategoryTabs';

export default function Home() {
  const router = useRouter();
  useAllMarketsRealTimePrice(true);
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Read category from URL query parameter
  useEffect(() => {
    if (router.isReady) {
      const category = router.query.category as string;
      if (category) {
        setSelectedCategory(category);
      } else {
        setSelectedCategory('all');
      }
    }
  }, [router.isReady, router.query.category]);

  // Update URL when category changes (without full page reload)
  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    if (category === 'all') {
      router.push('/', undefined, { shallow: true });
    } else {
      router.push(`/?category=${category}`, undefined, { shallow: true });
    }
  };
  const [selectedTrending, setSelectedTrending] = useState('for-you');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentSlide, setCurrentSlide] = useState(0);

  const markets = useStore((state) => state.markets);
  const updateMarketPrice = useStore((state) => state.updateMarketPrice);

  // Featured markets for carousel (top 5 by volume)
  const featuredMarkets = useMemo(() => {
    const sorted = [...markets].sort((a, b) => b.volume - a.volume);
    return sorted.slice(0, 5);
  }, [markets]);

  const currentFeaturedMarket = featuredMarkets[currentSlide];

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % featuredMarkets.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + featuredMarkets.length) % featuredMarkets.length);
  };

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  // Filter markets
  const filteredMarkets = useMemo(() => {
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

  const formatVolume = (volume: number) => {
    if (volume >= 1000000) {
      return `$${(volume / 1000000).toFixed(1)}M`;
    }
    return `$${(volume / 1000).toFixed(0)}K`;
  };

  const trendingTopics = [
    { id: 'for-you', label: 'For you' },
    { id: 'federal-election', label: 'Federal Election' },
    { id: 'aus-open', label: 'Australian Open' },
    { id: 'rba', label: 'RBA Rates' },
    { id: 'afl', label: 'AFL' },
    { id: 'oscars', label: 'Oscars' },
  ];

  return (
    <div className="space-y-6">
      {/* Category Tabs */}
      <CategoryTabs
        activeCategory={selectedCategory}
        onCategoryChange={handleCategoryChange}
      />

      {/* Explainer */}
      <p className="text-sm text-gray-500 -mt-2">
        Trade on outcomes that shape Australia and the world. From elections and interest rates to sport and culture.
      </p>

      {/* Trending Topic Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-4 px-4">
        {trendingTopics.map((topic) => (
          <button
            key={topic.id}
            onClick={() => setSelectedTrending(topic.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              selectedTrending === topic.id
                ? 'bg-foremark-lime text-gray-900'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {topic.label}
          </button>
        ))}
      </div>

      {/* Featured Market Hero Carousel - Only show on "All" tab */}
      {selectedCategory === 'all' && currentFeaturedMarket && (
        <div className="relative">
          <Link href={`/market/${currentFeaturedMarket.id}`}>
            <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left: Market Info */}
                <div>
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                    <span className="uppercase">{currentFeaturedMarket.category}</span>
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mb-4">
                    {currentFeaturedMarket.title}
                  </h2>

                  {/* Outcomes */}
                  {currentFeaturedMarket.outcomes ? (
                    <div className="space-y-3">
                      {currentFeaturedMarket.outcomes.slice(0, 2).map((outcome) => (
                        <div key={outcome.id} className="flex items-center justify-between">
                          <span className="text-gray-700">{outcome.name}</span>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-900">{outcome.probability}%</span>
                            <button className="px-3 py-1 text-xs font-semibold rounded bg-foremark-lime text-gray-900 hover:bg-foremark-lime-dark">
                              Yes
                            </button>
                            <button className="px-3 py-1 text-xs font-semibold rounded bg-gray-100 text-gray-700 hover:bg-gray-200">
                              No
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-700">Chance</span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900">{currentFeaturedMarket.yesPrice}%</span>
                        <button className="px-3 py-1 text-xs font-semibold rounded bg-foremark-lime text-gray-900">
                          Yes {currentFeaturedMarket.yesPrice}¢
                        </button>
                        <button className="px-3 py-1 text-xs font-semibold rounded bg-gray-100 text-gray-700">
                          No {currentFeaturedMarket.noPrice}¢
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="text-sm text-gray-500 mt-4">
                    {formatVolume(currentFeaturedMarket.volume)} volume
                  </div>
                </div>

                {/* Right: Mini Chart */}
                <div className="bg-gray-50 rounded-lg p-4 flex items-center justify-center">
                  <MiniChart market={currentFeaturedMarket} />
                </div>
              </div>
            </div>
          </Link>

          {/* Navigation Arrows */}
          <button
            onClick={(e) => { e.preventDefault(); prevSlide(); }}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-md border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors z-10"
            aria-label="Previous market"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={(e) => { e.preventDefault(); nextSlide(); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-md border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors z-10"
            aria-label="Next market"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Indicator Dots */}
          <div className="flex justify-center gap-2 mt-4">
            {featuredMarkets.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentSlide
                    ? 'bg-foremark-green'
                    : 'bg-gray-300 hover:bg-gray-400'
                }`}
                aria-label={`Go to market ${index + 1}`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-200">
          <div className="w-10 h-10 bg-foremark-green/10 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-foremark-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm">Secure & Transparent</p>
            <p className="text-xs text-gray-500">Trade with confidence</p>
          </div>
        </div>

        <div className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-200">
          <div className="w-10 h-10 bg-foremark-lime/30 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-foremark-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm">Manage your positions</p>
            <p className="text-xs text-gray-500">Trade on your predictions</p>
          </div>
        </div>

        <div className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-200">
          <div className="w-10 h-10 bg-foremark-green/10 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-foremark-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm">Fund your account</p>
            <p className="text-xs text-gray-500">Bank transfer, card, PayPal</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search markets"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 pl-10 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-foremark-green focus:border-transparent"
        />
        <svg
          className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
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

      {/* Markets Grid */}
      {filteredMarkets.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredMarkets.map((market) => (
            <MarketGridCard key={market.id} market={market} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <div className="text-5xl mb-4">🔍</div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">No markets found</h3>
          <p className="text-gray-500">
            Try adjusting your search or filter criteria
          </p>
        </div>
      )}
    </div>
  );
}

// Mini Chart Component
function MiniChart({ market }: { market: Market }) {
  const [points, setPoints] = useState<number[]>([]);

  useEffect(() => {
    // Generate random chart data
    const basePrice = market.yesPrice;
    const newPoints = [];
    let price = basePrice - 10 + Math.random() * 5;
    for (let i = 0; i < 20; i++) {
      price = price + (Math.random() - 0.48) * 3;
      price = Math.max(10, Math.min(90, price));
      newPoints.push(price);
    }
    newPoints.push(basePrice);
    setPoints(newPoints);
  }, [market.yesPrice]);

  if (points.length === 0) return null;

  const maxPrice = Math.max(...points);
  const minPrice = Math.min(...points);
  const range = maxPrice - minPrice || 1;

  const pathData = points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * 200;
      const y = 60 - ((p - minPrice) / range) * 50;
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-2">
        <span className="text-2xl font-bold text-gray-900">{market.yesPrice}%</span>
        <span className="text-sm text-foremark-green font-medium">
          +{Math.floor(Math.random() * 5 + 1)}%
        </span>
      </div>
      <svg viewBox="0 0 200 70" className="w-full h-16">
        <path
          d={pathData}
          fill="none"
          stroke="#0F4C4C"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <div className="flex justify-between text-xs text-gray-400 mt-1">
        <span>Jan</span>
        <span>Feb</span>
        <span>Mar</span>
        <span>Apr</span>
      </div>
    </div>
  );
}

// Market Grid Card Component
function MarketGridCard({ market }: { market: Market }) {
  const formatVolume = (volume: number) => {
    if (volume >= 1000000) {
      return `$${(volume / 1000000).toFixed(1)}M`;
    }
    return `$${(volume / 1000).toFixed(0)}K`;
  };

  return (
    <Link href={`/market/${market.id}`}>
      <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md hover:border-gray-300 transition-all h-full flex flex-col">
        {/* Icon and Title */}
        <div className="flex items-start gap-3 mb-3">
          <div className="text-2xl">{market.icon || '📊'}</div>
          <h3 className="text-sm font-semibold text-gray-900 leading-tight flex-1">
            {market.title}
          </h3>
        </div>

        {/* Outcomes */}
        <div className="flex-1 space-y-2 mb-3">
          {market.outcomes ? (
            market.outcomes.slice(0, 2).map((outcome) => (
              <div key={outcome.id} className="flex items-center justify-between text-sm">
                <span className="text-gray-600 truncate mr-2">{outcome.name}</span>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className="font-semibold text-gray-900">{outcome.probability}%</span>
                  <button className="px-2 py-0.5 text-xs font-medium rounded bg-foremark-lime text-gray-900 hover:bg-foremark-lime-dark">
                    Yes
                  </button>
                  <button className="px-2 py-0.5 text-xs font-medium rounded bg-gray-100 text-gray-600 hover:bg-gray-200">
                    No
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Chance</span>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-gray-900">{market.yesPrice}%</span>
                <button className="px-2 py-0.5 text-xs font-medium rounded bg-foremark-lime text-gray-900 hover:bg-foremark-lime-dark">
                  Yes
                </button>
                <button className="px-2 py-0.5 text-xs font-medium rounded bg-gray-100 text-gray-600 hover:bg-gray-200">
                  No
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Volume */}
        <div className="pt-2 border-t border-gray-100">
          <span className="text-xs text-gray-400">{formatVolume(market.volume)}</span>
        </div>
      </div>
    </Link>
  );
}
// Build timestamp: Fri Jan 30 05:05:03 UTC 2026
