import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import AdminLayout from '@/components/admin/AdminLayout';

interface Trader {
  id: string;
  email: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  isActive: boolean;
  isVerified: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  balance: number;
  totalProfit: number;
  totalTrades: number;
  totalVolume: number;
}

export default function TradersPage() {
  const router = useRouter();
  const [traders, setTraders] = useState<Trader[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterActive, setFilterActive] = useState<string>('all');

  useEffect(() => {
    if (router.isReady) {
      fetchTraders();
    }
  }, [router.isReady, filterActive]);

  const fetchTraders = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterActive !== 'all') {
        params.append('isActive', filterActive);
      }
      if (search) {
        params.append('search', search);
      }
      const res = await fetch(`/api/admin/traders?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setTraders(data.data || []);
      } else {
        setError('Failed to fetch traders');
      }
    } catch (err) {
      setError('Failed to fetch traders');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTraders();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <>
      <Head>
        <title>Traders | MarketOps Admin</title>
      </Head>

      <AdminLayout title="Traders">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
            <button onClick={() => setError('')} className="float-right">&times;</button>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <form onSubmit={handleSearch} className="flex-1 min-w-[200px]">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by email, username, or name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-foremark-green focus:border-transparent"
                />
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </form>

            <select
              value={filterActive}
              onChange={(e) => setFilterActive(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-foremark-green focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="true">Active Only</option>
              <option value="false">Inactive Only</option>
            </select>

            <button
              onClick={() => fetchTraders()}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm p-4">
            <p className="text-sm text-gray-500">Total Traders</p>
            <p className="text-2xl font-bold text-gray-900">{traders.length}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <p className="text-sm text-gray-500">Active Traders</p>
            <p className="text-2xl font-bold text-green-600">
              {traders.filter(t => t.isActive).length}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <p className="text-sm text-gray-500">Total Volume</p>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(traders.reduce((sum, t) => sum + t.totalVolume, 0))}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <p className="text-sm text-gray-500">Total Trades</p>
            <p className="text-2xl font-bold text-gray-900">
              {traders.reduce((sum, t) => sum + t.totalTrades, 0).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foremark-green"></div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Balance</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total P/L</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Trades</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Volume</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Login</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {traders.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center">
                        <div className="text-gray-500">
                          <p className="text-lg font-medium">No traders found</p>
                          <p className="text-sm mt-1">Traders will appear here when users sign up on the platform.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    traders.map((trader) => (
                      <tr key={trader.id} className={!trader.isActive ? 'bg-gray-50' : ''}>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            {trader.avatarUrl ? (
                              <img
                                src={trader.avatarUrl}
                                alt=""
                                className="w-10 h-10 rounded-full"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-foremark-green/10 flex items-center justify-center">
                                <span className="text-foremark-green font-medium">
                                  {(trader.displayName || trader.username || trader.email).charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}
                            <div>
                              <p className="font-medium text-gray-900">
                                {trader.displayName || `${trader.firstName || ''} ${trader.lastName || ''}`.trim() || trader.username}
                              </p>
                              <p className="text-sm text-gray-500">@{trader.username}</p>
                              <p className="text-xs text-gray-400">{trader.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-col gap-1">
                            <span
                              className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                                trader.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                              }`}
                            >
                              {trader.isActive ? 'Active' : 'Inactive'}
                            </span>
                            {trader.isVerified && (
                              <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                                Verified
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-right font-medium text-gray-900">
                          {formatCurrency(trader.balance)}
                        </td>
                        <td className={`px-4 py-4 text-right font-medium ${trader.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {trader.totalProfit >= 0 ? '+' : ''}{formatCurrency(trader.totalProfit)}
                        </td>
                        <td className="px-4 py-4 text-right text-gray-900">
                          {trader.totalTrades.toLocaleString()}
                        </td>
                        <td className="px-4 py-4 text-right text-gray-900">
                          {formatCurrency(trader.totalVolume)}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-500">
                          {formatDate(trader.lastLoginAt)}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-500">
                          {formatDate(trader.createdAt)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </AdminLayout>
    </>
  );
}
