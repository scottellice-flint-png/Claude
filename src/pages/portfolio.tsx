import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useStore } from '@/store';
import { useSession } from 'next-auth/react';

type ActivityFilter = 'all' | 'deposits' | 'withdrawals' | 'bets' | 'results' | 'bonuses';

interface Activity {
  id: string;
  type: 'deposit' | 'withdrawal' | 'bet' | 'result' | 'bonus';
  title: string;
  description?: string;
  amount: number; // positive = credit, negative = debit
  status: 'completed' | 'pending' | 'won' | 'lost';
  timestamp: string;
  marketId?: string;
}

// Mock activity data for demonstration
const MOCK_ACTIVITIES: Activity[] = [
  {
    id: 'act-1',
    type: 'bet',
    title: 'Albanese to win 2025 Federal Election?',
    description: 'Yes @ 62¢',
    amount: -5000,
    status: 'pending',
    timestamp: '2026-01-31T14:30:00Z',
    marketId: '1',
  },
  {
    id: 'act-2',
    type: 'result',
    title: 'RBA rate decision Feb 2026?',
    description: 'No @ 78¢ - Won',
    amount: 10000,
    status: 'won',
    timestamp: '2026-01-28T10:00:00Z',
    marketId: '10',
  },
  {
    id: 'act-3',
    type: 'deposit',
    title: 'Deposit via PayID',
    amount: 50000,
    status: 'completed',
    timestamp: '2026-01-27T09:15:00Z',
  },
  {
    id: 'act-4',
    type: 'bonus',
    title: 'Welcome Bonus',
    description: 'First deposit matched',
    amount: 2500,
    status: 'completed',
    timestamp: '2026-01-27T09:16:00Z',
  },
  {
    id: 'act-5',
    type: 'bet',
    title: 'Melbourne Cup 2026 Winner',
    description: 'Without A Fight @ 15¢',
    amount: -2500,
    status: 'pending',
    timestamp: '2026-01-25T16:45:00Z',
    marketId: 'racing-1',
  },
  {
    id: 'act-6',
    type: 'result',
    title: 'Australia to win SCG Test?',
    description: 'Yes @ 55¢ - Lost',
    amount: -3000,
    status: 'lost',
    timestamp: '2026-01-20T18:00:00Z',
  },
  {
    id: 'act-7',
    type: 'withdrawal',
    title: 'Withdrawal to Bank Account',
    description: 'BSB: •••-••• Acc: ••••5678',
    amount: -20000,
    status: 'completed',
    timestamp: '2026-01-18T11:30:00Z',
  },
];

const FILTER_OPTIONS: { id: ActivityFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'deposits', label: 'Deposits' },
  { id: 'withdrawals', label: 'Withdrawals' },
  { id: 'bets', label: 'Bets' },
  { id: 'results', label: 'Results' },
  { id: 'bonuses', label: 'Bonuses' },
];

export default function PortfolioPage() {
  const [activeFilter, setActiveFilter] = useState<ActivityFilter>('all');
  const { data: session } = useSession();
  const storeUser = useStore((state) => state.user);

  // Use session user if authenticated, otherwise fall back to store user
  const user = session?.user?.userType === 'user' ? {
    id: session.user.id,
    username: session.user.username || 'User',
    balance: session.user.balance || 0,
  } : storeUser;

  const filteredActivities = useMemo(() => {
    if (activeFilter === 'all') return MOCK_ACTIVITIES;

    const typeMap: Record<ActivityFilter, Activity['type'][]> = {
      all: [],
      deposits: ['deposit'],
      withdrawals: ['withdrawal'],
      bets: ['bet'],
      results: ['result'],
      bonuses: ['bonus'],
    };

    return MOCK_ACTIVITIES.filter(activity => typeMap[activeFilter].includes(activity.type));
  }, [activeFilter]);

  const formatCurrency = (cents: number) => {
    const isNegative = cents < 0;
    const formatted = new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 2,
    }).format(Math.abs(cents) / 100);

    return isNegative ? `-${formatted}` : `+${formatted}`;
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return `Today, ${date.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffDays === 1) {
      return `Yesterday, ${date.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffDays < 7) {
      return date.toLocaleDateString('en-AU', { weekday: 'long', hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
    }
  };

  const getActivityIcon = (type: Activity['type']) => {
    switch (type) {
      case 'deposit':
        return (
          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
        );
      case 'withdrawal':
        return (
          <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </div>
        );
      case 'bet':
        return (
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
        );
      case 'result':
        return (
          <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
      case 'bonus':
        return (
          <div className="w-10 h-10 bg-foremark-lime rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-foremark-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
            </svg>
          </div>
        );
    }
  };

  const getStatusBadge = (activity: Activity) => {
    switch (activity.status) {
      case 'pending':
        return (
          <span className="px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
            Pending
          </span>
        );
      case 'won':
        return (
          <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded-full">
            Won
          </span>
        );
      case 'lost':
        return (
          <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800 rounded-full">
            Lost
          </span>
        );
      case 'completed':
        return (
          <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
            Completed
          </span>
        );
    }
  };

  if (!user) {
    return (
      <div className="text-center py-16">
        <div className="text-6xl mb-4">🔒</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Please log in</h2>
        <p className="text-gray-500 mb-6">You need to be logged in to view your activity.</p>
        <Link
          href="/login"
          className="inline-flex items-center px-6 py-3 bg-foremark-green text-white font-semibold rounded-lg hover:bg-foremark-green-light transition-colors"
        >
          Log in
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          Your activity
          <button
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
            title="Download activity statement"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </button>
        </h1>
      </div>

      {/* Filter Chips */}
      <div className="flex flex-wrap gap-2 mb-6">
        {FILTER_OPTIONS.map((filter) => (
          <button
            key={filter.id}
            onClick={() => setActiveFilter(filter.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              activeFilter === filter.id
                ? 'bg-gray-900 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Activity List */}
      {filteredActivities.length > 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {filteredActivities.map((activity) => (
            <div key={activity.id} className="p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-start gap-4">
                {/* Icon */}
                {getActivityIcon(activity.type)}

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      {activity.marketId ? (
                        <Link
                          href={`/market/${activity.marketId}`}
                          className="font-medium text-gray-900 hover:text-foremark-green line-clamp-1"
                        >
                          {activity.title}
                        </Link>
                      ) : (
                        <p className="font-medium text-gray-900">{activity.title}</p>
                      )}
                      {activity.description && (
                        <p className="text-sm text-gray-500 mt-0.5">{activity.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-400">{formatDate(activity.timestamp)}</span>
                        {getStatusBadge(activity)}
                      </div>
                    </div>

                    {/* Amount */}
                    <p className={`font-semibold whitespace-nowrap ${
                      activity.amount >= 0 ? 'text-green-600' : 'text-gray-900'
                    }`}>
                      {formatCurrency(activity.amount)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 py-16 px-4 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">No activity with these filters</h3>
          <p className="text-gray-500 text-sm">
            {activeFilter === 'all'
              ? 'Your activity will appear here once you start trading.'
              : `No ${activeFilter} found. Try a different filter.`
            }
          </p>
          {activeFilter === 'all' && (
            <Link
              href="/"
              className="inline-flex items-center mt-4 px-5 py-2.5 bg-foremark-green text-white rounded-lg font-semibold hover:bg-foremark-green-light transition-colors"
            >
              Browse Markets
            </Link>
          )}
        </div>
      )}

      {/* Responsible Gambling Notice */}
      <div className="mt-8 p-4 bg-gray-50 rounded-xl border border-gray-200">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-sm text-gray-600">
              <strong>Gambling Help:</strong> If you or someone you know has a gambling problem,
              call <a href="tel:1800858858" className="text-foremark-green font-medium">1800 858 858</a> or
              visit <a href="https://www.gamblinghelponline.org.au" target="_blank" rel="noopener noreferrer" className="text-foremark-green font-medium">gamblinghelponline.org.au</a>
            </p>
            <p className="text-xs text-gray-500 mt-1">
              You can set deposit limits in your <Link href="/profile" className="text-foremark-green">Account settings</Link>.
            </p>
          </div>
        </div>
      </div>

      {/* Activity Statement Download Section */}
      <div className="mt-6 bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 mb-2">Activity Statement</h3>
        <p className="text-sm text-gray-600 mb-4">
          Download your complete activity history for record keeping or tax purposes.
        </p>
        <div className="flex flex-wrap gap-3">
          <button className="px-4 py-2 text-sm font-medium text-foremark-green border border-foremark-green rounded-lg hover:bg-foremark-green hover:text-white transition-colors">
            Last 30 days
          </button>
          <button className="px-4 py-2 text-sm font-medium text-foremark-green border border-foremark-green rounded-lg hover:bg-foremark-green hover:text-white transition-colors">
            Last 90 days
          </button>
          <button className="px-4 py-2 text-sm font-medium text-foremark-green border border-foremark-green rounded-lg hover:bg-foremark-green hover:text-white transition-colors">
            Financial Year
          </button>
          <button className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            Custom Range
          </button>
        </div>
      </div>
    </div>
  );
}
