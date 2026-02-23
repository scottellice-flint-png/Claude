import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import AdminLayout from '@/components/admin/AdminLayout';
import type { Market, MarketStatus, MarketVersion, Category, Tag } from '@/types/admin';
import { MARKET_STATUS_LABELS, MARKET_STATUS_COLORS, MARKET_STATUS_TRANSITIONS } from '@/types/admin';

export default function MarketDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const [market, setMarket] = useState<Market | null>(null);
  const [versions, setVersions] = useState<MarketVersion[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'details' | 'trading' | 'workflow' | 'versions' | 'resolution'>('details');
  const [liquidityState, setLiquidityState] = useState<any>(null);
  const [orderBook, setOrderBook] = useState<any>(null);

  // Modal states
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [statusAction, setStatusAction] = useState<{ toStatus: MarketStatus; action: string } | null>(null);
  const [statusComments, setStatusComments] = useState('');
  const [resolution, setResolution] = useState({ resolution: 'yes', notes: '', sourceUrl: '' });

  useEffect(() => {
    if (id) {
      fetchMarket();
      fetchVersions();
      fetchCategories();
      fetchTags();
      fetchLiquidityState();
      fetchOrderBook();
    }
  }, [id]);

  const fetchLiquidityState = async () => {
    try {
      const res = await fetch(`/api/trading/liquidity?marketId=${id}`);
      if (res.ok) {
        const data = await res.json();
        setLiquidityState(data);
      }
    } catch (err) {
      console.error('Failed to fetch liquidity state:', err);
    }
  };

  const fetchOrderBook = async () => {
    try {
      const res = await fetch(`/api/trading/orderbook?marketId=${id}`);
      if (res.ok) {
        const data = await res.json();
        setOrderBook(data);
      }
    } catch (err) {
      console.error('Failed to fetch order book:', err);
    }
  };

  const fetchMarket = async () => {
    try {
      const res = await fetch(`/api/admin/markets/${id}`);
      if (res.ok) {
        const data = await res.json();
        setMarket(data);
      } else {
        setError('Market not found');
      }
    } catch (err) {
      setError('Failed to fetch market');
    } finally {
      setLoading(false);
    }
  };

  const fetchVersions = async () => {
    try {
      const res = await fetch(`/api/admin/markets/${id}/versions`);
      if (res.ok) {
        const data = await res.json();
        setVersions(data);
      }
    } catch (err) {
      console.error('Failed to fetch versions:', err);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/admin/categories');
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  };

  const fetchTags = async () => {
    try {
      const res = await fetch('/api/admin/tags');
      if (res.ok) {
        const data = await res.json();
        setTags(data);
      }
    } catch (err) {
      console.error('Failed to fetch tags:', err);
    }
  };

  const handleSave = async (updates: Partial<Market>) => {
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/markets/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const updated = await res.json();
        setMarket(updated);
        fetchVersions();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to save');
      }
    } catch (err) {
      setError('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusTransition = async () => {
    if (!statusAction) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/markets/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromStatus: market?.status,
          toStatus: statusAction.toStatus,
          action: statusAction.action,
          comments: statusComments,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setMarket(updated);
        fetchVersions();
        setShowStatusModal(false);
        setStatusComments('');
        setStatusAction(null);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to update status');
      }
    } catch (err) {
      setError('Failed to update status');
    } finally {
      setSaving(false);
    }
  };

  const handleResolve = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/markets/${id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resolution: resolution.resolution,
          resolutionNotes: resolution.notes,
          sourceUrl: resolution.sourceUrl || undefined,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setMarket(updated);
        fetchVersions();
        setShowResolveModal(false);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to resolve market');
      }
    } catch (err) {
      setError('Failed to resolve market');
    } finally {
      setSaving(false);
    }
  };

  const handleSettle = async () => {
    if (!confirm('Are you sure you want to settle this market? This will process all payouts.')) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/markets/${id}/settle`, {
        method: 'POST',
      });
      if (res.ok) {
        const updated = await res.json();
        setMarket(updated);
        fetchVersions();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to settle');
      }
    } catch (err) {
      setError('Failed to settle');
    } finally {
      setSaving(false);
    }
  };

  const handleRollback = async (versionId: string) => {
    if (!confirm('Are you sure you want to rollback to this version?')) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/markets/${id}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ versionId }),
      });
      if (res.ok) {
        const updated = await res.json();
        setMarket(updated);
        fetchVersions();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to rollback');
      }
    } catch (err) {
      setError('Failed to rollback');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout title="Loading...">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foremark-green"></div>
        </div>
      </AdminLayout>
    );
  }

  if (!market) {
    return (
      <AdminLayout title="Market Not Found">
        <div className="text-center py-12">
          <p className="text-gray-500">Market not found</p>
          <Link href="/admin/markets" className="text-foremark-green hover:underline mt-4 inline-block">
            Back to Markets
          </Link>
        </div>
      </AdminLayout>
    );
  }

  const allowedTransitions = MARKET_STATUS_TRANSITIONS[market.status as MarketStatus] || [];
  const colorMap: Record<string, string> = {
    gray: 'bg-gray-100 text-gray-700',
    yellow: 'bg-yellow-100 text-yellow-700',
    blue: 'bg-blue-100 text-blue-700',
    green: 'bg-green-100 text-green-700',
    orange: 'bg-orange-100 text-orange-700',
    purple: 'bg-purple-100 text-purple-700',
    teal: 'bg-teal-100 text-teal-700',
  };

  return (
    <>
      <Head>
        <title>{market.title} | MarketOps Admin</title>
      </Head>

      <AdminLayout title="">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              {market.icon && <span className="text-4xl">{market.icon}</span>}
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{market.title}</h1>
                <p className="text-gray-500 mt-1">{market.shortDescription}</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${colorMap[MARKET_STATUS_COLORS[market.status as MarketStatus]] || colorMap.gray}`}>
                    {MARKET_STATUS_LABELS[market.status as MarketStatus]}
                  </span>
                  <span className="text-sm text-gray-500">
                    {market.category?.name}
                    {market.subcategory && ` / ${market.subcategory.name}`}
                  </span>
                  {market.isFeatured && (
                    <span className="px-2 py-1 bg-foremark-lime/20 text-foremark-green text-xs rounded-full">
                      Featured
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href={`/market/${market.slug}`}
                target="_blank"
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                View Live
              </Link>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              {[
                { id: 'details', label: 'Details' },
                { id: 'trading', label: 'Trading' },
                { id: 'workflow', label: 'Workflow' },
                { id: 'versions', label: 'History' },
                { id: 'resolution', label: 'Resolution' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`px-6 py-4 text-sm font-medium border-b-2 ${
                    activeTab === tab.id
                      ? 'border-foremark-green text-foremark-green'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {/* Details Tab */}
            {activeTab === 'details' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium text-gray-900 mb-4">Market Information</h3>
                  <dl className="space-y-4">
                    <div>
                      <dt className="text-sm text-gray-500">Slug</dt>
                      <dd className="text-gray-900">{market.slug}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500">Market Type</dt>
                      <dd className="text-gray-900 capitalize">{market.marketType.replace('_', ' ')}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500">Current Yes Price</dt>
                      <dd className="text-gray-900 text-2xl font-bold text-green-600">{market.currentYesPrice}¢</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500">Volume</dt>
                      <dd className="text-gray-900">${market.volume.toLocaleString()}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500">Trade Count</dt>
                      <dd className="text-gray-900">{market.tradeCount.toLocaleString()}</dd>
                    </div>
                  </dl>
                </div>

                <div>
                  <h3 className="font-medium text-gray-900 mb-4">Timing</h3>
                  <dl className="space-y-4">
                    <div>
                      <dt className="text-sm text-gray-500">Timezone</dt>
                      <dd className="text-gray-900">{market.timezone}</dd>
                    </div>
                    {market.opensAt && (
                      <div>
                        <dt className="text-sm text-gray-500">Opens At</dt>
                        <dd className="text-gray-900">{new Date(market.opensAt).toLocaleString()}</dd>
                      </div>
                    )}
                    <div>
                      <dt className="text-sm text-gray-500">Closes At</dt>
                      <dd className="text-gray-900">{new Date(market.closesAt).toLocaleString()}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500">Resolves By</dt>
                      <dd className="text-gray-900">{new Date(market.resolvesBy).toLocaleString()}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500">Settles By</dt>
                      <dd className="text-gray-900">{new Date(market.settlesBy).toLocaleString()}</dd>
                    </div>
                  </dl>
                </div>

                <div className="lg:col-span-2">
                  <h3 className="font-medium text-gray-900 mb-4">Description</h3>
                  <div className="bg-gray-50 p-4 rounded-lg whitespace-pre-wrap">{market.description}</div>
                </div>

                <div className="lg:col-span-2">
                  <h3 className="font-medium text-gray-900 mb-4">Rules</h3>
                  <div className="bg-gray-50 p-4 rounded-lg whitespace-pre-wrap">{market.rulesText}</div>
                </div>

                {market.outcomes && market.outcomes.length > 0 && (
                  <div className="lg:col-span-2">
                    <h3 className="font-medium text-gray-900 mb-4">Outcomes</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {market.outcomes.map((outcome) => (
                        <div
                          key={outcome.id}
                          className={`p-4 rounded-lg border ${outcome.isWinner ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}
                        >
                          <div className="font-medium">{outcome.label}</div>
                          <div className="text-2xl font-bold mt-1">{outcome.currentPrice}¢</div>
                          {outcome.isWinner && <span className="text-green-600 text-sm">Winner</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Trading Tab */}
            {activeTab === 'trading' && (
              <div className="space-y-6">
                {/* Sharp Shield V2 Tier Overview */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-6 rounded-xl border border-emerald-200">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium text-emerald-700">Sharp Shield Tier</h4>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        liquidityState?.sharpShieldTier === 0
                          ? 'bg-emerald-100 text-emerald-700'
                          : liquidityState?.sharpShieldTier === 1
                          ? 'bg-blue-100 text-blue-700'
                          : liquidityState?.sharpShieldTier === 2
                          ? 'bg-indigo-100 text-indigo-700'
                          : 'bg-green-100 text-green-700'
                      }`}>
                        Tier {liquidityState?.sharpShieldTier ?? 0}
                      </span>
                    </div>
                    <div className="text-2xl font-bold text-emerald-800">
                      {liquidityState?.liquidityTierDisplay || 'Seed Phase'}
                    </div>
                    <p className="text-xs text-emerald-600 mt-1">
                      {liquidityState?.effectiveDepthCents
                        ? `$${(liquidityState.effectiveDepthCents / 100).toLocaleString()} effective depth`
                        : 'Building liquidity'}
                    </p>
                  </div>

                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-200">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium text-blue-700">Max Taker Bet</h4>
                    </div>
                    <div className="text-2xl font-bold text-blue-800">
                      {liquidityState?.maxTakerDisplay || liquidityState?.maxBetDisplay || '$100'}
                    </div>
                    <p className="text-xs text-blue-600 mt-1">For market orders / takers</p>
                  </div>

                  <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-xl border border-indigo-200">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium text-indigo-700">Max Maker Bet</h4>
                    </div>
                    <div className="text-2xl font-bold text-indigo-800">
                      {liquidityState?.maxMakerDisplay || '$250'}
                    </div>
                    <p className="text-xs text-indigo-600 mt-1">For limit orders / makers</p>
                  </div>

                  <div className="bg-gradient-to-br from-purple-50 to-violet-50 p-6 rounded-xl border border-purple-200">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium text-purple-700">Spread Status</h4>
                      {liquidityState?.isSpreadWidened && (
                        <span className="px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                          Widened
                        </span>
                      )}
                    </div>
                    <div className="text-2xl font-bold text-purple-800">
                      {liquidityState?.spreadCents ? `${liquidityState.spreadCents}¢` : 'N/A'}
                    </div>
                    <p className="text-xs text-purple-600 mt-1">
                      {liquidityState?.spreadWarning || 'Normal spread'}
                    </p>
                  </div>
                </div>

                {/* Tier Thresholds Reference */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Sharp Shield V2 Tier Thresholds</h4>
                  <div className="grid grid-cols-4 gap-4 text-xs">
                    <div className={`p-3 rounded-lg ${liquidityState?.sharpShieldTier === 0 ? 'bg-emerald-100 border-2 border-emerald-400' : 'bg-white border border-gray-200'}`}>
                      <div className="font-semibold text-gray-900">Tier 0 (Seed)</div>
                      <div className="text-gray-500">{'<'} $1,000 depth</div>
                      <div className="mt-1 text-gray-700">Taker: $100 / Maker: $250</div>
                    </div>
                    <div className={`p-3 rounded-lg ${liquidityState?.sharpShieldTier === 1 ? 'bg-blue-100 border-2 border-blue-400' : 'bg-white border border-gray-200'}`}>
                      <div className="font-semibold text-gray-900">Tier 1 (Growth)</div>
                      <div className="text-gray-500">$1k - $10k depth</div>
                      <div className="mt-1 text-gray-700">Taker: $500 / Maker: $1,000</div>
                    </div>
                    <div className={`p-3 rounded-lg ${liquidityState?.sharpShieldTier === 2 ? 'bg-indigo-100 border-2 border-indigo-400' : 'bg-white border border-gray-200'}`}>
                      <div className="font-semibold text-gray-900">Tier 2 (Established)</div>
                      <div className="text-gray-500">$10k - $100k depth</div>
                      <div className="mt-1 text-gray-700">Taker: $2,000 / Maker: $5,000</div>
                    </div>
                    <div className={`p-3 rounded-lg ${liquidityState?.sharpShieldTier === 3 ? 'bg-green-100 border-2 border-green-400' : 'bg-white border border-gray-200'}`}>
                      <div className="font-semibold text-gray-900">Tier 3 (Mature)</div>
                      <div className="text-gray-500">{'>'} $100k depth</div>
                      <div className="mt-1 text-gray-700">Taker: $5,000 / Maker: $10,000</div>
                    </div>
                  </div>
                </div>

                {/* CLOB Order Book Summary */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="font-medium text-gray-900 mb-4">Central Limit Order Book (CLOB)</h3>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-sm font-medium text-green-700 mb-3 flex items-center gap-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        Bid Side (Buy Orders)
                      </h4>
                      <div className="space-y-2">
                        {orderBook?.bids && orderBook.bids.length > 0 ? (
                          orderBook.bids.slice(0, 5).map((bid: any, idx: number) => (
                            <div key={idx} className="flex justify-between text-sm bg-green-50 px-3 py-2 rounded">
                              <span className="font-medium text-green-700">{bid.priceCents}¢</span>
                              <span className="text-green-600">${(bid.quantityCents / 100).toFixed(2)}</span>
                            </div>
                          ))
                        ) : (
                          <div className="text-sm text-gray-500 italic py-4 text-center bg-gray-50 rounded">
                            No bids in order book
                          </div>
                        )}
                      </div>
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <p className="text-xs text-gray-500">
                          Total Bid Liquidity: {liquidityState?.bidLiquidityCents
                            ? `$${(parseInt(liquidityState.bidLiquidityCents) / 100).toLocaleString()}`
                            : '$0'}
                        </p>
                        <p className="text-xs text-gray-500">
                          Best Bid: {liquidityState?.bestBidCents ? `${liquidityState.bestBidCents}¢` : 'N/A'}
                        </p>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-red-700 mb-3 flex items-center gap-2">
                        <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                        Ask Side (Sell Orders)
                      </h4>
                      <div className="space-y-2">
                        {orderBook?.asks && orderBook.asks.length > 0 ? (
                          orderBook.asks.slice(0, 5).map((ask: any, idx: number) => (
                            <div key={idx} className="flex justify-between text-sm bg-red-50 px-3 py-2 rounded">
                              <span className="font-medium text-red-700">{ask.priceCents}¢</span>
                              <span className="text-red-600">${(ask.quantityCents / 100).toFixed(2)}</span>
                            </div>
                          ))
                        ) : (
                          <div className="text-sm text-gray-500 italic py-4 text-center bg-gray-50 rounded">
                            No asks in order book
                          </div>
                        )}
                      </div>
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <p className="text-xs text-gray-500">
                          Total Ask Liquidity: {liquidityState?.askLiquidityCents
                            ? `$${(parseInt(liquidityState.askLiquidityCents) / 100).toLocaleString()}`
                            : '$0'}
                        </p>
                        <p className="text-xs text-gray-500">
                          Best Ask: {liquidityState?.bestAskCents ? `${liquidityState.bestAskCents}¢` : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Market Maker / Seed Bot Info */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="font-medium text-gray-900 mb-4">Market Maker Configuration</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="text-sm font-medium text-gray-700 mb-3">Seed Bot (Passive Quoter)</h4>
                      <dl className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <dt className="text-gray-500">Strategy</dt>
                          <dd className="font-medium">Avellaneda-Stoikov</dd>
                        </div>
                        <div className="flex justify-between text-sm">
                          <dt className="text-gray-500">Base Spread</dt>
                          <dd className="font-medium">10¢</dd>
                        </div>
                        <div className="flex justify-between text-sm">
                          <dt className="text-gray-500">Max Inventory</dt>
                          <dd className="font-medium">$10,000 per side</dd>
                        </div>
                        <div className="flex justify-between text-sm">
                          <dt className="text-gray-500">Chinese Wall</dt>
                          <dd className="font-medium text-green-600">Enforced</dd>
                        </div>
                      </dl>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="text-sm font-medium text-gray-700 mb-3">NT 2024 Risk Controls</h4>
                      <dl className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <dt className="text-gray-500">Taker Delay</dt>
                          <dd className="font-medium">500ms</dd>
                        </div>
                        <div className="flex justify-between text-sm">
                          <dt className="text-gray-500">Toxic Flow Detection</dt>
                          <dd className="font-medium">10+ trades/2s</dd>
                        </div>
                        <div className="flex justify-between text-sm">
                          <dt className="text-gray-500">Spread Widening</dt>
                          <dd className="font-medium">3x on toxic flow</dd>
                        </div>
                        <div className="flex justify-between text-sm">
                          <dt className="text-gray-500">Price Precision</dt>
                          <dd className="font-medium">Integer cents</dd>
                        </div>
                      </dl>
                    </div>
                  </div>
                </div>

                {/* Trading Activity */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="font-medium text-gray-900 mb-4">Trading Activity</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-gray-900">{market.tradeCount.toLocaleString()}</div>
                      <div className="text-xs text-gray-500 mt-1">Total Trades</div>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-gray-900">${market.volume.toLocaleString()}</div>
                      <div className="text-xs text-gray-500 mt-1">Volume Traded</div>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-gray-900">
                        {liquidityState?.midPriceCents ? `${liquidityState.midPriceCents}¢` : '50¢'}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">Mid Price</div>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-gray-900">
                        {liquidityState?.tradesLast2Sec || 0}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">Trades (last 2s)</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Workflow Tab */}
            {activeTab === 'workflow' && (
              <div className="space-y-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium text-gray-900 mb-2">Current Status</h3>
                  <span className={`px-4 py-2 rounded-full text-lg font-medium ${colorMap[MARKET_STATUS_COLORS[market.status as MarketStatus]] || colorMap.gray}`}>
                    {MARKET_STATUS_LABELS[market.status as MarketStatus]}
                  </span>
                </div>

                {allowedTransitions.length > 0 && (
                  <div>
                    <h3 className="font-medium text-gray-900 mb-4">Available Actions</h3>
                    <div className="flex flex-wrap gap-3">
                      {allowedTransitions.map((toStatus) => {
                        const action = toStatus === 'review' ? 'submitted' :
                          toStatus === 'approved' || toStatus === 'published' ? 'approved' :
                          toStatus === 'draft' ? 'needs_changes' : 'approved';

                        return (
                          <button
                            key={toStatus}
                            onClick={() => {
                              setStatusAction({ toStatus, action });
                              setShowStatusModal(true);
                            }}
                            className="px-4 py-2 bg-foremark-green hover:bg-foremark-green-dark text-white rounded-lg"
                          >
                            Move to {MARKET_STATUS_LABELS[toStatus]}
                          </button>
                        );
                      })}

                      {market.status === 'published' && (
                        <button
                          onClick={() => setShowResolveModal(true)}
                          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
                        >
                          Resolve Market
                        </button>
                      )}

                      {market.status === 'resolved' && (
                        <button
                          onClick={handleSettle}
                          className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg"
                        >
                          Settle Market
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {market.approvals && market.approvals.length > 0 && (
                  <div>
                    <h3 className="font-medium text-gray-900 mb-4">Approval History</h3>
                    <div className="space-y-3">
                      {market.approvals.map((approval) => (
                        <div key={approval.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                          <span className="text-2xl">
                            {approval.action === 'approved' && '✅'}
                            {approval.action === 'rejected' && '❌'}
                            {approval.action === 'submitted' && '📤'}
                            {approval.action === 'needs_changes' && '🔄'}
                          </span>
                          <div className="flex-1">
                            <p className="font-medium">
                              {approval.fromStatus} → {approval.toStatus}
                            </p>
                            {approval.comments && <p className="text-sm text-gray-500">{approval.comments}</p>}
                          </div>
                          <div className="text-right text-sm text-gray-500">
                            <p>{approval.approvedBy?.firstName} {approval.approvedBy?.lastName}</p>
                            <p>{new Date(approval.approvedAt).toLocaleString()}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Versions Tab */}
            {activeTab === 'versions' && (
              <div className="space-y-4">
                <h3 className="font-medium text-gray-900">Version History</h3>
                {versions.length === 0 ? (
                  <p className="text-gray-500">No version history available</p>
                ) : (
                  <div className="space-y-3">
                    {versions.map((version) => (
                      <div key={version.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">Version {version.version}</p>
                          <p className="text-sm text-gray-500">
                            {version.changeType.replace('_', ' ')} - {version.changeSummary}
                          </p>
                          <p className="text-xs text-gray-400">
                            {version.createdBy?.firstName} {version.createdBy?.lastName} •{' '}
                            {new Date(version.createdAt).toLocaleString()}
                          </p>
                        </div>
                        {version.version > 1 && (
                          <button
                            onClick={() => handleRollback(version.id)}
                            className="text-sm text-foremark-green hover:underline"
                          >
                            Rollback
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Resolution Tab */}
            {activeTab === 'resolution' && (
              <div className="space-y-6">
                {market.resolvedAt ? (
                  <div className="bg-purple-50 p-6 rounded-lg">
                    <h3 className="font-medium text-purple-900 mb-2">Market Resolved</h3>
                    <p className="text-purple-700">
                      Resolved at: {new Date(market.resolvedAt).toLocaleString()}
                    </p>
                    {market.settledAt && (
                      <p className="text-purple-700">
                        Settled at: {new Date(market.settledAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="bg-gray-50 p-6 rounded-lg">
                    <h3 className="font-medium text-gray-900 mb-2">Not Yet Resolved</h3>
                    <p className="text-gray-600">
                      This market has not been resolved yet. It can be resolved once published.
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                      Resolution Source: {market.resolutionSource || 'Not specified'}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Status Transition Modal */}
        {showStatusModal && statusAction && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-medium mb-4">
                Move to {MARKET_STATUS_LABELS[statusAction.toStatus]}
              </h3>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Comments (optional)</label>
                <textarea
                  value={statusComments}
                  onChange={(e) => setStatusComments(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-foremark-green"
                  rows={3}
                  placeholder="Add any notes about this status change..."
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowStatusModal(false);
                    setStatusComments('');
                    setStatusAction(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleStatusTransition}
                  disabled={saving}
                  className="px-4 py-2 bg-foremark-green text-white rounded-lg disabled:opacity-50"
                >
                  {saving ? 'Updating...' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Resolve Modal */}
        {showResolveModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-medium mb-4">Resolve Market</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Resolution</label>
                  <select
                    value={resolution.resolution}
                    onChange={(e) => setResolution((prev) => ({ ...prev, resolution: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                    <option value="void">Void</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Resolution Notes</label>
                  <textarea
                    value={resolution.notes}
                    onChange={(e) => setResolution((prev) => ({ ...prev, notes: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    rows={3}
                    placeholder="Explain the resolution..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Source URL</label>
                  <input
                    type="url"
                    value={resolution.sourceUrl}
                    onChange={(e) => setResolution((prev) => ({ ...prev, sourceUrl: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="https://..."
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowResolveModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleResolve}
                  disabled={saving}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg disabled:opacity-50"
                >
                  {saving ? 'Resolving...' : 'Resolve Market'}
                </button>
              </div>
            </div>
          </div>
        )}
      </AdminLayout>
    </>
  );
}
