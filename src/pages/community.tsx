import { useState } from 'react';
import Link from 'next/link';
import { useStore } from '@/store';

type TabType = 'feed' | 'discover' | 'market-builder' | 'rewards' | 'bookmarks';

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
  type: 'post' | 'prediction';
  author: User;
  content?: string;
  linkedMarket?: {
    id: string;
    title: string;
    yesPrice: number;
    category: string;
  };
  prediction?: {
    market: string;
    position: 'yes' | 'no';
    amount: number;
    odds: number;
    result?: 'won' | 'lost' | 'pending';
  };
  category: string;
  timestamp: string;
  likes: number;
  comments: number;
  shares: number;
  copies?: number;
  isLiked: boolean;
  isBookmarked: boolean;
}

interface MarketSuggestion {
  id: string;
  title: string;
  description: string;
  category: string;
  resolutionSource: string;
  author: { username: string; avatar: string };
  upvotes: number;
  status: 'pending' | 'approved' | 'rejected';
  timestamp: Date;
}

// Mock users
const mockUsers: User[] = [
  { id: '1', username: 'MarketMaster', avatar: '📊', bio: 'Full-time punter. Politics & economics specialist.', isVerified: true, isPublic: true, followers: 12450, following: 156, predictions: 2341, winRate: 62, isFollowing: true },
  { id: '2', username: 'AussiePunter', avatar: '🦘', bio: 'Sports betting enthusiast from Melbourne', isVerified: true, isPublic: true, followers: 8920, following: 89, predictions: 1567, winRate: 58, isFollowing: true },
  { id: '3', username: 'PredictorPro', avatar: '🎯', bio: 'Data-driven predictions. Climate & world events.', isVerified: false, isPublic: true, followers: 3421, following: 234, predictions: 892, winRate: 55, isFollowing: false },
  { id: '4', username: 'SydneyPunter', avatar: '🌊', bio: 'Economics nerd. RBA watcher.', isVerified: false, isPublic: false, followers: 1205, following: 67, predictions: 456, winRate: 51, isFollowing: false, isPending: true },
  { id: '5', username: 'BettingKangaroo', avatar: '💰', bio: 'Hopping through the markets', isVerified: true, isPublic: true, followers: 15670, following: 45, predictions: 3421, winRate: 64, isFollowing: false },
];

// Mock feed with both posts and predictions
const mockFeed: FeedItem[] = [
  {
    id: '1',
    type: 'post',
    author: mockUsers[0],
    content: "RBA is definitely cutting in February. Inflation numbers are trending down and unemployment is creeping up. The writing is on the wall. What's everyone's thoughts?",
    linkedMarket: { id: 'rba-feb', title: 'RBA to cut rates in February 2025', yesPrice: 67, category: 'economics' },
    category: 'economics',
    timestamp: '30m ago',
    likes: 24,
    comments: 8,
    shares: 3,
    isLiked: false,
    isBookmarked: false,
  },
  {
    id: '2',
    type: 'prediction',
    author: mockUsers[1],
    prediction: { market: 'Collingwood to win vs Carlton', position: 'yes', amount: 5000, odds: 62, result: 'won' },
    category: 'sport',
    timestamp: '2h ago',
    likes: 12,
    comments: 5,
    shares: 2,
    copies: 34,
    isLiked: true,
    isBookmarked: false,
  },
  {
    id: '3',
    type: 'post',
    author: mockUsers[2],
    content: "Labor's numbers keep slipping in the polls. Anyone else think the coalition has a real shot at the next election? The housing crisis is killing them.",
    linkedMarket: { id: 'fed-election', title: 'Coalition to win 2025 Federal Election', yesPrice: 42, category: 'politics' },
    category: 'politics',
    timestamp: '3h ago',
    likes: 45,
    comments: 23,
    shares: 7,
    isLiked: false,
    isBookmarked: true,
  },
  {
    id: '4',
    type: 'prediction',
    author: mockUsers[0],
    prediction: { market: 'Will Labor form government after the next Federal Election?', position: 'no', amount: 10000, odds: 46 },
    category: 'politics',
    timestamp: '5h ago',
    likes: 31,
    comments: 18,
    shares: 5,
    copies: 89,
    isLiked: false,
    isBookmarked: false,
  },
  {
    id: '5',
    type: 'post',
    author: mockUsers[4],
    content: "BOM just updated their models - La Niña is looking increasingly likely for this summer. Time to position for weather-related markets!",
    category: 'climate',
    timestamp: '8h ago',
    likes: 18,
    comments: 5,
    shares: 2,
    isLiked: false,
    isBookmarked: false,
  },
  {
    id: '6',
    type: 'prediction',
    author: mockUsers[4],
    prediction: { market: 'Sydney median house price above $1.5M by end of 2025', position: 'yes', amount: 7500, odds: 68 },
    category: 'economics',
    timestamp: '12h ago',
    likes: 22,
    comments: 14,
    shares: 3,
    copies: 156,
    isLiked: true,
    isBookmarked: true,
  },
];

// Mock market suggestions
const mockMarketSuggestions: MarketSuggestion[] = [
  {
    id: '1',
    title: 'Taylor Swift to announce Australian tour dates for 2025',
    description: 'Resolves Yes if Taylor Swift officially announces Australian concert dates for 2025 before December 31, 2024',
    category: 'culture',
    resolutionSource: 'Official Taylor Swift or promoter announcement',
    author: { username: 'SwiftieAU', avatar: '🎤' },
    upvotes: 234,
    status: 'pending',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6),
  },
  {
    id: '2',
    title: 'Melbourne property prices to fall 10%+ in 2025',
    description: 'Resolves Yes if CoreLogic Melbourne dwelling values decrease by 10% or more from Jan 1 to Dec 31, 2025',
    category: 'economics',
    resolutionSource: 'CoreLogic monthly home value index',
    author: { username: 'PropertyPro', avatar: '🏠' },
    upvotes: 189,
    status: 'approved',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
  },
];

const categories = [
  { id: 'all', label: 'All', icon: '🏠' },
  { id: 'politics', label: 'Politics', icon: '🏛️' },
  { id: 'economics', label: 'Economics', icon: '📊' },
  { id: 'culture', label: 'Culture', icon: '🎭' },
  { id: 'climate', label: 'Climate', icon: '🌦️' },
  { id: 'world', label: 'World', icon: '🌍' },
  { id: 'sport', label: 'Sport', icon: '🏆' },
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

export default function CommunityPage() {
  const markets = useStore((state) => state.markets);
  const [activeTab, setActiveTab] = useState<TabType>('feed');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState(mockUsers);
  const [feed, setFeed] = useState(mockFeed);
  const [showNewPostModal, setShowNewPostModal] = useState(false);
  const [showMarketBuilderModal, setShowMarketBuilderModal] = useState(false);
  const [showRewardsFaq, setShowRewardsFaq] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostCategory, setNewPostCategory] = useState('general');
  const [selectedMarket, setSelectedMarket] = useState<string | null>(null);

  // Market Builder state
  const [newMarketTitle, setNewMarketTitle] = useState('');
  const [newMarketDescription, setNewMarketDescription] = useState('');
  const [newMarketCategory, setNewMarketCategory] = useState('politics');
  const [newMarketResolution, setNewMarketResolution] = useState('');

  const followingUsers = users.filter(u => u.isFollowing);
  const followingCount = followingUsers.length;

  const filteredFeed = categoryFilter === 'all'
    ? feed
    : feed.filter(item => item.category === categoryFilter);

  const filteredUsers = searchQuery.length >= 2
    ? users.filter(u => u.username.toLowerCase().includes(searchQuery.toLowerCase()))
    : users;

  const bookmarkedItems = feed.filter(item => item.isBookmarked);

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

  const handleLike = (itemId: string) => {
    setFeed(feed.map(item =>
      item.id === itemId
        ? { ...item, isLiked: !item.isLiked, likes: item.isLiked ? item.likes - 1 : item.likes + 1 }
        : item
    ));
  };

  const handleBookmark = (itemId: string) => {
    setFeed(feed.map(item =>
      item.id === itemId
        ? { ...item, isBookmarked: !item.isBookmarked }
        : item
    ));
  };

  const handleNewPost = () => {
    if (newPostContent.trim()) {
      const linkedMarketData = selectedMarket
        ? markets.find(m => m.id === selectedMarket)
        : null;

      const newItem: FeedItem = {
        id: Date.now().toString(),
        type: 'post',
        author: { id: 'me', username: 'You', avatar: '👤', bio: '', isVerified: false, isPublic: true, followers: 0, following: 0, predictions: 0, winRate: 0 },
        content: newPostContent,
        linkedMarket: linkedMarketData ? {
          id: linkedMarketData.id,
          title: linkedMarketData.title,
          yesPrice: linkedMarketData.yesPrice,
          category: linkedMarketData.category,
        } : undefined,
        category: newPostCategory,
        timestamp: 'Just now',
        likes: 0,
        comments: 0,
        shares: 0,
        isLiked: false,
        isBookmarked: false,
      };

      setFeed([newItem, ...feed]);
      setNewPostContent('');
      setSelectedMarket(null);
      setShowNewPostModal(false);
    }
  };

  const handleSubmitMarketSuggestion = () => {
    if (newMarketTitle.trim() && newMarketDescription.trim()) {
      alert(`Market suggestion submitted: "${newMarketTitle}"\n\nOur team will review your suggestion and notify you if it gets approved.`);
      setNewMarketTitle('');
      setNewMarketDescription('');
      setNewMarketResolution('');
      setShowMarketBuilderModal(false);
    }
  };

  const renderFeedItem = (item: FeedItem) => (
    <div key={item.id} className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4 hover:shadow-md transition-shadow">
      {/* Author Header */}
      <div className="flex items-start justify-between mb-2 sm:mb-3">
        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
          <span className="text-xl sm:text-2xl flex-shrink-0">{item.author.avatar}</span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center flex-wrap gap-1">
              <span className="font-semibold text-gray-900 text-sm sm:text-base truncate">{item.author.username}</span>
              {item.author.isVerified && (
                <span className="text-[#0F4C4C] flex-shrink-0" title="Verified Predictor">✓</span>
              )}
              {item.type === 'prediction' && (
                <span className="text-[10px] sm:text-xs bg-[#C8E64C] text-[#0F4C4C] px-1.5 sm:px-2 py-0.5 rounded-full font-medium flex-shrink-0">
                  Prediction
                </span>
              )}
            </div>
            <div className="flex items-center space-x-1.5 sm:space-x-2 text-[10px] sm:text-xs text-gray-500">
              <span>{item.timestamp}</span>
              <span>•</span>
              <span className="capitalize">{item.category}</span>
            </div>
          </div>
        </div>
        <button className="text-gray-400 hover:text-gray-600 p-1 flex-shrink-0">
          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
          </svg>
        </button>
      </div>

      {/* Content */}
      {item.type === 'post' && item.content && (
        <p className="text-sm sm:text-base text-gray-800 mb-2 sm:mb-3 whitespace-pre-wrap">{item.content}</p>
      )}

      {/* Linked Market (for posts) */}
      {item.linkedMarket && (
        <Link
          href={`/market/${item.linkedMarket.id}`}
          className="block bg-gray-50 border border-gray-200 rounded-lg p-2.5 sm:p-3 mb-2 sm:mb-3 hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] sm:text-xs text-gray-500 uppercase mb-0.5 sm:mb-1">Linked Market</p>
              <p className="font-medium text-gray-900 text-xs sm:text-sm line-clamp-2">{item.linkedMarket.title}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-base sm:text-lg font-bold text-[#0F4C4C]">{item.linkedMarket.yesPrice}%</p>
              <p className="text-[10px] sm:text-xs text-gray-500">Yes</p>
            </div>
          </div>
        </Link>
      )}

      {/* Prediction Card (for predictions) */}
      {item.type === 'prediction' && item.prediction && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-2.5 sm:p-3 mb-2 sm:mb-3">
          <p className="text-xs sm:text-sm text-gray-900 font-medium mb-2 line-clamp-2">{item.prediction.market}</p>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <span className={`px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs font-semibold rounded ${
                item.prediction.position === 'yes' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {item.prediction.position.toUpperCase()} @ {item.prediction.odds}¢
              </span>
              <span className="text-xs sm:text-sm font-medium text-gray-900">{formatCurrency(item.prediction.amount)}</span>
            </div>
            {item.prediction.result && (
              <span className={`px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs font-medium rounded-full ${
                item.prediction.result === 'won' ? 'bg-green-100 text-green-700' :
                item.prediction.result === 'lost' ? 'bg-red-100 text-red-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {item.prediction.result === 'won' ? 'Won' : item.prediction.result === 'lost' ? 'Lost' : 'Pending'}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-2 sm:pt-3 border-t border-gray-100">
        <div className="flex items-center space-x-0.5 sm:space-x-1">
          <button
            onClick={() => handleLike(item.id)}
            className={`flex items-center space-x-1 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg transition-colors ${
              item.isLiked ? 'text-red-500 bg-red-50' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill={item.isLiked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            <span className="text-xs sm:text-sm">{item.likes}</span>
          </button>

          <button className="flex items-center space-x-1 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-gray-500 hover:bg-gray-50 transition-colors">
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className="text-xs sm:text-sm">{item.comments}</span>
          </button>

          {item.type === 'prediction' && (
            <button className="flex items-center space-x-1 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[#0F4C4C] hover:bg-[#C8E64C]/20 transition-colors">
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span className="text-xs sm:text-sm font-medium">Copy</span>
              {item.copies && <span className="text-[10px] sm:text-xs text-gray-400 ml-0.5 sm:ml-1">({item.copies})</span>}
            </button>
          )}
        </div>

        <button
          onClick={() => handleBookmark(item.id)}
          className={`p-1 sm:p-1.5 rounded-lg transition-colors ${
            item.isBookmarked ? 'text-[#0F4C4C] bg-[#C8E64C]/20' : 'text-gray-400 hover:bg-gray-50'
          }`}
        >
          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill={item.isBookmarked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="hidden lg:block lg:col-span-1">
            <div className="bg-white rounded-xl p-4 sticky top-24">
              <h1 className="text-2xl font-bold text-[#0F4C4C] mb-1">Community</h1>
              <p className="text-sm text-gray-500 mb-3">Predictions, ideas & discussion</p>

              {/* Desktop Explainer */}
              <div className="bg-[#C8E64C]/20 border border-[#C8E64C] rounded-lg p-3 mb-4">
                <p className="text-xs text-[#0F4C4C] leading-relaxed">
                  <strong>Connect with predictors</strong> - Follow top bettors, share your views, and discover predictions. Invite friends via link, even if they&apos;re not on Foremark!
                </p>
              </div>

              {/* Following Stats */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg mb-4">
                <div className="text-center">
                  <p className="text-lg font-bold text-[#0F4C4C]">{followingCount}</p>
                  <p className="text-xs text-gray-500">Following</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-gray-900">127</p>
                  <p className="text-xs text-gray-500">Followers</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-green-600">62%</p>
                  <p className="text-xs text-gray-500">Win Rate</p>
                </div>
              </div>

              {/* Navigation */}
              <nav className="space-y-1">
                {[
                  { id: 'feed', label: 'Feed', icon: '🏠' },
                  { id: 'discover', label: 'Discover', icon: '🔍' },
                  { id: 'market-builder', label: 'Market Builder', icon: '💡' },
                  { id: 'rewards', label: 'Rewards', icon: '💰' },
                  { id: 'bookmarks', label: 'Bookmarks', icon: '🔖' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as TabType)}
                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                      activeTab === tab.id ? 'bg-[#C8E64C]/20 text-[#0F4C4C] font-medium' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span>{tab.icon}</span>
                    <span>{tab.label}</span>
                  </button>
                ))}
              </nav>

              {/* Quick Links */}
              <div className="mt-4 pt-4 border-t border-gray-100 space-y-1">
                <Link href="/chats" className="flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors">
                  <span>💬</span>
                  <span>Group Chats</span>
                </Link>
                <Link href="/profile" className="flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors">
                  <span>👤</span>
                  <span>Profile Settings</span>
                </Link>
              </div>

              <button
                onClick={() => setShowNewPostModal(true)}
                className="w-full mt-4 bg-[#0F4C4C] text-white py-3 rounded-lg font-semibold hover:bg-[#0a3a3a] transition-colors"
              >
                Post
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Mobile Header */}
            <div className="lg:hidden mb-4">
              <div className="mb-3">
                <h1 className="text-2xl font-bold text-[#0F4C4C]">Community</h1>
                <p className="text-sm text-gray-500">Predictions, ideas & discussion</p>
              </div>

              {/* Mobile Explainer Card */}
              <div className="bg-gradient-to-r from-[#0F4C4C] to-[#1a6b6b] rounded-xl p-4 text-white">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm mb-1">Connect with predictors</h3>
                    <p className="text-white/80 text-xs leading-relaxed">
                      Follow top predictors, share your market views, and discover new predictions. Invite friends to join - even if they&apos;re not on Foremark yet!
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile Tabs */}
            <div className="lg:hidden flex space-x-1 mb-4 bg-gray-100 rounded-lg p-1 overflow-x-auto">
              {[
                { id: 'feed', label: 'Feed' },
                { id: 'discover', label: 'Discover' },
                { id: 'market-builder', label: 'Builder' },
                { id: 'rewards', label: 'Rewards' },
                { id: 'bookmarks', label: 'Saved' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`flex-shrink-0 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-white text-[#0F4C4C] shadow-sm'
                      : 'text-gray-600'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Feed Tab */}
            {activeTab === 'feed' && (
              <>
                {/* Create Post */}
                <div className="bg-white rounded-xl p-4 mb-4 border border-gray-100">
                  <div className="flex items-start space-x-3">
                    <span className="text-2xl">👤</span>
                    <button
                      onClick={() => setShowNewPostModal(true)}
                      className="flex-1 text-left px-4 py-3 bg-gray-50 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
                    >
                      Share your prediction or market idea...
                    </button>
                  </div>
                </div>

                {/* Category Filters */}
                <div className="flex space-x-2 mb-4 overflow-x-auto pb-2">
                  {categories.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setCategoryFilter(cat.id)}
                      className={`flex items-center space-x-1 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                        categoryFilter === cat.id
                          ? 'bg-[#0F4C4C] text-white'
                          : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                      }`}
                    >
                      <span>{cat.icon}</span>
                      <span>{cat.label}</span>
                    </button>
                  ))}
                </div>

                {/* Feed */}
                <div className="space-y-4">
                  {filteredFeed.length > 0 ? (
                    filteredFeed.map(item => renderFeedItem(item))
                  ) : (
                    <div className="bg-white rounded-xl p-8 text-center">
                      <div className="text-4xl mb-3">📭</div>
                      <p className="text-gray-600">No posts in this category</p>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Discover Tab */}
            {activeTab === 'discover' && (
              <div className="space-y-3 sm:space-y-4">
                {/* Search */}
                <div className="relative">
                  <svg className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search for predictors..."
                    className="w-full pl-10 sm:pl-12 pr-4 py-2.5 sm:py-3 text-sm sm:text-base border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F4C4C]/20 focus:border-[#0F4C4C]"
                  />
                </div>

                {/* How to Follow */}
                <div className="bg-[#C8E64C]/20 border border-[#C8E64C] rounded-xl p-3 sm:p-4">
                  <h3 className="font-semibold text-[#0F4C4C] mb-2 text-sm sm:text-base">How to Follow</h3>
                  <ul className="text-xs sm:text-sm text-gray-600 space-y-1">
                    <li>• <strong>Public profiles:</strong> Tap Follow and you&apos;ll automatically be accepted</li>
                    <li>• <strong>Private profiles:</strong> Send a follow request and wait for approval</li>
                    <li>• Once following, their posts and predictions appear in your Feed</li>
                  </ul>
                </div>

                {/* Users */}
                <div className="space-y-2 sm:space-y-3">
                  {filteredUsers.map(user => (
                    <div key={user.id} className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4">
                      <div className="flex items-start gap-2 sm:gap-4">
                        <span className="text-2xl sm:text-3xl flex-shrink-0">{user.avatar}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center flex-wrap gap-1 sm:gap-2 mb-1">
                            <span className="font-semibold text-gray-900 text-sm sm:text-base truncate">{user.username}</span>
                            {user.isVerified && <span className="text-[#0F4C4C] flex-shrink-0">✓</span>}
                            {!user.isPublic && <span className="text-gray-400 flex-shrink-0">🔒</span>}
                          </div>
                          <p className="text-xs sm:text-sm text-gray-500 mb-2 line-clamp-2">{user.bio}</p>
                          <div className="flex flex-wrap items-center gap-x-2 sm:gap-x-4 gap-y-1 text-[10px] sm:text-xs text-gray-400">
                            <span>{formatNumber(user.followers)} followers</span>
                            <span>{formatNumber(user.predictions)} predictions</span>
                            <span className="text-[#0F4C4C] font-medium">{user.winRate}% win rate</span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleFollow(user.id)}
                          className={`px-2.5 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors flex-shrink-0 ${
                            user.isFollowing
                              ? 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                              : user.isPending
                              ? 'border border-amber-300 text-amber-700 bg-amber-50'
                              : 'bg-[#0F4C4C] text-white hover:bg-[#0a3a3a]'
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

            {/* Market Builder Tab */}
            {activeTab === 'market-builder' && (
              <div className="space-y-3 sm:space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h2 className="text-base sm:text-lg font-semibold text-gray-900">Market Builder</h2>
                    <p className="text-xs sm:text-sm text-gray-500">Suggest new markets for the community</p>
                  </div>
                  <button
                    onClick={() => setShowMarketBuilderModal(true)}
                    className="bg-[#0F4C4C] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#0a3a3a] transition-colors w-full sm:w-auto"
                  >
                    + Suggest Market
                  </button>
                </div>

                <div className="bg-[#C8E64C]/20 border border-[#C8E64C] rounded-xl p-3 sm:p-4">
                  <h3 className="font-medium text-[#0F4C4C] mb-2 text-sm sm:text-base">How Market Builder works</h3>
                  <ol className="text-xs sm:text-sm text-gray-700 space-y-1 list-decimal list-inside">
                    <li>Submit your market idea with clear resolution criteria</li>
                    <li>Community members upvote suggestions they want to see</li>
                    <li>Our team reviews popular suggestions</li>
                    <li>Approved markets go live on Foremark</li>
                  </ol>
                </div>

                <h3 className="font-medium text-gray-900 mt-4 sm:mt-6 text-sm sm:text-base">Popular Suggestions</h3>

                {mockMarketSuggestions.map(suggestion => (
                  <div key={suggestion.id} className="bg-white rounded-xl p-3 sm:p-4 border border-gray-100">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center flex-wrap gap-1 sm:gap-2 mb-2">
                          <span className={`text-[10px] sm:text-xs font-medium px-1.5 sm:px-2 py-0.5 rounded ${
                            suggestion.status === 'approved'
                              ? 'bg-green-100 text-green-700'
                              : suggestion.status === 'rejected'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {suggestion.status === 'approved' ? '✓ Approved' : suggestion.status === 'rejected' ? '✗ Rejected' : '⏳ Pending'}
                          </span>
                          <span className="text-[10px] sm:text-xs text-gray-500 capitalize">{suggestion.category}</span>
                        </div>
                        <h4 className="font-semibold text-gray-900 mb-1 text-sm sm:text-base line-clamp-2">{suggestion.title}</h4>
                        <p className="text-xs sm:text-sm text-gray-600 mb-2 line-clamp-2">{suggestion.description}</p>
                        <p className="text-[10px] sm:text-xs text-gray-500 line-clamp-1">
                          <strong>Resolution:</strong> {suggestion.resolutionSource}
                        </p>
                        <div className="flex items-center space-x-2 mt-2 sm:mt-3 text-[10px] sm:text-xs text-gray-500">
                          <span className="text-base sm:text-lg">{suggestion.author.avatar}</span>
                          <span>{suggestion.author.username}</span>
                        </div>
                      </div>
                      <button className="flex flex-col items-center p-1.5 sm:p-2 rounded-lg hover:bg-gray-50 transition-colors flex-shrink-0">
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                        <span className="text-xs sm:text-sm font-medium text-gray-900">{suggestion.upvotes}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Rewards Tab */}
            {activeTab === 'rewards' && (
              <div className="space-y-4 sm:space-y-6">
                {/* Overview */}
                <div className="bg-gradient-to-br from-[#0F4C4C] to-teal-700 rounded-xl sm:rounded-2xl p-4 sm:p-6 text-white">
                  <div className="flex items-start justify-between mb-3 sm:mb-4">
                    <div className="flex-1">
                      <h2 className="text-xl sm:text-2xl font-bold mb-1 sm:mb-2">Prediction Rewards</h2>
                      <p className="text-white/80 text-sm sm:text-base">Earn rewards when others copy your predictions</p>
                    </div>
                    <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0 ml-3">
                      <span className="text-2xl sm:text-3xl">💰</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 sm:gap-4">
                    <div className="bg-white/10 rounded-lg sm:rounded-xl p-2 sm:p-3 text-center">
                      <p className="text-lg sm:text-2xl font-bold">$0.10</p>
                      <p className="text-[10px] sm:text-xs text-white/70">per unique copy</p>
                    </div>
                    <div className="bg-white/10 rounded-lg sm:rounded-xl p-2 sm:p-3 text-center">
                      <p className="text-lg sm:text-2xl font-bold">$1,000</p>
                      <p className="text-[10px] sm:text-xs text-white/70">max per week</p>
                    </div>
                    <div className="bg-white/10 rounded-lg sm:rounded-xl p-2 sm:p-3 text-center">
                      <p className="text-lg sm:text-2xl font-bold">Weekly</p>
                      <p className="text-[10px] sm:text-xs text-white/70">payouts</p>
                    </div>
                  </div>
                </div>

                {/* Your Stats */}
                <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
                  <h3 className="font-semibold text-gray-900 mb-3 sm:mb-4 text-sm sm:text-base">Your Rewards This Week</h3>
                  <div className="grid grid-cols-2 gap-2 sm:gap-4">
                    <div className="bg-gray-50 rounded-lg p-2.5 sm:p-3 text-center">
                      <p className="text-xl sm:text-2xl font-bold text-[#0F4C4C]">127</p>
                      <p className="text-[10px] sm:text-xs text-gray-500">Unique Copies</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2.5 sm:p-3 text-center">
                      <p className="text-xl sm:text-2xl font-bold text-[#0F4C4C]">$12.70</p>
                      <p className="text-[10px] sm:text-xs text-gray-500">Earnings</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2.5 sm:p-3 text-center">
                      <p className="text-xl sm:text-2xl font-bold text-gray-900">34</p>
                      <p className="text-[10px] sm:text-xs text-gray-500">Eligible Predictions</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2.5 sm:p-3 text-center">
                      <p className="text-xl sm:text-2xl font-bold text-gray-900">5d 14h</p>
                      <p className="text-[10px] sm:text-xs text-gray-500">Until Payout</p>
                    </div>
                  </div>
                </div>

                {/* How It Works */}
                <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
                  <h3 className="font-semibold text-gray-900 mb-3 sm:mb-4 text-sm sm:text-base">How It Works</h3>
                  <div className="space-y-3 sm:space-y-4">
                    {[
                      { step: 1, title: 'Make Predictions', desc: 'Place predictions with a minimum stake of $1 on any market.' },
                      { step: 2, title: 'Get Copied', desc: 'When other users copy your prediction (min $1 stake), you earn rewards.' },
                      { step: 3, title: 'Earn $0.10 Per Copy', desc: 'Each unique user who copies earns you $0.10, regardless of outcome.' },
                      { step: 4, title: 'Get Paid Weekly', desc: 'Rewards are calculated and paid every Thursday for the prior week.' },
                    ].map(item => (
                      <div key={item.step} className="flex gap-3 sm:gap-4">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 bg-[#C8E64C] rounded-full flex items-center justify-center flex-shrink-0 text-[#0F4C4C] font-bold text-sm sm:text-base">{item.step}</div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 text-sm sm:text-base">{item.title}</p>
                          <p className="text-xs sm:text-sm text-gray-500">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* FAQs */}
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <button onClick={() => setShowRewardsFaq(!showRewardsFaq)} className="w-full flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">Frequently Asked Questions</h3>
                    <svg className={`w-5 h-5 text-gray-400 transition-transform ${showRewardsFaq ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {showRewardsFaq && (
                    <div className="mt-4 space-y-4 pt-4 border-t border-gray-100">
                      {[
                        { q: 'What is a unique copy?', a: 'We count the first copy from each unique user on your predictions. If someone copies the same prediction twice, it only counts as 1 unique copy.' },
                        { q: 'When will I get paid?', a: 'Payments are made by 12pm every Thursday for copies on predictions that settled during the prior Thursday 12am – Wednesday 11:59pm period.' },
                        { q: 'Do my predictions have to win?', a: 'No. You earn rewards based on the number of unique copies, regardless of whether your prediction wins or loses.' },
                        { q: 'Is there a maximum earning?', a: 'Yes. The maximum you can earn is $1,000 per week.' },
                      ].map((faq, i) => (
                        <div key={i}>
                          <p className="font-medium text-gray-900 mb-1">{faq.q}</p>
                          <p className="text-sm text-gray-500">{faq.a}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Bookmarks Tab */}
            {activeTab === 'bookmarks' && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900">Saved Posts</h2>
                {bookmarkedItems.length > 0 ? (
                  bookmarkedItems.map(item => renderFeedItem(item))
                ) : (
                  <div className="bg-white rounded-xl p-8 text-center">
                    <div className="text-4xl mb-3">🔖</div>
                    <p className="text-gray-600">No saved posts yet</p>
                    <p className="text-sm text-gray-500 mt-1">Bookmark posts to save them here</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Mobile Post Button */}
        <button
          onClick={() => setShowNewPostModal(true)}
          className="lg:hidden fixed bottom-6 right-6 w-14 h-14 bg-[#0F4C4C] text-white rounded-full shadow-lg flex items-center justify-center hover:bg-[#0a3a3a] transition-colors z-40"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>

        {/* New Post Modal */}
        {showNewPostModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Create Post</h3>
                <button onClick={() => setShowNewPostModal(false)} className="text-gray-500 hover:text-gray-700">✕</button>
              </div>
              <div className="p-4 space-y-4">
                <textarea
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  placeholder="Share your prediction or market idea..."
                  rows={4}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#0F4C4C] focus:border-transparent resize-none"
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                  <select
                    value={newPostCategory}
                    onChange={(e) => setNewPostCategory(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    {categories.filter(c => c.id !== 'all').map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.icon} {cat.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Link a Market (optional)</label>
                  <select
                    value={selectedMarket || ''}
                    onChange={(e) => setSelectedMarket(e.target.value || null)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="">No linked market</option>
                    {markets.slice(0, 20).map(market => (
                      <option key={market.id} value={market.id}>{market.title}</option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button onClick={() => setShowNewPostModal(false)} className="px-4 py-2 text-gray-600">Cancel</button>
                  <button
                    onClick={handleNewPost}
                    disabled={!newPostContent.trim()}
                    className={`px-6 py-2 rounded-lg font-medium ${newPostContent.trim() ? 'bg-[#0F4C4C] text-white hover:bg-[#0a3a3a]' : 'bg-gray-200 text-gray-500 cursor-not-allowed'}`}
                  >
                    Post
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Market Builder Modal */}
        {showMarketBuilderModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Suggest a Market</h3>
                <button onClick={() => setShowMarketBuilderModal(false)} className="text-gray-500 hover:text-gray-700">✕</button>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Market Title *</label>
                  <input
                    type="text"
                    value={newMarketTitle}
                    onChange={(e) => setNewMarketTitle(e.target.value)}
                    placeholder="e.g., Taylor Swift to tour Australia in 2025"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
                  <textarea
                    value={newMarketDescription}
                    onChange={(e) => setNewMarketDescription(e.target.value)}
                    placeholder="Describe when this market resolves Yes and when it resolves No..."
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                  <select
                    value={newMarketCategory}
                    onChange={(e) => setNewMarketCategory(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    {categories.filter(c => c.id !== 'all').map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.icon} {cat.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Resolution Source</label>
                  <input
                    type="text"
                    value={newMarketResolution}
                    onChange={(e) => setNewMarketResolution(e.target.value)}
                    placeholder="e.g., Official announcement from the artist"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button onClick={() => setShowMarketBuilderModal(false)} className="px-4 py-2 text-gray-600">Cancel</button>
                  <button
                    onClick={handleSubmitMarketSuggestion}
                    disabled={!newMarketTitle.trim() || !newMarketDescription.trim()}
                    className={`px-6 py-2 rounded-lg font-medium ${newMarketTitle.trim() && newMarketDescription.trim() ? 'bg-[#0F4C4C] text-white hover:bg-[#0a3a3a]' : 'bg-gray-200 text-gray-500 cursor-not-allowed'}`}
                  >
                    Submit
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Responsible Gambling Notice */}
        <div className="mt-8 p-4 bg-gray-100 rounded-xl text-center text-sm text-gray-600">
          <p className="mb-2">Think. Is this a prediction you understand?</p>
          <p>
            For free and confidential support call 1800 858 858 or visit{' '}
            <a href="https://www.gamblinghelponline.org.au" className="text-[#0F4C4C] underline">
              gamblinghelponline.org.au
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
