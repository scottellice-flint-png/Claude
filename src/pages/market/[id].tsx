import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useStore } from '@/store';
import TradePanel from '@/components/TradePanel';
import PriceChart from '@/components/PriceChart';
import { Comment } from '@/types';

export default function MarketPage() {
  const router = useRouter();
  const { id } = router.query;
  const { data: session } = useSession();

  const [selectedSide, setSelectedSide] = useState<'yes' | 'no'>('yes');
  const [timeFilter, setTimeFilter] = useState<'1D' | '1W' | '1M' | 'ALL'>('1M');
  const [expandedSections, setExpandedSections] = useState({
    rules: true,
    timeline: false,
    prohibitions: false,
  });
  const [commentText, setCommentText] = useState('');
  const [commentTab, setCommentTab] = useState<'event' | 'all'>('event');
  const [isSaved, setIsSaved] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [selectedOutcome, setSelectedOutcome] = useState<{ id: string; name: string; yesPrice: number; noPrice: number } | null>(null);
  const [showMobileBetModal, setShowMobileBetModal] = useState(false);

  const market = useStore((state) => state.getMarket(id as string));
  const updateMarketPrice = useStore((state) => state.updateMarketPrice);
  const relatedMarkets = useStore((state) => state.getRelatedMarkets(id as string));
  const comments = useStore((state) => state.getMarketComments(id as string));
  const rules = useStore((state) => state.getMarketRules(id as string));
  const addComment = useStore((state) => state.addComment);

  // Handle copy link
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy link');
    }
  };

  // Handle save market
  const handleSaveMarket = () => {
    setIsSaved(!isSaved);
  };

  // Format volume
  const formatVolume = (volume: number) => {
    if (volume >= 1000000) {
      return `$${(volume / 1000000).toFixed(2)}M`;
    }
    if (volume >= 1000) {
      return `$${Math.round(volume / 1000)}K`;
    }
    return `$${volume}`;
  };

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

  const toggleSection = (section: 'rules' | 'timeline' | 'prohibitions') => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Handle outcome selection
  const handleOutcomeSelect = (outcome: { id: string; name: string; yesPrice: number; noPrice: number }, side: 'yes' | 'no') => {
    setSelectedOutcome(outcome);
    setSelectedSide(side);
    // On mobile, show the bet modal
    if (window.innerWidth < 1024) {
      setShowMobileBetModal(true);
    }
  };

  // Close mobile modal
  const closeMobileBetModal = () => {
    setShowMobileBetModal(false);
  };

  const handleAddComment = () => {
    if (!commentText.trim() || !market) return;
    addComment(market.id, commentText);
    setCommentText('');
  };

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
    politics: 'Politics',
    economics: 'Economics',
    climate: 'Climate',
    sports: 'Sports',
    culture: 'Culture',
    world: 'World',
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex-1">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <Link href="/" className="hover:text-foremark-green">
              Markets
            </Link>
            <span>·</span>
            <Link href={`/?category=${market.category}`} className="hover:text-foremark-green font-medium">
              {categoryLabels[market.category]}
            </Link>
            {market.subcategory && (
              <>
                <span>·</span>
                <span className="uppercase text-xs">{market.subcategory.replace(/-/g, ' ')}</span>
              </>
            )}
          </div>

          {/* Title */}
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight mb-4">
            {market.title}
          </h1>

          {/* Chart Legend - only show colored dots with names for multi-outcome markets (no percentages here - shown in outcomes list) */}
          {market.outcomes && market.outcomes.length > 0 && (
            <div className="flex flex-wrap items-center gap-4 mb-4">
              {market.outcomes.slice(0, 3).map((outcome, index) => (
                <div key={outcome.id} className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${
                    index === 0 ? 'bg-foremark-green' : index === 1 ? 'bg-foremark-lime' : 'bg-gray-500'
                  }`}></span>
                  <span className="text-sm text-gray-700">{outcome.name}</span>
                </div>
              ))}
            </div>
          )}

          {/* Volume/Amount Wagered */}
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              <span className="font-semibold text-gray-900">{formatVolume(market.volume)}</span>
              <span>wagered</span>
            </div>
          </div>

          {/* Action Icons - Kalshi Style */}
          <div className="flex items-center gap-2 relative">
            {/* Comment */}
            <button
              onClick={() => {
                const commentsSection = document.getElementById('comments-section');
                commentsSection?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-full hover:bg-gray-100 transition-colors text-gray-600"
              title="Comment"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span className="text-sm font-medium">{comments.length}</span>
            </button>

            {/* Share/Copy Link */}
            <div className="relative">
              <button
                onClick={() => setShowShareMenu(!showShareMenu)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-full hover:bg-gray-100 transition-colors text-gray-600"
                title="Share"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              </button>

              {/* Share Dropdown */}
              {showShareMenu && (
                <div className="absolute left-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50">
                  <button
                    onClick={() => {
                      handleCopyLink();
                      setShowShareMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                    <span className="text-sm font-medium">Copy link</span>
                  </button>
                  {session?.user && (
                    <Link
                      href={`/chats?market=${market.id}`}
                      onClick={() => setShowShareMenu(false)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                      </svg>
                      <span className="text-sm font-medium">Share with friends</span>
                    </Link>
                  )}
                  <Link
                    href="/community"
                    onClick={() => setShowShareMenu(false)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <span className="text-sm font-medium">Discuss in community</span>
                  </Link>
                </div>
              )}
            </div>

            {/* Copy Success Toast */}
            {copySuccess && (
              <div className="absolute left-0 top-full mt-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg">
                Link copied!
              </div>
            )}

            {/* Save/Bookmark */}
            <button
              onClick={handleSaveMarket}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-full hover:bg-gray-100 transition-colors ${
                isSaved ? 'text-foremark-green' : 'text-gray-600'
              }`}
              title={isSaved ? 'Saved' : 'Save'}
            >
              <svg
                className="w-5 h-5"
                fill={isSaved ? 'currentColor' : 'none'}
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Chart & Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Chart Section */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* Time Filter Tabs */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <div className="flex items-center gap-1">
                {(['1D', '1W', '1M', 'ALL'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setTimeFilter(filter)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                      timeFilter === filter
                        ? 'bg-foremark-green text-white'
                        : 'text-gray-500 hover:bg-gray-100'
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
              <div className="text-sm text-gray-500">
                ${(market.volume / 1000000).toFixed(1)}M vol
              </div>
            </div>

            {/* Chart */}
            <div className="p-4">
              <PriceChart marketId={market.id} currentPrice={market.yesPrice} outcomes={market.outcomes} />
            </div>

            {/* Price Info Bar */}
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-100">
              <div className="flex items-center gap-6">
                <div>
                  <span className="text-2xl font-bold text-gray-900">{market.yesPrice}¢</span>
                  <span className="text-sm text-gray-500 ml-2">Yes</span>
                </div>
                <div className="text-foremark-green font-semibold">
                  +{Math.floor(Math.random() * 5 + 1)}%
                </div>
              </div>
              <div className="text-sm text-gray-500">
                Closes: {new Date(market.closeDate).toLocaleDateString('en-AU', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </div>
            </div>
          </div>

          {/* Outcomes List - Clickable contracts like Kalshi */}
          {market.outcomes && market.outcomes.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <span className="text-sm text-gray-500">Chance</span>
                <button className="text-gray-400 hover:text-gray-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                  </svg>
                </button>
              </div>

              {/* Outcomes */}
              <div className="divide-y divide-gray-100">
                {market.outcomes.map((outcome) => (
                  <div
                    key={outcome.id}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => handleOutcomeSelect(outcome, 'yes')}
                  >
                    {/* Avatar placeholder */}
                    <div className="w-12 h-12 bg-gray-200 rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden">
                      <span className="text-gray-500 text-lg font-semibold">
                        {outcome.name.charAt(0)}
                      </span>
                    </div>

                    {/* Name */}
                    <div className="flex-1 min-w-0">
                      <span className="text-gray-900 font-medium">{outcome.name}</span>
                    </div>

                    {/* Probability */}
                    <div className="text-right mr-2">
                      <span className="text-xl font-bold text-gray-900">
                        {outcome.probability < 1 ? '<1' : outcome.probability}%
                      </span>
                    </div>

                    {/* Yes/No Buttons */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOutcomeSelect(outcome, 'yes');
                        }}
                        className={`px-4 py-2 text-sm font-semibold rounded-full border-2 transition-all ${
                          selectedOutcome?.id === outcome.id && selectedSide === 'yes'
                            ? 'bg-foremark-lime border-foremark-lime text-gray-900'
                            : 'border-foremark-lime text-foremark-green hover:bg-foremark-lime/10'
                        }`}
                      >
                        Yes {outcome.yesPrice}¢
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOutcomeSelect(outcome, 'no');
                        }}
                        className={`px-4 py-2 text-sm font-semibold rounded-full border-2 transition-all ${
                          selectedOutcome?.id === outcome.id && selectedSide === 'no'
                            ? 'bg-gray-900 border-gray-900 text-white'
                            : 'border-gray-200 text-gray-700 hover:border-gray-400'
                        }`}
                      >
                        No {outcome.noPrice > 0 ? `${outcome.noPrice}¢` : ''}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Single outcome market - show simple bet card */}
          {(!market.outcomes || market.outcomes.length === 0) && (
            <div className="lg:hidden">
              <TradePanel
                market={market}
                selectedSide={selectedSide}
                onSideChange={setSelectedSide}
              />
            </div>
          )}

          {/* Rules Summary */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <button
              onClick={() => toggleSection('rules')}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-foremark-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="font-semibold text-gray-900">Rules summary</span>
              </div>
              <svg
                className={`w-5 h-5 text-gray-400 transition-transform ${expandedSections.rules ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {expandedSections.rules && rules && (
              <div className="px-4 pb-4 border-t border-gray-100">
                <p className="text-gray-700 mt-4 leading-relaxed">{rules.summary}</p>
                <p className="text-sm text-gray-500 mt-3">
                  Outcome verified from <span className="text-foremark-green font-medium">{rules.resolutionSource}</span>
                </p>
                <div className="flex gap-3 mt-4">
                  <button className="text-sm text-foremark-green hover:underline font-medium">
                    View full rules
                  </button>
                  <button className="text-sm text-foremark-green hover:underline font-medium">
                    Help center
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Timeline and Payout */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <button
              onClick={() => toggleSection('timeline')}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-foremark-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-semibold text-gray-900">Timeline and payout</span>
              </div>
              <svg
                className={`w-5 h-5 text-gray-400 transition-transform ${expandedSections.timeline ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {expandedSections.timeline && rules && (
              <div className="px-4 pb-4 border-t border-gray-100">
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-medium">Trading Closes</p>
                    <p className="text-sm text-gray-900 mt-1">{rules.timeline.tradingCloses}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-medium">Resolution Expected</p>
                    <p className="text-sm text-gray-900 mt-1">{rules.timeline.resolutionExpected}</p>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-700">
                    <strong>Payout:</strong> If your prediction is correct, you receive $1.00 per contract. Your profit is $1.00 minus your purchase price.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Trading Prohibitions */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <button
              onClick={() => toggleSection('prohibitions')}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-foremark-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span className="font-semibold text-gray-900">Trading prohibitions</span>
              </div>
              <svg
                className={`w-5 h-5 text-gray-400 transition-transform ${expandedSections.prohibitions ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {expandedSections.prohibitions && rules && (
              <div className="px-4 pb-4 border-t border-gray-100">
                <p className="text-sm text-gray-700 mt-4 mb-3">
                  The following persons are prohibited from trading in this market:
                </p>
                <ul className="space-y-2">
                  {rules.prohibitions.map((prohibition, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
                      <span className="text-foremark-green mt-0.5">•</span>
                      {prohibition}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Related Markets */}
          {relatedMarkets.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="font-semibold text-gray-900 mb-4">People are also buying</h3>
              <div className="space-y-3">
                {relatedMarkets.map((relatedMarket) => (
                  <Link
                    key={relatedMarket.id}
                    href={`/market/${relatedMarket.id}`}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-10 h-10 bg-foremark-green/10 rounded-lg flex items-center justify-center">
                      <span className="text-foremark-green text-lg">📊</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {relatedMarket.title}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-semibold text-gray-900">{relatedMarket.yesPrice}¢</span>
                    </div>
                  </Link>
                ))}
              </div>
              <button className="text-sm text-foremark-green hover:underline font-medium mt-3">
                Show more
              </button>
            </div>
          )}

          {/* Comments Section */}
          <div id="comments-section" className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* Tab Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setCommentTab('event')}
                  className={`text-sm font-medium pb-1 ${
                    commentTab === 'event'
                      ? 'text-gray-900 border-b-2 border-foremark-green'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Ideas
                </button>
                <button
                  onClick={() => setCommentTab('all')}
                  className={`text-sm font-medium pb-1 ${
                    commentTab === 'all'
                      ? 'text-gray-900 border-b-2 border-foremark-green'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Activity
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button className="px-3 py-1.5 text-xs font-medium bg-gray-900 text-white rounded-full">
                  This event
                </button>
                <button className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-full">
                  All
                </button>
              </div>
            </div>

            {/* Comment Input */}
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-foremark-lime rounded-full flex items-center justify-center text-sm font-bold text-foremark-green">
                  T
                </div>
                <div className="flex-1">
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="What's your prediction?"
                    className="w-full p-3 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-foremark-green/20 focus:border-foremark-green text-sm"
                    rows={2}
                  />
                  <div className="flex items-center justify-between mt-2">
                    <button className="text-sm text-gray-400 hover:text-gray-600">
                      GIF
                    </button>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">{300 - commentText.length}</span>
                      <button
                        onClick={handleAddComment}
                        disabled={!commentText.trim()}
                        className="px-4 py-1.5 bg-foremark-green text-white text-sm font-medium rounded-full hover:bg-foremark-green-light disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Post
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Comments List */}
            <div className="divide-y divide-gray-100">
              {comments.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <p className="text-sm">No comments yet. Be the first to share your prediction!</p>
                </div>
              ) : (
                comments.map((comment) => (
                  <CommentItem key={comment.id} comment={comment} />
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Trade Panel (desktop only) */}
        <div className="hidden lg:block lg:col-span-1">
          <div className="sticky top-20">
            <TradePanel
              market={market}
              selectedSide={selectedSide}
              onSideChange={setSelectedSide}
              selectedOutcome={selectedOutcome?.name}
              outcomeYesPrice={selectedOutcome?.yesPrice}
              outcomeNoPrice={selectedOutcome?.noPrice}
            />
          </div>
        </div>
      </div>

      {/* Mobile Bottom Sheet Modal for Betting */}
      {showMobileBetModal && selectedOutcome && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={closeMobileBetModal}
          />

          {/* Modal */}
          <div className="absolute inset-x-0 bottom-0 bg-white rounded-t-2xl max-h-[90vh] overflow-hidden animate-slide-up">
            {/* Header with close button */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <div className="flex items-start gap-3 flex-1">
                <div className="w-10 h-10 bg-gray-200 rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden">
                  <span className="text-gray-500 text-lg font-semibold">
                    {selectedOutcome.name.charAt(0)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{market.title}</p>
                  <p className="text-sm">
                    <span className={`font-semibold ${selectedSide === 'yes' ? 'text-foremark-green' : 'text-gray-700'}`}>
                      Place Bet {selectedSide === 'yes' ? 'Yes' : 'No'}
                    </span>
                    <span className="text-gray-500"> · {selectedOutcome.name}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={closeMobileBetModal}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Trade Panel Content */}
            <div className="p-4 overflow-y-auto max-h-[calc(90vh-60px)]">
              <TradePanel
                market={market}
                selectedSide={selectedSide}
                onSideChange={setSelectedSide}
                selectedOutcome={selectedOutcome.name}
                outcomeYesPrice={selectedOutcome.yesPrice}
                outcomeNoPrice={selectedOutcome.noPrice}
              />
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

function CommentItem({ comment }: { comment: Comment }) {
  const [showReplies, setShowReplies] = useState(false);

  const timeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d`;
    if (hours > 0) return `${hours}h`;
    return 'now';
  };

  return (
    <div className="p-4">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-sm font-bold text-gray-600">
          {comment.username.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-900 text-sm">{comment.username}</span>
            <span className="text-xs text-gray-400">{timeAgo(comment.createdAt)}</span>
            {comment.position && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                comment.position.side === 'yes'
                  ? 'bg-foremark-lime/30 text-foremark-green'
                  : 'bg-gray-200 text-gray-700'
              }`}>
                {comment.position.side === 'yes' ? 'Yes' : 'No'} · {comment.position.marketTitle?.slice(0, 20)}...
              </span>
            )}
          </div>
          <p className="text-gray-700 text-sm mt-1 leading-relaxed">{comment.content}</p>

          {/* Actions */}
          <div className="flex items-center gap-4 mt-2">
            <button className="flex items-center gap-1 text-gray-400 hover:text-gray-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span className="text-xs">{comment.replies.length || ''}</span>
            </button>
            <button className="flex items-center gap-1 text-gray-400 hover:text-red-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              <span className="text-xs">{comment.likes || ''}</span>
            </button>
            <button className="text-gray-400 hover:text-gray-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            </button>
            <button className="text-gray-400 hover:text-gray-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </button>
          </div>

          {/* Replies */}
          {comment.replies.length > 0 && (
            <div className="mt-3">
              <button
                onClick={() => setShowReplies(!showReplies)}
                className="text-xs text-foremark-green hover:underline font-medium"
              >
                {showReplies ? 'Hide replies' : `Show ${comment.replies.length} ${comment.replies.length === 1 ? 'reply' : 'replies'}`}
              </button>
              {showReplies && (
                <div className="mt-2 space-y-3 pl-4 border-l-2 border-gray-100">
                  {comment.replies.map((reply) => (
                    <div key={reply.id} className="pt-2">
                      <div className="flex items-start gap-2">
                        <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-xs font-bold text-gray-600">
                          {reply.username.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900 text-xs">{reply.username}</span>
                            <span className="text-xs text-gray-400">{reply.createdAt}</span>
                          </div>
                          <p className="text-gray-700 text-xs mt-0.5">{reply.content}</p>
                          <div className="flex items-center gap-3 mt-1">
                            <button className="flex items-center gap-1 text-gray-400 hover:text-red-500">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                              </svg>
                              <span className="text-xs">{reply.likes || ''}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
