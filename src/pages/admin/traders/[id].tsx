import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import AdminLayout from '@/components/admin/AdminLayout';

interface UserDetail {
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
  // Financial
  balanceCents: string;
  lockedBalanceCents: string;
  totalProfitCents: string;
  totalTrades: number;
  totalVolumeCents: string;
  totalTakerFeesPaidCents: string;
  totalMakerRebatesEarnedCents: string;
  netFeesCents: string;
  // Risk
  riskScore: number;
  riskLevel: string;
  toxicFlowCount: number;
  isFlagged: boolean;
  flagReason: string | null;
  accountStatus: string;
  statusReason: string | null;
  customMaxBetCents: string | null;
  sharpShieldTierOverride: number | null;
  // KYC
  kycStatus: string;
  kycProvider: string | null;
  kycVerifiedAt: string | null;
  kycReferenceId: string | null;
  kycDocumentType: string | null;
  kycExpiresAt: string | null;
  // Responsible Gambling
  depositLimitCents: string | null;
  depositLimitPeriod: string | null;
  selfExclusionUntil: string | null;
  coolingOffUntil: string | null;
  // Session
  lastIpAddress: string | null;
  lastDeviceFingerprint: string | null;
  lastUserAgent: string | null;
  // Off-Mark Social Moderation
  offMarkStatus: string;
  offMarkUntil: string | null;
  offMarkReason: string | null;
  offMarkCount: number;
  canComment: boolean;
  canPost: boolean;
  canChat: boolean;
  reportsAgainst?: { id: string }[];
}

interface TradeRecord {
  id: string;
  side: string;
  priceCents: number;
  quantityCents: number;
  createdAt: string;
  market: { id: string; title: string; slug: string };
}

interface Position {
  id: string;
  outcomeId: string;
  side: string;
  quantityCents: string;
  avgPriceCents: number;
  outcome: { label: string; market: { id: string; title: string; slug: string } };
}

interface Session {
  id: string;
  ipAddress: string;
  deviceFingerprint: string | null;
  userAgent: string | null;
  country: string | null;
  city: string | null;
  createdAt: string;
  lastActiveAt: string;
  isActive: boolean;
}

interface BalanceAdjustment {
  id: string;
  amountCents: string;
  type: string;
  reason: string;
  balanceBeforeCents: string;
  balanceAfterCents: string;
  createdAt: string;
}

export default function TraderDetailPage() {
  const router = useRouter();
  const { id } = router.query;

  const [user, setUser] = useState<UserDetail | null>(null);
  const [trades, setTrades] = useState<TradeRecord[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [adjustments, setAdjustments] = useState<BalanceAdjustment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'trading' | 'compliance' | 'risk'>('overview');
  const [saving, setSaving] = useState(false);

  // Modal states
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);

  // Form states
  const [newStatus, setNewStatus] = useState('');
  const [statusReason, setStatusReason] = useState('');
  const [adjustmentAmount, setAdjustmentAmount] = useState('');
  const [adjustmentType, setAdjustmentType] = useState('credit');
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [customLimit, setCustomLimit] = useState('');
  const [tierOverride, setTierOverride] = useState('');

  useEffect(() => {
    if (id) {
      fetchUserData();
    }
  }, [id]);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const [userRes, tradesRes, positionsRes, sessionsRes, adjustmentsRes] = await Promise.all([
        fetch(`/api/admin/traders/${id}`),
        fetch(`/api/admin/traders/${id}/trades`),
        fetch(`/api/admin/traders/${id}/positions`),
        fetch(`/api/admin/traders/${id}/sessions`),
        fetch(`/api/admin/traders/${id}/adjustments`),
      ]);

      if (userRes.ok) {
        const userData = await userRes.json();
        setUser(userData);
        setNewStatus(userData.accountStatus);
      }
      if (tradesRes.ok) setTrades((await tradesRes.json()).data || []);
      if (positionsRes.ok) setPositions((await positionsRes.json()).data || []);
      if (sessionsRes.ok) setSessions((await sessionsRes.json()).data || []);
      if (adjustmentsRes.ok) setAdjustments((await adjustmentsRes.json()).data || []);
    } catch (err) {
      setError('Failed to load user data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (cents: string | number) => {
    const amount = typeof cents === 'string' ? parseInt(cents) / 100 : cents / 100;
    return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(amount);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString('en-AU', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  const handleStatusChange = async () => {
    if (!statusReason.trim()) {
      setError('Reason is required for status changes');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/traders/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, reason: statusReason }),
      });
      if (res.ok) {
        await fetchUserData();
        setShowStatusModal(false);
        setStatusReason('');
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

  const handleBalanceAdjustment = async () => {
    if (!adjustmentReason.trim()) {
      setError('Reason is required for balance adjustments');
      return;
    }
    const amountCents = Math.round(parseFloat(adjustmentAmount) * 100);
    if (isNaN(amountCents) || amountCents <= 0) {
      setError('Invalid amount');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/traders/${id}/balance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountCents: adjustmentType === 'debit' ? -amountCents : amountCents,
          type: adjustmentType,
          reason: adjustmentReason,
        }),
      });
      if (res.ok) {
        await fetchUserData();
        setShowAdjustmentModal(false);
        setAdjustmentAmount('');
        setAdjustmentReason('');
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to adjust balance');
      }
    } catch (err) {
      setError('Failed to adjust balance');
    } finally {
      setSaving(false);
    }
  };

  const handleLimitOverride = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/traders/${id}/limits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customMaxBetCents: customLimit ? Math.round(parseFloat(customLimit) * 100) : null,
          sharpShieldTierOverride: tierOverride ? parseInt(tierOverride) : null,
        }),
      });
      if (res.ok) {
        await fetchUserData();
        setShowLimitModal(false);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to update limits');
      }
    } catch (err) {
      setError('Failed to update limits');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout title="Loading...">
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foremark-green"></div>
        </div>
      </AdminLayout>
    );
  }

  if (!user) {
    return (
      <AdminLayout title="User Not Found">
        <div className="text-center py-12">
          <p className="text-gray-500">User not found</p>
          <Link href="/admin/traders" className="text-foremark-green hover:underline mt-4 inline-block">
            Back to Users
          </Link>
        </div>
      </AdminLayout>
    );
  }

  const riskIcons: Record<string, string> = { low: '🟢', medium: '🟡', high: '🟠', toxic: '🔴' };
  const statusColors: Record<string, string> = {
    active: 'bg-green-100 text-green-700',
    frozen: 'bg-blue-100 text-blue-700',
    suspended: 'bg-orange-100 text-orange-700',
    banned: 'bg-red-100 text-red-700',
  };
  const kycColors: Record<string, string> = {
    pending: 'bg-gray-100 text-gray-700',
    submitted: 'bg-blue-100 text-blue-700',
    verified: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
    expired: 'bg-yellow-100 text-yellow-700',
  };

  return (
    <>
      <Head>
        <title>{user.username} | MarketOps Admin</title>
      </Head>

      <AdminLayout title="">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
            <button onClick={() => setError('')} className="float-right">&times;</button>
          </div>
        )}

        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="w-16 h-16 rounded-full" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-foremark-green/10 flex items-center justify-center">
                  <span className="text-2xl text-foremark-green font-bold">
                    {(user.displayName || user.username).charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-gray-900">
                    {user.displayName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username}
                  </h1>
                  <span className="text-2xl">{riskIcons[user.riskLevel] || '🟢'}</span>
                </div>
                <p className="text-gray-500">@{user.username} · {user.email}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[user.accountStatus] || statusColors.active}`}>
                    {user.accountStatus.charAt(0).toUpperCase() + user.accountStatus.slice(1)}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${kycColors[user.kycStatus] || kycColors.pending}`}>
                    KYC: {user.kycStatus.charAt(0).toUpperCase() + user.kycStatus.slice(1)}
                  </span>
                  {user.isFlagged && (
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                      Flagged
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/admin/traders" className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                Back
              </Link>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm p-4">
            <p className="text-sm text-gray-500">Balance</p>
            <p className="text-xl font-bold text-gray-900">{formatCurrency(user.balanceCents)}</p>
            {parseInt(user.lockedBalanceCents) > 0 && (
              <p className="text-xs text-gray-400">Locked: {formatCurrency(user.lockedBalanceCents)}</p>
            )}
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <p className="text-sm text-gray-500">Total P/L</p>
            <p className={`text-xl font-bold ${parseInt(user.totalProfitCents) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {parseInt(user.totalProfitCents) >= 0 ? '+' : ''}{formatCurrency(user.totalProfitCents)}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <p className="text-sm text-gray-500">Total Bets</p>
            <p className="text-xl font-bold text-gray-900">{user.totalTrades.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <p className="text-sm text-gray-500">Volume</p>
            <p className="text-xl font-bold text-gray-900">{formatCurrency(user.totalVolumeCents)}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <p className="text-sm text-gray-500">Risk Score</p>
            <p className="text-xl font-bold text-gray-900">{user.riskScore}/100</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              {[
                { id: 'overview', label: 'Overview' },
                { id: 'trading', label: 'Betting History' },
                { id: 'compliance', label: 'Compliance Hub' },
                { id: 'risk', label: 'Risk Switchboard' },
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
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Financial Summary */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-4">Financial Summary</h3>
                  <dl className="space-y-3">
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-500">Available Balance</dt>
                      <dd className="font-medium">{formatCurrency(user.balanceCents)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-500">Locked in Orders</dt>
                      <dd className="font-medium">{formatCurrency(user.lockedBalanceCents)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-500">Taker Fees Paid</dt>
                      <dd className="font-medium text-red-600">{formatCurrency(user.totalTakerFeesPaidCents)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-500">Maker Rebates Earned</dt>
                      <dd className="font-medium text-green-600">{formatCurrency(user.totalMakerRebatesEarnedCents)}</dd>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <dt className="text-sm font-medium text-gray-700">Net Fees</dt>
                      <dd className={`font-bold ${parseInt(user.netFeesCents) >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {formatCurrency(user.netFeesCents)}
                      </dd>
                    </div>
                  </dl>
                </div>

                {/* Account Info */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-4">Account Info</h3>
                  <dl className="space-y-3">
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-500">Joined</dt>
                      <dd className="text-sm">{formatDate(user.createdAt)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-500">Last Login</dt>
                      <dd className="text-sm">{formatDate(user.lastLoginAt)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-500">Last IP</dt>
                      <dd className="text-sm font-mono">{user.lastIpAddress || 'N/A'}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-500">Device Fingerprint</dt>
                      <dd className="text-sm font-mono truncate max-w-[200px]">{user.lastDeviceFingerprint || 'N/A'}</dd>
                    </div>
                  </dl>
                </div>

                {/* Positions */}
                <div className="md:col-span-2">
                  <h3 className="font-medium text-gray-900 mb-4">Current Positions</h3>
                  {positions.length === 0 ? (
                    <p className="text-gray-500 text-center py-8 bg-gray-50 rounded-lg">No open positions</p>
                  ) : (
                    <div className="space-y-2">
                      {positions.map((pos) => (
                        <div key={pos.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <Link href={`/admin/markets/${pos.outcome.market.slug}`} className="font-medium text-foremark-green hover:underline">
                              {pos.outcome.market.title}
                            </Link>
                            <p className="text-sm text-gray-500">{pos.outcome.label} - {pos.side.toUpperCase()}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">{formatCurrency(pos.quantityCents)}</p>
                            <p className="text-sm text-gray-500">Avg: {pos.avgPriceCents}¢</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Trading Ledger Tab */}
            {activeTab === 'trading' && (
              <div>
                <h3 className="font-medium text-gray-900 mb-4">Betting History</h3>
                {trades.length === 0 ? (
                  <p className="text-gray-500 text-center py-8 bg-gray-50 rounded-lg">No bets yet</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Market</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Side</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Price</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {trades.map((trade) => (
                          <tr key={trade.id}>
                            <td className="px-4 py-3 text-sm text-gray-500">{formatDate(trade.createdAt)}</td>
                            <td className="px-4 py-3">
                              <Link href={`/admin/markets/${trade.market.slug}`} className="text-foremark-green hover:underline">
                                {trade.market.title.length > 40 ? trade.market.title.substring(0, 40) + '...' : trade.market.title}
                              </Link>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                trade.side === 'BID' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                              }`}>
                                {trade.side === 'BID' ? 'BUY' : 'SELL'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">{trade.priceCents}¢</td>
                            <td className="px-4 py-3 text-right font-medium">{formatCurrency(trade.quantityCents)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Compliance Hub Tab */}
            {activeTab === 'compliance' && (
              <div className="space-y-6">
                {/* KYC Section */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                    KYC/ID Verification
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${kycColors[user.kycStatus]}`}>
                      {user.kycStatus === 'verified' && '✓'} {user.kycStatus.toUpperCase()}
                    </span>
                  </h3>
                  <dl className="grid grid-cols-2 gap-4">
                    <div>
                      <dt className="text-sm text-gray-500">Provider</dt>
                      <dd className="font-medium">{user.kycProvider || 'Not set'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500">Reference ID</dt>
                      <dd className="font-mono text-sm">{user.kycReferenceId || 'N/A'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500">Document Type</dt>
                      <dd className="font-medium">{user.kycDocumentType || 'N/A'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500">Verified At</dt>
                      <dd className="text-sm">{formatDate(user.kycVerifiedAt)}</dd>
                    </div>
                    {user.kycExpiresAt && (
                      <div>
                        <dt className="text-sm text-gray-500">Expires At</dt>
                        <dd className="text-sm">{formatDate(user.kycExpiresAt)}</dd>
                      </div>
                    )}
                  </dl>
                </div>

                {/* Responsible Gambling */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-4">Responsible Gambling (RG) Status</h3>
                  <dl className="grid grid-cols-2 gap-4">
                    <div>
                      <dt className="text-sm text-gray-500">Deposit Limit</dt>
                      <dd className="font-medium">
                        {user.depositLimitCents
                          ? `${formatCurrency(user.depositLimitCents)} / ${user.depositLimitPeriod}`
                          : 'No limit set'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500">Self-Exclusion</dt>
                      <dd className={`font-medium ${user.selfExclusionUntil ? 'text-red-600' : 'text-green-600'}`}>
                        {user.selfExclusionUntil ? `Until ${formatDate(user.selfExclusionUntil)}` : 'None'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500">Cooling Off</dt>
                      <dd className={`font-medium ${user.coolingOffUntil ? 'text-orange-600' : 'text-green-600'}`}>
                        {user.coolingOffUntil ? `Until ${formatDate(user.coolingOffUntil)}` : 'None'}
                      </dd>
                    </div>
                  </dl>
                </div>

                {/* Session / Device Tracking */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-4">IP & Device Fingerprinting</h3>
                  {sessions.length === 0 ? (
                    <p className="text-gray-500">No session data</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="px-2 py-2 text-left">IP Address</th>
                            <th className="px-2 py-2 text-left">Device</th>
                            <th className="px-2 py-2 text-left">Location</th>
                            <th className="px-2 py-2 text-left">First Seen</th>
                            <th className="px-2 py-2 text-left">Last Active</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sessions.slice(0, 10).map((session) => (
                            <tr key={session.id} className="border-b">
                              <td className="px-2 py-2 font-mono">{session.ipAddress}</td>
                              <td className="px-2 py-2 font-mono text-xs truncate max-w-[150px]">
                                {session.deviceFingerprint || 'N/A'}
                              </td>
                              <td className="px-2 py-2">
                                {session.city && session.country ? `${session.city}, ${session.country}` : 'Unknown'}
                              </td>
                              <td className="px-2 py-2">{formatDate(session.createdAt)}</td>
                              <td className="px-2 py-2">{formatDate(session.lastActiveAt)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Activity Statement Button */}
                <div className="flex gap-4">
                  <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
                    Generate Activity Statement
                  </button>
                </div>
              </div>
            )}

            {/* Risk Switchboard Tab */}
            {activeTab === 'risk' && (
              <div className="space-y-6">
                {/* Account Status Control */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium text-gray-900">Account Status</h3>
                    <button
                      onClick={() => setShowStatusModal(true)}
                      className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm"
                    >
                      Change Status
                    </button>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`px-4 py-2 rounded-lg text-lg font-medium ${statusColors[user.accountStatus]}`}>
                      {user.accountStatus.toUpperCase()}
                    </span>
                    {user.statusReason && (
                      <p className="text-sm text-gray-500">Reason: {user.statusReason}</p>
                    )}
                  </div>
                </div>

                {/* Limit Overrides */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium text-gray-900">Manual Limit Overrides</h3>
                    <button
                      onClick={() => {
                        setCustomLimit(user.customMaxBetCents ? (parseInt(user.customMaxBetCents) / 100).toString() : '');
                        setTierOverride(user.sharpShieldTierOverride?.toString() || '');
                        setShowLimitModal(true);
                      }}
                      className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-sm"
                    >
                      Set Override
                    </button>
                  </div>
                  <dl className="grid grid-cols-2 gap-4">
                    <div>
                      <dt className="text-sm text-gray-500">Custom Max Bet</dt>
                      <dd className="font-medium">
                        {user.customMaxBetCents ? formatCurrency(user.customMaxBetCents) : 'Using tier default'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500">Tier Override</dt>
                      <dd className="font-medium">
                        {user.sharpShieldTierOverride !== null ? `Forced Tier ${user.sharpShieldTierOverride}` : 'Auto (based on liquidity)'}
                      </dd>
                    </div>
                  </dl>
                </div>

                {/* Balance Adjustment */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium text-gray-900">Balance Adjustment</h3>
                    <button
                      onClick={() => setShowAdjustmentModal(true)}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm"
                    >
                      Adjust Balance
                    </button>
                  </div>
                  <p className="text-sm text-gray-500 mb-4">
                    Use this for refunds, bonuses, or corrections. All adjustments are logged.
                  </p>
                  {adjustments.length > 0 && (
                    <div className="border-t pt-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Recent Adjustments</h4>
                      <div className="space-y-2">
                        {adjustments.slice(0, 5).map((adj) => (
                          <div key={adj.id} className="flex items-center justify-between text-sm bg-white p-2 rounded">
                            <div>
                              <span className={parseInt(adj.amountCents) >= 0 ? 'text-green-600' : 'text-red-600'}>
                                {parseInt(adj.amountCents) >= 0 ? '+' : ''}{formatCurrency(adj.amountCents)}
                              </span>
                              <span className="text-gray-500 ml-2">({adj.type})</span>
                            </div>
                            <div className="text-gray-400 text-xs">{formatDate(adj.createdAt)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Risk Events */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-4">Risk Flags</h3>
                  <dl className="grid grid-cols-3 gap-4">
                    <div>
                      <dt className="text-sm text-gray-500">Risk Score</dt>
                      <dd className="text-2xl font-bold">{user.riskScore}/100</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500">Risk Level</dt>
                      <dd className="text-2xl">{riskIcons[user.riskLevel]} {user.riskLevel.toUpperCase()}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500">Toxic Flow Events</dt>
                      <dd className="text-2xl font-bold text-red-600">{user.toxicFlowCount}</dd>
                    </div>
                  </dl>
                  {user.flagReason && (
                    <div className="mt-4 p-3 bg-red-50 rounded-lg">
                      <p className="text-sm text-red-700"><strong>Flag Reason:</strong> {user.flagReason}</p>
                    </div>
                  )}
                </div>

                {/* Off-Mark Social Moderation */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🛡️</span>
                      <h3 className="font-medium text-gray-900">Off-Mark Status (Social Moderation)</h3>
                    </div>
                    <Link
                      href="/admin/moderation"
                      className="text-sm text-foremark-green hover:underline"
                    >
                      View all reports →
                    </Link>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <dt className="text-sm text-gray-500">Status</dt>
                      <dd className="font-medium text-gray-900">
                        <span className={`px-2 py-1 rounded text-sm ${
                          user.offMarkStatus === 'good_standing' ? 'bg-green-100 text-green-700' :
                          user.offMarkStatus === 'warning' ? 'bg-yellow-100 text-yellow-700' :
                          user.offMarkStatus === 'restricted' ? 'bg-orange-100 text-orange-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {user.offMarkStatus === 'good_standing' ? '✓ Good Standing' :
                           user.offMarkStatus === 'warning' ? '⚠️ Warning' :
                           user.offMarkStatus === 'restricted' ? '🚫 Restricted' : '🔴 Banned'}
                        </span>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500">Off-Mark Count</dt>
                      <dd className="font-medium text-gray-900">{user.offMarkCount || 0}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500">Reports Against</dt>
                      <dd className="font-medium text-gray-900">{user.reportsAgainst?.length || 0}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500">Restriction Expires</dt>
                      <dd className="font-medium text-gray-900">
                        {user.offMarkUntil ? formatDate(user.offMarkUntil) : 'N/A'}
                      </dd>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      <span className={`w-3 h-3 rounded-full ${user.canComment ? 'bg-green-500' : 'bg-red-500'}`}></span>
                      <span className="text-sm text-gray-600">Can Comment</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`w-3 h-3 rounded-full ${user.canPost ? 'bg-green-500' : 'bg-red-500'}`}></span>
                      <span className="text-sm text-gray-600">Can Post</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`w-3 h-3 rounded-full ${user.canChat ? 'bg-green-500' : 'bg-red-500'}`}></span>
                      <span className="text-sm text-gray-600">Can Chat</span>
                    </div>
                  </div>
                  {user.offMarkReason && (
                    <div className="p-3 bg-white rounded-lg mb-4">
                      <p className="text-sm text-gray-700"><strong>Reason:</strong> {user.offMarkReason}</p>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button className="px-3 py-1.5 bg-yellow-500 hover:bg-yellow-600 text-white rounded text-sm">
                      Issue Warning
                    </button>
                    <button className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded text-sm">
                      Restrict (Temp)
                    </button>
                    <button className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded text-sm">
                      Ban from Social
                    </button>
                    {user.offMarkStatus !== 'good_standing' && (
                      <button className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded text-sm">
                        Restore Access
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Status Change Modal */}
        {showStatusModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-medium mb-4">Change Account Status</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">New Status</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="active">Active</option>
                    <option value="frozen">Frozen</option>
                    <option value="suspended">Suspended</option>
                    <option value="banned">Banned</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reason <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={statusReason}
                    onChange={(e) => setStatusReason(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    rows={3}
                    placeholder="Required for audit trail..."
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => setShowStatusModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg">
                  Cancel
                </button>
                <button
                  onClick={handleStatusChange}
                  disabled={saving}
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Update Status'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Balance Adjustment Modal */}
        {showAdjustmentModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-medium mb-4">Balance Adjustment</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    value={adjustmentType}
                    onChange={(e) => setAdjustmentType(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="credit">Credit (Add)</option>
                    <option value="debit">Debit (Remove)</option>
                    <option value="refund">Refund</option>
                    <option value="bonus">Bonus</option>
                    <option value="correction">Correction</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={adjustmentAmount}
                    onChange={(e) => setAdjustmentAmount(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reason <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={adjustmentReason}
                    onChange={(e) => setAdjustmentReason(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    rows={3}
                    placeholder="Required for audit trail..."
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => setShowAdjustmentModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg">
                  Cancel
                </button>
                <button
                  onClick={handleBalanceAdjustment}
                  disabled={saving}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg disabled:opacity-50"
                >
                  {saving ? 'Processing...' : 'Apply Adjustment'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Limit Override Modal */}
        {showLimitModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-medium mb-4">Manual Limit Override</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Custom Max Bet ($)</label>
                  <input
                    type="number"
                    step="1"
                    value={customLimit}
                    onChange={(e) => setCustomLimit(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="Leave empty for tier default"
                  />
                  <p className="text-xs text-gray-500 mt-1">Override the tier-based max bet for this user</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Force Tier</label>
                  <select
                    value={tierOverride}
                    onChange={(e) => setTierOverride(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">Auto (based on market liquidity)</option>
                    <option value="0">Tier 0 - Seed ($100 taker / $250 maker)</option>
                    <option value="1">Tier 1 - Growth ($500 taker / $1k maker)</option>
                    <option value="2">Tier 2 - Established ($2k taker / $5k maker)</option>
                    <option value="3">Tier 3 - Mature ($5k taker / $10k maker)</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Force this user to a specific tier regardless of market liquidity</p>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => setShowLimitModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg">
                  Cancel
                </button>
                <button
                  onClick={handleLimitOverride}
                  disabled={saving}
                  className="px-4 py-2 bg-purple-500 text-white rounded-lg disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Overrides'}
                </button>
              </div>
            </div>
          </div>
        )}
      </AdminLayout>
    </>
  );
}
