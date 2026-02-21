import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import AdminLayout from '@/components/admin/AdminLayout';
import type { Market, MarketStatus, Category } from '@/types/admin';
import { MARKET_STATUS_LABELS, MARKET_STATUS_COLORS } from '@/types/admin';

interface MarketsResponse {
  data: Market[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

const statusOptions: { value: MarketStatus | ''; label: string }[] = [
  { value: '', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'review', label: 'Under Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'published', label: 'Published' },
  { value: 'trading_halted', label: 'Trading Halted' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'settled', label: 'Settled' },
  { value: 'archived', label: 'Archived' },
];

export default function MarketsListPage() {
  const router = useRouter();
  const [markets, setMarkets] = useState<Market[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  });

  // Filters
  const [status, setStatus] = useState<MarketStatus | ''>(
    (router.query.status as MarketStatus) || ''
  );
  const [categoryId, setCategoryId] = useState<string>('');
  const [search, setSearch] = useState<string>('');

  useEffect(() => {
    if (router.isReady) {
      fetchCategories();
    }
  }, [router.isReady]);

  useEffect(() => {
    if (router.isReady && router.query.status) {
      setStatus(router.query.status as MarketStatus);
    }
  }, [router.isReady, router.query.status]);

  useEffect(() => {
    if (router.isReady) {
      fetchMarkets();
    }
  }, [router.isReady, status, categoryId, search, pagination.page]);

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/admin/categories');
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const fetchMarkets = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        pageSize: pagination.pageSize.toString(),
      });

      if (status) params.set('status', status);
      if (categoryId) params.set('categoryId', categoryId);
      if (search) params.set('search', search);

      const res = await fetch(`/api/admin/markets?${params}`);
      if (res.ok) {
        const data: MarketsResponse = await res.json();
        setMarkets(data.data);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Failed to fetch markets:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: MarketStatus) => {
    const colorMap: Record<string, string> = {
      gray: 'bg-gray-100 text-gray-700',
      yellow: 'bg-yellow-100 text-yellow-700',
      blue: 'bg-blue-100 text-blue-700',
      green: 'bg-green-100 text-green-700',
      orange: 'bg-orange-100 text-orange-700',
      purple: 'bg-purple-100 text-purple-700',
      teal: 'bg-teal-100 text-teal-700',
    };

    const color = MARKET_STATUS_COLORS[status];
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colorMap[color] || colorMap.gray}`}>
        {MARKET_STATUS_LABELS[status]}
      </span>
    );
  };

  return (
    <>
      <Head>
        <title>Markets | MarketOps Admin</title>
      </Head>

      <AdminLayout title="Markets">
        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[200px]">
              <input
                type="text"
                placeholder="Search markets..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-foremark-green focus:border-transparent"
              />
            </div>

            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as MarketStatus | '')}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-foremark-green focus:border-transparent"
            >
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-foremark-green focus:border-transparent"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>

            <Link
              href="/admin/markets/new"
              className="bg-foremark-green hover:bg-foremark-green-dark text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              + Create Market
            </Link>
          </div>
        </div>

        {/* Markets Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foremark-green mx-auto"></div>
            </div>
          ) : markets.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No markets found. <Link href="/admin/markets/new" className="text-foremark-green hover:underline">Create one?</Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Market</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Closes</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {markets.map((market) => (
                    <tr key={market.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          {market.icon && <span className="text-2xl">{market.icon}</span>}
                          <div>
                            <Link
                              href={`/admin/markets/${market.id}`}
                              className="font-medium text-gray-900 hover:text-foremark-green"
                            >
                              {market.title}
                            </Link>
                            <p className="text-sm text-gray-500 truncate max-w-md">
                              {market.shortDescription}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm text-gray-600">
                          {market.category?.name || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        {getStatusBadge(market.status)}
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm font-medium">
                          {market.currentYesPrice}¢
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm text-gray-600">
                          {new Date(market.closesAt).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/admin/markets/${market.id}`}
                            className="text-foremark-green hover:underline text-sm"
                          >
                            Edit
                          </Link>
                          <span className="text-gray-300">|</span>
                          <Link
                            href={`/market/${market.slug}`}
                            target="_blank"
                            className="text-gray-500 hover:text-gray-700 text-sm"
                          >
                            View
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Showing {(pagination.page - 1) * pagination.pageSize + 1} to{' '}
                {Math.min(pagination.page * pagination.pageSize, pagination.total)} of{' '}
                {pagination.total} markets
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                  disabled={pagination.page === 1}
                  className="px-3 py-1 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                  disabled={pagination.page === pagination.totalPages}
                  className="px-3 py-1 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </AdminLayout>
    </>
  );
}
