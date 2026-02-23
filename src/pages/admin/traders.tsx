import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
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
  balanceCents: string;
  totalProfit: number;
  totalProfitCents: string;
  totalTrades: number;
  totalVolume: number;
  totalVolumeCents: string;
  // New fields
  riskLevel: string;
  riskScore: number;
  kycStatus: string;
  accountStatus: string;
  toxicFlowCount: number;
  lastMarketTitle?: string;
  lastMarketSlug?: string;
}

const riskIcons: Record<string, { icon: string; color: string; label: string }> = {
  low: { icon: '🟢', color: 'text-green-600', label: 'Low Risk' },
  medium: { icon: '🟡', color: 'text-yellow-600', label: 'Medium Risk' },
  high: { icon: '🟠', color: 'text-orange-600', label: 'High Risk' },
  toxic: { icon: '🔴', color: 'text-red-600', label: 'Toxic' },
};

const kycStatusBadge: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Pending' },
  submitted: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Submitted' },
  verified: { bg: 'bg-green-100', text: 'text-green-700', label: 'Verified' },
  failed: { bg: 'bg-red-100', text: 'text-red-700', label: 'Failed' },
  expired: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Expired' },
};

const accountStatusBadge: Record<string, { bg: string; text: string; label: string }> = {
  active: { bg: 'bg-green-100', text: 'text-green-700', label: 'Active' },
  frozen: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Frozen' },
  suspended: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Suspended' },
  banned: { bg: 'bg-red-100', text: 'text-red-700', label: 'Banned' },
};

export default function TradersPage() {
  const router = useRouter();
  const [traders, setTraders] = useState<Trader[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterRisk, setFilterRisk] = useState<string>('all');

  useEffect(() => {
    if (router.isReady) {
      fetchTraders();
    }
  }, [router.isReady, filterStatus, filterRisk]);

  const fetchTraders = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterStatus !== 'all') {
        params.append('accountStatus', filterStatus);
      }
      if (filterRisk !== 'all') {
        params.append('riskLevel', filterRisk);
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

  const stats = {
    total: traders.length,
    active: traders.filter(t => t.accountStatus === 'active').length,
    verified: traders.filter(t => t.kycStatus === 'verified').length,
    flagged: traders.filter(t => t.riskLevel === 'high' || t.riskLevel === 'toxic').length,
    totalVolume: traders.reduce((sum, t) => sum + t.totalVolume, 0),
    totalTrades: traders.reduce((sum, t) => sum + t.totalTrades, 0),
  };

  return (
    <>
      <Head>
        <title>Users | MarketOps Admin</title>
      </Head>

      <AdminLayout title="Users">
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
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-foremark-green focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="frozen">Frozen</option>
              <option value="suspended">Suspended</option>
              <option value="banned">Banned</option>
            </select>

            <select
              value={filterRisk}
              onChange={(e) => setFilterRisk(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-foremark-green focus:border-transparent"
            >
              <option value="all">All Risk Levels</option>
              <option value="low">🟢 Low</option>
              <option value="medium">🟡 Medium</option>
              <option value="high">🟠 High</option>
              <option value="toxic">🔴 Toxic</option>
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
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm p-4">
            <p className="text-sm text-gray-500">Total Users</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <p className="text-sm text-gray-500">Active</p>
            <p className="text-2xl font-bold text-green-600">{stats.active}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <p className="text-sm text-gray-500">KYC Verified</p>
            <p className="text-2xl font-bold text-blue-600">{stats.verified}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <p className="text-sm text-gray-500">Flagged/Toxic</p>
            <p className="text-2xl font-bold text-red-600">{stats.flagged}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <p className="text-sm text-gray-500">Total Volume</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalVolume)}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <p className="text-sm text-gray-500">Total Bets</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totalTrades.toLocaleString()}</p>
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
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Risk</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">KYC</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Balance</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total P/L</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Bets</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Market</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Login</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {traders.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center">
                        <div className="text-gray-500">
                          <p className="text-lg font-medium">No users found</p>
                          <p className="text-sm mt-1">Users will appear here when they sign up on the platform.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    traders.map((trader) => {
                      const risk = riskIcons[trader.riskLevel] || riskIcons.low;
                      const kyc = kycStatusBadge[trader.kycStatus] || kycStatusBadge.pending;
                      const status = accountStatusBadge[trader.accountStatus] || accountStatusBadge.active;

                      return (
                        <tr
                          key={trader.id}
                          className={`hover:bg-gray-50 cursor-pointer transition-colors ${
                            trader.accountStatus !== 'active' ? 'bg-gray-50/50' : ''
                          }`}
                          onClick={() => router.push(`/admin/traders/${trader.id}`)}
                        >
                          {/* Risk Flag */}
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2" title={risk.label}>
                              <span className="text-lg">{risk.icon}</span>
                              {trader.toxicFlowCount > 0 && (
                                <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">
                                  {trader.toxicFlowCount}x
                                </span>
                              )}
                            </div>
                          </td>

                          {/* User */}
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              {trader.avatarUrl ? (
                                <img src={trader.avatarUrl} alt="" className="w-10 h-10 rounded-full" />
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

                          {/* Account Status */}
                          <td className="px-4 py-4">
                            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${status.bg} ${status.text}`}>
                              {status.label}
                            </span>
                          </td>

                          {/* KYC Status */}
                          <td className="px-4 py-4">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${kyc.bg} ${kyc.text}`}>
                              {trader.kycStatus === 'verified' && '✓'}
                              {kyc.label}
                            </span>
                          </td>

                          {/* Balance */}
                          <td className="px-4 py-4 text-right font-medium text-gray-900">
                            {formatCurrency(trader.balance)}
                          </td>

                          {/* P/L */}
                          <td className={`px-4 py-4 text-right font-medium ${trader.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {trader.totalProfit >= 0 ? '+' : ''}{formatCurrency(trader.totalProfit)}
                          </td>

                          {/* Trades */}
                          <td className="px-4 py-4 text-right text-gray-900">
                            {trader.totalTrades.toLocaleString()}
                          </td>

                          {/* Last Market */}
                          <td className="px-4 py-4">
                            {trader.lastMarketTitle ? (
                              <Link
                                href={`/admin/markets/${trader.lastMarketSlug || ''}`}
                                className="text-sm text-foremark-green hover:underline"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {trader.lastMarketTitle.length > 25
                                  ? trader.lastMarketTitle.substring(0, 25) + '...'
                                  : trader.lastMarketTitle}
                              </Link>
                            ) : (
                              <span className="text-sm text-gray-400">-</span>
                            )}
                          </td>

                          {/* Last Login */}
                          <td className="px-4 py-4 text-sm text-gray-500">
                            {formatDate(trader.lastLoginAt)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="mt-4 flex items-center gap-6 text-sm text-gray-500">
          <span className="font-medium">Risk Levels:</span>
          <span>🟢 Low</span>
          <span>🟡 Medium</span>
          <span>🟠 High</span>
          <span>🔴 Toxic</span>
        </div>
      </AdminLayout>
    </>
  );
}
