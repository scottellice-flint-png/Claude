import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useStore } from '@/store';
import { Market } from '@/types';
import { useAllMarketsRealTimePrice } from '@/hooks/useRealTimePrice';
import CategoryTabs from '@/components/CategoryTabs';

// Category-specific subcategories with keywords for filtering
const categorySubcategories: Record<string, { id: string; label: string; keywords: string[] }[]> = {
  all: [
    { id: 'for-you', label: 'For you', keywords: [] },
    { id: 'federal-election', label: 'Federal Election', keywords: ['election', 'vote', 'labor', 'coalition', 'liberal', 'greens'] },
    { id: 'rba', label: 'RBA Rates', keywords: ['rba', 'interest rate', 'cash rate', 'reserve bank'] },
    { id: 'oscars', label: 'Oscars', keywords: ['oscar', 'academy award', 'best picture', 'best actor'] },
    { id: 'afl', label: 'AFL', keywords: ['afl', 'premiership', 'brownlow', 'football'] },
    { id: 'climate', label: 'Climate', keywords: ['temperature', 'weather', 'emissions', 'climate'] },
  ],
  politics: [
    { id: 'all', label: 'All', keywords: [] },
    { id: 'federal-election', label: 'Federal Election', keywords: ['election', 'vote', 'voter', 'seat', 'ballot', 'writ'] },
    { id: 'leadership', label: 'Leadership', keywords: ['prime minister', 'albanese', 'dutton', 'leader', 'cabinet', 'minister'] },
    { id: 'legislation', label: 'Legislation', keywords: ['tax', 'stage 3', 'bill', 'legislation', 'parliament', 'amend'] },
    { id: 'policy', label: 'Policy', keywords: ['housing', 'safeguard', 'target', 'policy', 'reform'] },
    { id: 'state', label: 'State Politics', keywords: ['nsw', 'victoria', 'queensland', 'state', 'premier'] },
  ],
  economics: [
    { id: 'all', label: 'All', keywords: [] },
    { id: 'rba', label: 'RBA', keywords: ['rba', 'reserve bank', 'cash rate', 'interest rate', 'monetary'] },
    { id: 'inflation', label: 'Inflation', keywords: ['inflation', 'cpi', 'price', 'cost of living'] },
    { id: 'employment', label: 'Employment', keywords: ['unemployment', 'job', 'employment', 'wage', 'labour'] },
    { id: 'growth', label: 'Growth', keywords: ['gdp', 'growth', 'recession', 'economy'] },
    { id: 'housing', label: 'Housing', keywords: ['housing', 'property', 'house price', 'mortgage', 'rent'] },
    { id: 'markets', label: 'Markets', keywords: ['asx', 'stock', 'share', 'market', 'dollar', 'currency'] },
  ],
  culture: [
    { id: 'all', label: 'All', keywords: [] },
    { id: 'oscars', label: 'Oscars', keywords: ['oscar', 'academy award', 'best picture', 'best actor', 'best actress'] },
    { id: 'film', label: 'Film', keywords: ['film', 'movie', 'cinema', 'box office', 'james bond'] },
    { id: 'music', label: 'Music', keywords: ['music', 'artist', 'coachella', 'splendour', 'album', 'song'] },
    { id: 'tv', label: 'TV', keywords: ['tv', 'streaming', 'netflix', 'series', 'show'] },
    { id: 'eurovision', label: 'Eurovision', keywords: ['eurovision', 'song contest'] },
    { id: 'festivals', label: 'Festivals', keywords: ['festival', 'vivid', 'event', 'attendance'] },
  ],
  climate: [
    { id: 'all', label: 'All', keywords: [] },
    { id: 'temperature', label: 'Temperature', keywords: ['temperature', 'hottest', 'warmest', 'record', 'degree'] },
    { id: 'weather', label: 'Weather', keywords: ['rainfall', 'drought', 'weather', 'la nina', 'el nino'] },
    { id: 'emissions', label: 'Emissions', keywords: ['emissions', 'carbon', 'co2', 'greenhouse', 'net zero'] },
    { id: 'energy', label: 'Energy', keywords: ['renewable', 'solar', 'wind', 'energy', 'coal', 'gas'] },
    { id: 'policy', label: 'Policy', keywords: ['target', 'agreement', 'cop', 'paris', 'legislation'] },
  ],
  world: [
    { id: 'all', label: 'All', keywords: [] },
    { id: 'us', label: 'US Politics', keywords: ['trump', 'biden', 'us ', 'america', 'congress', 'white house'] },
    { id: 'asia', label: 'Asia', keywords: ['china', 'japan', 'korea', 'india', 'asia', 'pacific'] },
    { id: 'europe', label: 'Europe', keywords: ['uk', 'brexit', 'eu', 'europe', 'germany', 'france'] },
    { id: 'middle-east', label: 'Middle East', keywords: ['israel', 'gaza', 'iran', 'saudi', 'middle east'] },
    { id: 'global', label: 'Global', keywords: ['un', 'global', 'world', 'international', 'summit'] },
  ],
};

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
    // Reset subcategory when category changes
    setSelectedSubcategory(category === 'all' ? 'for-you' : 'all');
    if (category === 'all') {
      router.push('/', undefined, { shallow: true });
    } else {
      router.push(`/?category=${category}`, undefined, { shallow: true });
    }
  };
  const [selectedSubcategory, setSelectedSubcategory] = useState('for-you');
  const [currentSlide, setCurrentSlide] = useState(0);

  const markets = useStore((state) => state.markets);
  const updateMarketPrice = useStore((state) => state.updateMarketPrice);

  // Featured markets for carousel - prioritize AU markets
  const featuredMarkets = useMemo(() => {
    // Prioritize Australian-focused markets (politics, economics, climate, sports)
    const auCategories = ['politics', 'economics', 'climate', 'sports'];
    const auMarkets = markets.filter(m => auCategories.includes(m.category));
    const sorted = [...auMarkets].sort((a, b) => b.volume - a.volume);
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

  const formatVolume = (volume: number) => {
    if (volume >= 1000000) {
      return `$${(volume / 1000000).toFixed(1)}M`;
    }
    return `$${(volume / 1000).toFixed(0)}K`;
  };

  // Get subcategories for current category
  const currentSubcategories = categorySubcategories[selectedCategory] || categorySubcategories.all;

  // Get current subcategory config
  const currentSubcategoryConfig = useMemo(() => {
    const subcats = categorySubcategories[selectedCategory] || categorySubcategories.all;
    return subcats.find(s => s.id === selectedSubcategory) || subcats[0];
  }, [selectedCategory, selectedSubcategory]);

  // Filter markets
  const filteredMarkets = useMemo(() => {
    let filtered = markets;

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((m) => m.category === selectedCategory);
    }

    // Filter by subcategory keywords (if not "all" or "for-you")
    if (selectedSubcategory !== 'all' && selectedSubcategory !== 'for-you' && currentSubcategoryConfig?.keywords?.length > 0) {
      filtered = filtered.filter((m) => {
        const searchText = `${m.title} ${m.description}`.toLowerCase();
        return currentSubcategoryConfig.keywords.some(keyword =>
          searchText.includes(keyword.toLowerCase())
        );
      });
    }

    return [...filtered].sort((a, b) => b.volume - a.volume);
  }, [markets, selectedCategory, selectedSubcategory, currentSubcategoryConfig]);

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

      {/* Subcategory Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-4 px-4">
        {currentSubcategories.map((subcat) => (
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

      {/* Featured Market Hero Carousel - Only show on "All" tab */}
      {selectedCategory === 'all' && currentFeaturedMarket && (
        <div className="relative bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Navigation Arrows */}
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); prevSlide(); }}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-20 w-10 h-10 md:w-12 md:h-12 bg-white/90 backdrop-blur-sm rounded-r-lg shadow-md flex items-center justify-center hover:bg-white transition-colors"
            aria-label="Previous market"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); nextSlide(); }}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-20 w-10 h-10 md:w-12 md:h-12 bg-white/90 backdrop-blur-sm rounded-l-lg shadow-md flex items-center justify-center hover:bg-white transition-colors"
            aria-label="Next market"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <Link href={`/market/${currentFeaturedMarket.id}`}>
            <div className="p-4 md:p-6 hover:bg-gray-50/50 transition-colors">
              <div className="flex flex-col lg:flex-row lg:items-stretch gap-4 lg:gap-8">
                {/* Left: Market Info */}
                <div className="flex-1 min-w-0 px-6 md:px-8">
                  {/* Category Badge */}
                  <div className="mb-2">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      {currentFeaturedMarket.category}
                    </span>
                  </div>

                  {/* Title */}
                  <h2 className="text-lg md:text-xl lg:text-2xl font-bold text-gray-900 mb-4 leading-tight">
                    {currentFeaturedMarket.title}
                  </h2>

                  {/* Outcomes */}
                  <div className="space-y-2 mb-4">
                    {currentFeaturedMarket.outcomes ? (
                      currentFeaturedMarket.outcomes.slice(0, 2).map((outcome) => (
                        <div key={outcome.id} className="flex items-center justify-between gap-4">
                          <span className="text-gray-700 text-sm md:text-base truncate">{outcome.name}</span>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="font-bold text-gray-900 w-12 text-right">{outcome.probability}%</span>
                            <button className="px-3 py-1.5 text-xs font-semibold rounded-md bg-foremark-lime text-gray-900 hover:bg-foremark-lime-dark transition-colors">
                              Yes
                            </button>
                            <button className="px-3 py-1.5 text-xs font-semibold rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors">
                              No
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-gray-700 text-sm md:text-base">Chance</span>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="font-bold text-gray-900 w-12 text-right">{currentFeaturedMarket.yesPrice}%</span>
                          <button className="px-3 py-1.5 text-xs font-semibold rounded-md bg-foremark-lime text-gray-900 hover:bg-foremark-lime-dark transition-colors">
                            Yes {currentFeaturedMarket.yesPrice}¢
                          </button>
                          <button className="px-3 py-1.5 text-xs font-semibold rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors">
                            No {currentFeaturedMarket.noPrice}¢
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Volume */}
                  <div className="text-sm text-gray-500">
                    {formatVolume(currentFeaturedMarket.volume)} volume
                  </div>
                </div>

                {/* Right: Chart and Price */}
                <div className="lg:w-[320px] flex-shrink-0">
                  <div className="bg-gray-50 rounded-xl p-4 h-full flex flex-col">
                    {/* Current Price Display */}
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-3xl md:text-4xl font-bold text-gray-900">
                        {currentFeaturedMarket.yesPrice}%
                      </span>
                      <span className="text-sm font-medium text-foremark-green bg-foremark-green/10 px-2 py-1 rounded">
                        +{Math.floor(Math.random() * 5 + 1)}%
                      </span>
                    </div>

                    {/* Mini Chart */}
                    <div className="flex-1 min-h-[80px]">
                      <MiniChart market={currentFeaturedMarket} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Link>

          {/* Indicator Dots */}
          <div className="flex justify-center gap-2 pb-4">
            {featuredMarkets.map((_, index) => (
              <button
                key={index}
                onClick={(e) => { e.preventDefault(); goToSlide(index); }}
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

      {/* Info Cards - Only show on "All" tab */}
      {selectedCategory === 'all' && (
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
      )}

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
    for (let i = 0; i < 24; i++) {
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
      const x = (i / (points.length - 1)) * 280;
      const y = 55 - ((p - minPrice) / range) * 45;
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');

  // Create area fill path
  const areaPath = pathData + ` L 280 60 L 0 60 Z`;

  return (
    <div className="w-full h-full flex flex-col">
      <svg viewBox="0 0 280 65" className="w-full flex-1" preserveAspectRatio="none">
        {/* Area fill */}
        <path
          d={areaPath}
          fill="url(#chartGradient)"
        />
        {/* Line */}
        <path
          d={pathData}
          fill="none"
          stroke="#0F4C4C"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Gradient definition */}
        <defs>
          <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0F4C4C" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#0F4C4C" stopOpacity="0" />
          </linearGradient>
        </defs>
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
