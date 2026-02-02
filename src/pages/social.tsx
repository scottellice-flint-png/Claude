import { useState } from 'react';
import Link from 'next/link';

type TabType = 'feed' | 'following' | 'followers' | 'discover' | 'rewards';

interface User {
  id: string;
  username: string;
  avatar: string;
  bio: string;
  isVerified: boolean;
  isPublic: boolean;
  followers: number;
  following: number;
  predictions: number;
  winRate: number;
  isFollowing?: boolean;
  isPending?: boolean;
}

interface FeedItem {
  id: string;
  user: User;
  type: 'prediction' | 'result' | 'copy';
  market: string;
  position: 'yes' | 'no';
  amount: number;
  odds: number;
  timestamp: string;
  result?: 'won' | 'lost' | 'pending';
  copies?: number;
}

// Mock data
const mockUsers: User[] = [
  { id: '1', username: 'MarketMaster', avatar: 'bg-blue-500', bio: 'Full-time trader. Politics & economics specialist.', isVerified: true, isPublic: true, followers: 12450, following: 156, predictions: 2341, winRate: 62, isFollowing: true },
  { id: '2', username: 'AussiePunter', avatar: 'bg-green-500', bio: 'Sports betting enthusiast from Melbourne', isVerified: true, isPublic: true, followers: 8920, following: 89, predictions: 1567, winRate: 58, isFollowing: true },
  { id: '3', username: 'PredictorPro', avatar: 'bg-purple-500', bio: 'Data-driven predictions. Climate & world events.', isVerified: false, isPublic: true, followers: 3421, following: 234, predictions: 892, winRate: 55, isFollowing: false },
  { id: '4', username: 'SydneyTrader', avatar: 'bg-red-500', bio: 'Economics nerd. RBA watcher.', isVerified: false, isPublic: false, followers: 1205, following: 67, predictions: 456, winRate: 51, isFollowing: false, isPending: true },
  { id: '5', username: 'TradingKangaroo', avatar: 'bg-yellow-500', bio: 'Hopping through the markets', isVerified: true, isPublic: true, followers: 15670, following: 45, predictions: 3421, winRate: 64, isFollowing: false },
];

const mockFeed: FeedItem[] = [
  { id: '1', user: mockUsers[0], type: 'prediction', market: 'Will the RBA cut rates at its May 2026 meeting?', position: 'yes', amount: 5000, odds: 45, timestamp: '2 hours ago', copies: 34 },
  { id: '2', user: mockUsers[1], type: 'result', market: 'Will Collingwood win this weekend?', position: 'yes', amount: 2500, odds: 62, timestamp: '5 hours ago', result: 'won', copies: 12 },
  { id: '3', user: mockUsers[0], type: 'prediction', market: 'Will Labor form government after the next Federal Election?', position: 'no', amount: 10000, odds: 46, timestamp: '8 hours ago', copies: 89 },
  { id: '4', user: mockUsers[4], type: 'prediction', market: 'Will Bitcoin reach a new all-time high in 2026?', position: 'yes', amount: 7500, odds: 68, timestamp: '12 hours ago', copies: 156 },
  { id: '5', user: mockUsers[1], type: 'result', market: 'Who will win the 2026 Melbourne Cup?', position: 'yes', amount: 3000, odds: 15, timestamp: '1 day ago', result: 'lost', copies: 8 },
];

const formatCurrency = (cents: number) => {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
  }).format(cents / 100);
};

const formatNumber = (num: number) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
};

export default function SocialPage() {
  const [activeTab, setActiveTab] = useState<TabType>('feed');
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState(mockUsers);
  const [showRewardsInfo, setShowRewardsInfo] = useState(false);

  const filteredUsers = searchQuery.length >= 2
    ? users.filter(u => u.username.toLowerCase().includes(searchQuery.toLowerCase()))
    : users;

  const handleFollow = (userId: string) => {
    setUsers(users.map(u => {
      if (u.id === userId) {
        if (u.isPublic) {
          return { ...u, isFollowing: !u.isFollowing, followers: u.isFollowing ? u.followers - 1 : u.followers + 1 };
        } else {
          return { ...u, isPending: !u.isPending };
        }
      }
      return u;
    }));
  };

  const followingUsers = users.filter(u => u.isFollowing);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Social</h1>
            <p className="text-gray-600">Follow other predictors and see their activity in your feed.</p>
          </div>
          <div className="flex space-x-2">
            <Link
              href="/ideas"
              className="flex items-center space-x-2 px-4 py-2 bg-[#C8E64C] text-[#0F4C4C] rounded-lg font-medium hover:bg-[#b8d63c] transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <span>Ideas</span>
            </Link>
            <Link
              href="/chats"
              className="flex items-center space-x-2 px-4 py-2 bg-[#0F4C4C] text-white rounded-lg font-medium hover:bg-[#0a3a3a] transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span>Chats</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl mb-6 overflow-x-auto">
        {[
          { id: 'feed', label: 'Activity Feed' },
          { id: 'following', label: `Following (${followingUsers.length})` },
          { id: 'discover', label: 'Discover' },
          { id: 'rewards', label: 'Prediction Rewards' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className={`flex-1 min-w-[100px] px-4 py-2.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Activity Feed Tab */}
      {activeTab === 'feed' && (
        <div className="space-y-4">
          {followingUsers.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No activity yet</h3>
              <p className="text-gray-500 mb-4">Follow other predictors to see their activity in your feed.</p>
              <button
                onClick={() => setActiveTab('discover')}
                className="px-4 py-2 bg-foremark-green text-white font-medium rounded-lg hover:bg-foremark-green-light transition-colors"
              >
                Discover Predictors
              </button>
            </div>
          ) : (
            <>
              {mockFeed.map((item) => (
                <div key={item.id} className="bg-white rounded-xl border border-gray-200 p-4">
                  {/* User Info */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 ${item.user.avatar} rounded-full flex items-center justify-center text-white font-bold`}>
                      {item.user.username.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-1">
                        <span className="font-semibold text-gray-900">{item.user.username}</span>
                        {item.user.isVerified && (
                          <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">{item.timestamp}</span>
                    </div>
                    {item.result && (
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        item.result === 'won' ? 'bg-green-100 text-green-700' :
                        item.result === 'lost' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {item.result === 'won' ? 'Won' : item.result === 'lost' ? 'Lost' : 'Pending'}
                      </span>
                    )}
                  </div>

                  {/* Prediction Details */}
                  <div className="bg-gray-50 rounded-lg p-3 mb-3">
                    <p className="text-sm text-gray-900 font-medium mb-2">{item.market}</p>
                    <div className="flex items-center gap-4">
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${
                        item.position === 'yes' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {item.position.toUpperCase()} @ {item.odds}¢
                      </span>
                      <span className="text-sm text-gray-600">{formatCurrency(item.amount)}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <button className="flex items-center gap-1 text-sm text-gray-500 hover:text-foremark-green transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Copy Prediction
                      </button>
                      {item.copies && item.copies > 0 && (
                        <span className="text-xs text-gray-400">{item.copies} copies</span>
                      )}
                    </div>
                    <button className="text-gray-400 hover:text-gray-600">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* Following Tab */}
      {activeTab === 'following' && (
        <div className="space-y-4">
          {followingUsers.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Not following anyone yet</h3>
              <p className="text-gray-500 mb-4">Discover and follow predictors to see their activity.</p>
              <button
                onClick={() => setActiveTab('discover')}
                className="px-4 py-2 bg-foremark-green text-white font-medium rounded-lg hover:bg-foremark-green-light transition-colors"
              >
                Discover Predictors
              </button>
            </div>
          ) : (
            followingUsers.map((user) => (
              <div key={user.id} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 ${user.avatar} rounded-full flex items-center justify-center text-white text-lg font-bold`}>
                    {user.username.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="font-semibold text-gray-900">{user.username}</span>
                      {user.isVerified && (
                        <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 truncate">{user.bio}</p>
                    <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
                      <span>{formatNumber(user.followers)} followers</span>
                      <span>{user.winRate}% win rate</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleFollow(user.id)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Following
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Discover Tab */}
      {activeTab === 'discover' && (
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for predictors..."
              className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-foremark-green/20 focus:border-foremark-green"
            />
          </div>

          {/* How to Follow Info */}
          <div className="bg-foremark-lime/20 border border-foremark-lime rounded-xl p-4">
            <h3 className="font-semibold text-foremark-green mb-2">How to Follow</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• <strong>Public profiles:</strong> Tap Follow and you'll automatically be accepted</li>
              <li>• <strong>Private profiles:</strong> Send a follow request and wait for approval</li>
              <li>• Once following, their predictions appear in your Activity Feed</li>
              <li>• Build your own following to become eligible for Verified Predictor status</li>
            </ul>
          </div>

          {/* User List */}
          <div className="space-y-3">
            {filteredUsers.map((user) => (
              <div key={user.id} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-start gap-4">
                  <div className={`w-14 h-14 ${user.avatar} rounded-full flex items-center justify-center text-white text-xl font-bold flex-shrink-0`}>
                    {user.username.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-900">{user.username}</span>
                      {user.isVerified && (
                        <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      )}
                      {!user.isPublic && (
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mb-2">{user.bio}</p>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400">
                      <span>{formatNumber(user.followers)} followers</span>
                      <span>{formatNumber(user.following)} following</span>
                      <span>{formatNumber(user.predictions)} predictions</span>
                      <span className="text-foremark-green font-medium">{user.winRate}% win rate</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleFollow(user.id)}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex-shrink-0 ${
                      user.isFollowing
                        ? 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                        : user.isPending
                        ? 'border border-amber-300 text-amber-700 bg-amber-50'
                        : 'bg-foremark-green text-white hover:bg-foremark-green-light'
                    }`}
                  >
                    {user.isFollowing ? 'Following' : user.isPending ? 'Requested' : 'Follow'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Prediction Rewards Tab */}
      {activeTab === 'rewards' && (
        <div className="space-y-6">
          {/* Overview Card */}
          <div className="bg-gradient-to-br from-foremark-green to-teal-700 rounded-2xl p-6 text-white">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold mb-2">Prediction Rewards</h2>
                <p className="text-white/80">Earn rewards when others copy your predictions</p>
              </div>
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white/10 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold">$0.10</p>
                <p className="text-xs text-white/70">per unique copy</p>
              </div>
              <div className="bg-white/10 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold">$1,000</p>
                <p className="text-xs text-white/70">max per week</p>
              </div>
              <div className="bg-white/10 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold">Weekly</p>
                <p className="text-xs text-white/70">payouts</p>
              </div>
            </div>
          </div>

          {/* Your Stats */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Your Rewards This Week</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-foremark-green">127</p>
                <p className="text-xs text-gray-500">Unique Copies</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-foremark-green">$12.70</p>
                <p className="text-xs text-gray-500">Earnings</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-gray-900">34</p>
                <p className="text-xs text-gray-500">Eligible Predictions</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-gray-900">5d 14h</p>
                <p className="text-xs text-gray-500">Until Payout</p>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-4 text-center">
              Payments are made every Thursday by 12pm AEST for the prior week's copies.
            </p>
          </div>

          {/* How It Works */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-4">How It Works</h3>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="w-8 h-8 bg-foremark-lime rounded-full flex items-center justify-center flex-shrink-0 text-foremark-green font-bold">1</div>
                <div>
                  <p className="font-medium text-gray-900">Make Predictions</p>
                  <p className="text-sm text-gray-500">Place predictions with a minimum stake of $1 on any market.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-8 h-8 bg-foremark-lime rounded-full flex items-center justify-center flex-shrink-0 text-foremark-green font-bold">2</div>
                <div>
                  <p className="font-medium text-gray-900">Get Copied</p>
                  <p className="text-sm text-gray-500">When other users copy your prediction (min $1 stake), you earn rewards.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-8 h-8 bg-foremark-lime rounded-full flex items-center justify-center flex-shrink-0 text-foremark-green font-bold">3</div>
                <div>
                  <p className="font-medium text-gray-900">Earn $0.10 Per Copy</p>
                  <p className="text-sm text-gray-500">Each unique user who copies earns you $0.10, regardless of outcome.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-8 h-8 bg-foremark-lime rounded-full flex items-center justify-center flex-shrink-0 text-foremark-green font-bold">4</div>
                <div>
                  <p className="font-medium text-gray-900">Get Paid Weekly</p>
                  <p className="text-sm text-gray-500">Rewards are calculated and paid every Thursday for the prior week.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Eligibility */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Eligibility Requirements</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <p className="text-sm text-gray-600">Your prediction stake must be at least <strong>$1</strong></p>
              </div>
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <p className="text-sm text-gray-600">The copied prediction stake must be at least <strong>$1</strong></p>
              </div>
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <p className="text-sm text-gray-600">Your prediction must be <strong>visible</strong> (not hidden)</p>
              </div>
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <p className="text-sm text-gray-600">You must follow <Link href="/profile" className="text-foremark-green hover:underline">Community Guidelines</Link></p>
              </div>
            </div>
          </div>

          {/* FAQs */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <button
              onClick={() => setShowRewardsInfo(!showRewardsInfo)}
              className="w-full flex items-center justify-between"
            >
              <h3 className="font-semibold text-gray-900">Frequently Asked Questions</h3>
              <svg className={`w-5 h-5 text-gray-400 transition-transform ${showRewardsInfo ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showRewardsInfo && (
              <div className="mt-4 space-y-4 pt-4 border-t border-gray-100">
                <div>
                  <p className="font-medium text-gray-900 mb-1">What is a unique copy?</p>
                  <p className="text-sm text-gray-500">We count the first copy from each unique user on your predictions. If someone copies the same prediction twice, it only counts as 1 unique copy.</p>
                </div>
                <div>
                  <p className="font-medium text-gray-900 mb-1">When will I get paid?</p>
                  <p className="text-sm text-gray-500">Payments are made by 12pm every Thursday for copies on predictions that settled during the prior Thursday 12am – Wednesday 11:59pm period.</p>
                </div>
                <div>
                  <p className="font-medium text-gray-900 mb-1">Do my predictions have to win?</p>
                  <p className="text-sm text-gray-500">No. You earn rewards based on the number of unique copies, regardless of whether your prediction wins or loses.</p>
                </div>
                <div>
                  <p className="font-medium text-gray-900 mb-1">Can I copy my own predictions?</p>
                  <p className="text-sm text-gray-500">No. Copying your own predictions does not count towards rewards. Users found doing this may be removed from the program.</p>
                </div>
                <div>
                  <p className="font-medium text-gray-900 mb-1">Is there a maximum earning?</p>
                  <p className="text-sm text-gray-500">Yes. The maximum you can earn is $1,000 per week.</p>
                </div>
                <div>
                  <p className="font-medium text-gray-900 mb-1">Do rewards need to be turned over?</p>
                  <p className="text-sm text-gray-500">No. Prediction Rewards have no turnover requirements and can be withdrawn immediately.</p>
                </div>
                <div>
                  <p className="font-medium text-gray-900 mb-1">What about promotional predictions?</p>
                  <p className="text-sm text-gray-500">Predictions marked as specific promotions (e.g., "Copy This Prediction") are not eligible. General promotions remain eligible.</p>
                </div>
              </div>
            )}
          </div>

          {/* Program Rules Notice */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className="font-medium text-amber-800 mb-1">Program Rules</p>
                <p className="text-sm text-amber-700">
                  Eligibility is determined at Foremark's discretion. Abuse of the program (including multiple accounts, manipulation, or suspicious activity) will result in removal.
                  Users promoting paid tip services are not eligible. See full <Link href="#" className="underline">Terms & Conditions</Link>.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
