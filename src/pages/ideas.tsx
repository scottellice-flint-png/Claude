import { useState } from 'react';
import Link from 'next/link';
import { useStore } from '@/store';

interface Post {
  id: string;
  author: {
    id: string;
    username: string;
    avatar: string;
    isVerified: boolean;
  };
  content: string;
  image?: string;
  linkedMarket?: {
    id: string;
    title: string;
    yesPrice: number;
    category: string;
  };
  category: string;
  timestamp: Date;
  likes: number;
  comments: number;
  shares: number;
  isLiked: boolean;
  isBookmarked: boolean;
  replies?: Post[];
}

interface MarketSuggestion {
  id: string;
  title: string;
  description: string;
  category: string;
  resolutionSource: string;
  author: {
    username: string;
    avatar: string;
  };
  upvotes: number;
  status: 'pending' | 'approved' | 'rejected';
  timestamp: Date;
}

export default function IdeasPage() {
  const markets = useStore((state) => state.markets);
  const [activeTab, setActiveTab] = useState<'home' | 'replies' | 'bookmarks' | 'market-builder' | 'guidelines' | 'faqs'>('home');
  const [showNewPostModal, setShowNewPostModal] = useState(false);
  const [showMarketBuilderModal, setShowMarketBuilderModal] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostCategory, setNewPostCategory] = useState('general');
  const [selectedMarket, setSelectedMarket] = useState<string | null>(null);

  // Market Builder state
  const [newMarketTitle, setNewMarketTitle] = useState('');
  const [newMarketDescription, setNewMarketDescription] = useState('');
  const [newMarketCategory, setNewMarketCategory] = useState('politics');
  const [newMarketResolution, setNewMarketResolution] = useState('');

  const categories = [
    { id: 'all', label: 'All', icon: '🏠' },
    { id: 'politics', label: 'Politics', icon: '🏛️' },
    { id: 'economics', label: 'Economics', icon: '📊' },
    { id: 'culture', label: 'Culture', icon: '🎭' },
    { id: 'climate', label: 'Climate', icon: '🌦️' },
    { id: 'world', label: 'World', icon: '🌍' },
    { id: 'sport', label: 'Sport', icon: '🏆' },
    { id: 'general', label: 'General', icon: '💬' },
  ];

  // Mock posts data
  const [posts, setPosts] = useState<Post[]>([
    {
      id: '1',
      author: { id: '1', username: 'AussiePunter', avatar: '🦘', isVerified: true },
      content: "RBA is definitely cutting in February. Inflation numbers are trending down and unemployment is creeping up. The writing is on the wall. What's everyone's thoughts?",
      linkedMarket: {
        id: 'rba-feb',
        title: 'RBA to cut rates in February 2025',
        yesPrice: 67,
        category: 'economics',
      },
      category: 'economics',
      timestamp: new Date(Date.now() - 1000 * 60 * 30),
      likes: 24,
      comments: 8,
      shares: 3,
      isLiked: false,
      isBookmarked: false,
    },
    {
      id: '2',
      author: { id: '2', username: 'PollWatcher', avatar: '📊', isVerified: false },
      content: "Labor's numbers keep slipping in the polls. Anyone else think the coalition has a real shot at the next election? The housing crisis is killing them.",
      linkedMarket: {
        id: 'fed-election',
        title: 'Coalition to win 2025 Federal Election',
        yesPrice: 42,
        category: 'politics',
      },
      category: 'politics',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
      likes: 45,
      comments: 23,
      shares: 7,
      isLiked: true,
      isBookmarked: true,
    },
    {
      id: '3',
      author: { id: '3', username: 'WeatherWiz', avatar: '⛈️', isVerified: true },
      content: "BOM just updated their models - La Niña is looking increasingly likely for this summer. Prepare for a wet one, especially on the east coast!",
      category: 'climate',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5),
      likes: 18,
      comments: 5,
      shares: 2,
      isLiked: false,
      isBookmarked: false,
    },
    {
      id: '4',
      author: { id: '4', username: 'FilmBuff', avatar: '🎬', isVerified: false },
      content: "Calling it now - an Australian film takes home Best Picture at the Oscars this year. The international buzz around our productions has never been higher!",
      category: 'culture',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 8),
      likes: 12,
      comments: 15,
      shares: 1,
      isLiked: false,
      isBookmarked: false,
    },
    {
      id: '5',
      author: { id: '5', username: 'CricketFan', avatar: '🏏', isVerified: false },
      content: "Australia to whitewash England in the Ashes. Our bowling attack is just too strong. Thoughts?",
      image: '🏆',
      category: 'sport',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 12),
      likes: 89,
      comments: 42,
      shares: 15,
      isLiked: true,
      isBookmarked: false,
    },
    {
      id: '6',
      author: { id: '6', username: 'TechTrader', avatar: '💻', isVerified: true },
      content: "Hot take: AI will be the defining issue of the 2025 election. Neither major party has a coherent policy yet. Who moves first?",
      category: 'politics',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
      likes: 56,
      comments: 31,
      shares: 9,
      isLiked: false,
      isBookmarked: true,
    },
  ]);

  // Mock market suggestions
  const [marketSuggestions] = useState<MarketSuggestion[]>([
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
    {
      id: '3',
      title: 'Qantas CEO to resign before mid-2025',
      description: 'Resolves Yes if the current Qantas CEO steps down or is replaced before July 1, 2025',
      category: 'economics',
      resolutionSource: 'Official Qantas announcement',
      author: { username: 'AviationWatch', avatar: '✈️' },
      upvotes: 156,
      status: 'pending',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
    },
  ]);

  // Mock replies
  const [replies] = useState<Post[]>([
    {
      id: 'r1',
      author: { id: '7', username: 'EconExpert', avatar: '📈', isVerified: true },
      content: "@AussiePunter Agreed on the rate cut. The jobs data this week will be crucial though - if unemployment ticks up again, it's a done deal.",
      category: 'economics',
      timestamp: new Date(Date.now() - 1000 * 60 * 20),
      likes: 8,
      comments: 2,
      shares: 0,
      isLiked: false,
      isBookmarked: false,
    },
  ]);

  // Mock bookmarks
  const bookmarkedPosts = posts.filter(p => p.isBookmarked);

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 1000 / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    if (days === 1) return '1d';
    return `${days}d`;
  };

  const handleLike = (postId: string) => {
    setPosts(posts.map(p =>
      p.id === postId
        ? { ...p, isLiked: !p.isLiked, likes: p.isLiked ? p.likes - 1 : p.likes + 1 }
        : p
    ));
  };

  const handleBookmark = (postId: string) => {
    setPosts(posts.map(p =>
      p.id === postId
        ? { ...p, isBookmarked: !p.isBookmarked }
        : p
    ));
  };

  const handleNewPost = () => {
    if (newPostContent.trim()) {
      const linkedMarketData = selectedMarket
        ? markets.find(m => m.id === selectedMarket)
        : null;

      const newPost: Post = {
        id: Date.now().toString(),
        author: { id: 'me', username: 'You', avatar: '👤', isVerified: false },
        content: newPostContent,
        linkedMarket: linkedMarketData ? {
          id: linkedMarketData.id,
          title: linkedMarketData.title,
          yesPrice: linkedMarketData.yesPrice,
          category: linkedMarketData.category,
        } : undefined,
        category: newPostCategory,
        timestamp: new Date(),
        likes: 0,
        comments: 0,
        shares: 0,
        isLiked: false,
        isBookmarked: false,
      };

      setPosts([newPost, ...posts]);
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

  const filteredPosts = categoryFilter === 'all'
    ? posts
    : posts.filter(p => p.category === categoryFilter);

  const renderPost = (post: Post) => (
    <div key={post.id} className="bg-white rounded-xl p-4 border border-gray-100 hover:shadow-md transition-shadow">
      {/* Post Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          <span className="text-2xl">{post.author.avatar}</span>
          <div>
            <div className="flex items-center space-x-1">
              <Link href={`/profile/${post.author.username}`} className="font-semibold text-gray-900 hover:underline">
                {post.author.username}
              </Link>
              {post.author.isVerified && (
                <span className="text-[#0F4C4C]" title="Verified Predictor">✓</span>
              )}
            </div>
            <div className="flex items-center space-x-2 text-xs text-gray-500">
              <span>{formatTime(post.timestamp)}</span>
              <span>•</span>
              <span className="capitalize">{post.category}</span>
            </div>
          </div>
        </div>
        <button className="text-gray-400 hover:text-gray-600 p-1">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
          </svg>
        </button>
      </div>

      {/* Post Content */}
      <p className="text-gray-800 mb-3 whitespace-pre-wrap">{post.content}</p>

      {/* Linked Market Card */}
      {post.linkedMarket && (
        <Link
          href={`/market/${post.linkedMarket.id}`}
          className="block bg-gray-50 border border-gray-200 rounded-lg p-3 mb-3 hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs text-gray-500 uppercase mb-1">Linked Market</p>
              <p className="font-medium text-gray-900 text-sm">{post.linkedMarket.title}</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-[#0F4C4C]">{post.linkedMarket.yesPrice}%</p>
              <p className="text-xs text-gray-500">Yes</p>
            </div>
          </div>
        </Link>
      )}

      {/* Post Image (emoji placeholder) */}
      {post.image && (
        <div className="bg-gray-100 rounded-lg p-8 mb-3 flex items-center justify-center">
          <span className="text-6xl">{post.image}</span>
        </div>
      )}

      {/* Post Actions */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <button
          onClick={() => handleLike(post.id)}
          className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg transition-colors ${
            post.isLiked ? 'text-red-500 bg-red-50' : 'text-gray-500 hover:bg-gray-50'
          }`}
        >
          <svg className="w-5 h-5" fill={post.isLiked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          <span className="text-sm">{post.likes}</span>
        </button>

        <button className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-gray-500 hover:bg-gray-50 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span className="text-sm">{post.comments}</span>
        </button>

        <button className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-gray-500 hover:bg-gray-50 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          <span className="text-sm">{post.shares}</span>
        </button>

        <button
          onClick={() => handleBookmark(post.id)}
          className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg transition-colors ${
            post.isBookmarked ? 'text-[#0F4C4C] bg-[#C8E64C]/20' : 'text-gray-500 hover:bg-gray-50'
          }`}
        >
          <svg className="w-5 h-5" fill={post.isBookmarked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
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
              <h1 className="text-2xl font-bold text-[#0F4C4C] mb-1">Ideas</h1>
              <p className="text-sm text-gray-500 mb-6">Community predictions & discussion</p>

              <nav className="space-y-1">
                <button
                  onClick={() => setActiveTab('home')}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                    activeTab === 'home' ? 'bg-[#C8E64C]/20 text-[#0F4C4C]' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  <span>Home</span>
                </button>

                <button
                  onClick={() => setActiveTab('replies')}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                    activeTab === 'replies' ? 'bg-[#C8E64C]/20 text-[#0F4C4C]' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <span>Replies</span>
                </button>

                <button
                  onClick={() => setActiveTab('bookmarks')}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                    activeTab === 'bookmarks' ? 'bg-[#C8E64C]/20 text-[#0F4C4C]' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                  <span>Bookmarks</span>
                </button>

                <button
                  onClick={() => setActiveTab('market-builder')}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                    activeTab === 'market-builder' ? 'bg-[#C8E64C]/20 text-[#0F4C4C]' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
                  <span>Market Builder</span>
                </button>

                <Link
                  href="/profile"
                  className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span>Profile</span>
                </Link>

                <button
                  onClick={() => setActiveTab('guidelines')}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                    activeTab === 'guidelines' ? 'bg-[#C8E64C]/20 text-[#0F4C4C]' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Community Guidelines</span>
                </button>

                <button
                  onClick={() => setActiveTab('faqs')}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                    activeTab === 'faqs' ? 'bg-[#C8E64C]/20 text-[#0F4C4C]' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>FAQs</span>
                </button>
              </nav>

              {/* Related Features */}
              <div className="mt-6 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-500 uppercase font-medium mb-2">Related</p>
                <Link
                  href="/chats"
                  className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <span>Group Chats</span>
                </Link>
                <Link
                  href="/social"
                  className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span>Social & Following</span>
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
              <h1 className="text-2xl font-bold text-[#0F4C4C]">Ideas</h1>
              <p className="text-sm text-gray-500">Community predictions & discussion</p>
            </div>

            {/* Mobile Tabs */}
            <div className="lg:hidden flex space-x-1 mb-4 bg-gray-100 rounded-lg p-1 overflow-x-auto">
              {[
                { id: 'home', label: 'Home' },
                { id: 'replies', label: 'Replies' },
                { id: 'bookmarks', label: 'Saved' },
                { id: 'market-builder', label: 'Builder' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
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

            {/* Home Feed */}
            {activeTab === 'home' && (
              <>
                {/* Create Post (Desktop) */}
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

                {/* Posts Feed */}
                <div className="space-y-4">
                  {filteredPosts.map(post => renderPost(post))}
                </div>

                {filteredPosts.length === 0 && (
                  <div className="bg-white rounded-xl p-8 text-center">
                    <div className="text-4xl mb-3">💭</div>
                    <p className="text-gray-600">No posts in this category yet</p>
                    <button
                      onClick={() => setShowNewPostModal(true)}
                      className="mt-4 text-[#0F4C4C] font-medium hover:underline"
                    >
                      Be the first to post
                    </button>
                  </div>
                )}
              </>
            )}

            {/* Replies Tab */}
            {activeTab === 'replies' && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900">Replies to your posts</h2>
                {replies.length > 0 ? (
                  replies.map(reply => renderPost(reply))
                ) : (
                  <div className="bg-white rounded-xl p-8 text-center">
                    <div className="text-4xl mb-3">💬</div>
                    <p className="text-gray-600">No replies yet</p>
                    <p className="text-sm text-gray-500 mt-1">When someone replies to your posts, they&apos;ll appear here</p>
                  </div>
                )}
              </div>
            )}

            {/* Bookmarks Tab */}
            {activeTab === 'bookmarks' && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900">Saved posts</h2>
                {bookmarkedPosts.length > 0 ? (
                  bookmarkedPosts.map(post => renderPost(post))
                ) : (
                  <div className="bg-white rounded-xl p-8 text-center">
                    <div className="text-4xl mb-3">🔖</div>
                    <p className="text-gray-600">No saved posts</p>
                    <p className="text-sm text-gray-500 mt-1">Bookmark posts to save them here</p>
                  </div>
                )}
              </div>
            )}

            {/* Market Builder Tab */}
            {activeTab === 'market-builder' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Market Builder</h2>
                    <p className="text-sm text-gray-500">Suggest new markets for the community</p>
                  </div>
                  <button
                    onClick={() => setShowMarketBuilderModal(true)}
                    className="bg-[#0F4C4C] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#0a3a3a] transition-colors"
                  >
                    + Suggest Market
                  </button>
                </div>

                <div className="bg-[#C8E64C]/20 border border-[#C8E64C] rounded-xl p-4">
                  <h3 className="font-medium text-[#0F4C4C] mb-2">How Market Builder works</h3>
                  <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
                    <li>Submit your market idea with a clear resolution criteria</li>
                    <li>Community members upvote suggestions they want to see</li>
                    <li>Our team reviews popular suggestions</li>
                    <li>Approved markets go live on Foremark</li>
                  </ol>
                </div>

                <h3 className="font-medium text-gray-900 mt-6">Popular Suggestions</h3>

                {marketSuggestions.map(suggestion => (
                  <div key={suggestion.id} className="bg-white rounded-xl p-4 border border-gray-100">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                            suggestion.status === 'approved'
                              ? 'bg-green-100 text-green-700'
                              : suggestion.status === 'rejected'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {suggestion.status === 'approved' ? '✓ Approved' : suggestion.status === 'rejected' ? '✗ Rejected' : '⏳ Pending'}
                          </span>
                          <span className="text-xs text-gray-500 capitalize">{suggestion.category}</span>
                        </div>
                        <h4 className="font-semibold text-gray-900 mb-1">{suggestion.title}</h4>
                        <p className="text-sm text-gray-600 mb-2">{suggestion.description}</p>
                        <p className="text-xs text-gray-500">
                          <strong>Resolution:</strong> {suggestion.resolutionSource}
                        </p>
                        <div className="flex items-center space-x-2 mt-3 text-xs text-gray-500">
                          <span className="text-lg">{suggestion.author.avatar}</span>
                          <span>{suggestion.author.username}</span>
                          <span>•</span>
                          <span>{formatTime(suggestion.timestamp)}</span>
                        </div>
                      </div>
                      <button className="flex flex-col items-center p-2 rounded-lg hover:bg-gray-50 transition-colors">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                        <span className="text-sm font-medium text-gray-900">{suggestion.upvotes}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Community Guidelines Tab */}
            {activeTab === 'guidelines' && (
              <div className="bg-white rounded-xl p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Community Guidelines</h2>

                <div className="space-y-6 text-gray-700">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">1. Be Respectful</h3>
                    <p>Treat other members with respect. Personal attacks, harassment, and discrimination are not tolerated.</p>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">2. Share Accurate Information</h3>
                    <p>When sharing predictions or analysis, be honest about your reasoning. Don&apos;t spread misinformation or make claims you can&apos;t support.</p>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">3. No Market Manipulation</h3>
                    <p>Coordinated attempts to manipulate market prices or spread false information to influence markets is prohibited.</p>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">4. Keep It Legal</h3>
                    <p>Don&apos;t share insider information or encourage illegal activity. All content must comply with Australian law.</p>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">5. No Spam</h3>
                    <p>Don&apos;t post repetitive content, excessive self-promotion, or irrelevant material.</p>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">6. Report Violations</h3>
                    <p>If you see content that violates these guidelines, please report it using the menu on each post.</p>
                  </div>

                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-700 text-sm">
                      <strong>Violations may result in:</strong> Warning, temporary suspension, or permanent ban from the Ideas community and Foremark platform.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* FAQs Tab */}
            {activeTab === 'faqs' && (
              <div className="bg-white rounded-xl p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Frequently Asked Questions</h2>

                <div className="space-y-4">
                  {[
                    {
                      q: 'What is Ideas?',
                      a: 'Ideas is Foremark\'s community forum where you can discuss markets, share predictions, and connect with other predictors. It\'s a place to share your analysis and learn from others.',
                    },
                    {
                      q: 'How do I link a market to my post?',
                      a: 'When creating a post, you can search for and select an existing market to link to your post. This helps others understand the context of your prediction.',
                    },
                    {
                      q: 'What is Market Builder?',
                      a: 'Market Builder lets you suggest new markets for Foremark. Popular suggestions are reviewed by our team and may be added to the platform.',
                    },
                    {
                      q: 'How do I become a Verified Predictor?',
                      a: 'Verified Predictors are identified by a checkmark next to their name. To qualify, you need a consistent track record of accurate predictions and positive community engagement.',
                    },
                    {
                      q: 'Can I share my posts to Chats?',
                      a: 'Yes! You can share any post to your group chats. Look for the share button on each post to share it with your prediction groups.',
                    },
                    {
                      q: 'How do I report inappropriate content?',
                      a: 'Click the three dots menu on any post and select "Report". Our moderation team will review reported content within 24 hours.',
                    },
                  ].map((faq, i) => (
                    <div key={i} className="border-b border-gray-100 pb-4">
                      <h3 className="font-semibold text-gray-900 mb-2">{faq.q}</h3>
                      <p className="text-gray-600">{faq.a}</p>
                    </div>
                  ))}
                </div>
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
                <button
                  onClick={() => setShowNewPostModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              <div className="p-4 space-y-4">
                <div className="flex items-start space-x-3">
                  <span className="text-2xl">👤</span>
                  <textarea
                    value={newPostContent}
                    onChange={(e) => setNewPostContent(e.target.value)}
                    placeholder="Share your prediction or market idea..."
                    rows={4}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#0F4C4C] focus:border-transparent resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                  <select
                    value={newPostCategory}
                    onChange={(e) => setNewPostCategory(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#0F4C4C] focus:border-transparent"
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
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#0F4C4C] focus:border-transparent"
                  >
                    <option value="">No linked market</option>
                    {markets.slice(0, 20).map(market => (
                      <option key={market.id} value={market.id}>{market.title}</option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    onClick={() => setShowNewPostModal(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleNewPost}
                    disabled={!newPostContent.trim()}
                    className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                      newPostContent.trim()
                        ? 'bg-[#0F4C4C] text-white hover:bg-[#0a3a3a]'
                        : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    }`}
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
                <button
                  onClick={() => setShowMarketBuilderModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Market Title *</label>
                  <input
                    type="text"
                    value={newMarketTitle}
                    onChange={(e) => setNewMarketTitle(e.target.value)}
                    placeholder="e.g., Taylor Swift to tour Australia in 2025"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#0F4C4C] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
                  <textarea
                    value={newMarketDescription}
                    onChange={(e) => setNewMarketDescription(e.target.value)}
                    placeholder="Describe when this market resolves Yes and when it resolves No..."
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#0F4C4C] focus:border-transparent resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                  <select
                    value={newMarketCategory}
                    onChange={(e) => setNewMarketCategory(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#0F4C4C] focus:border-transparent"
                  >
                    {categories.filter(c => c.id !== 'all').map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.icon} {cat.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Resolution Source *</label>
                  <input
                    type="text"
                    value={newMarketResolution}
                    onChange={(e) => setNewMarketResolution(e.target.value)}
                    placeholder="e.g., Official announcement from the artist or promoter"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#0F4C4C] focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">How will we determine the outcome?</p>
                </div>

                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-600">
                    <strong>Note:</strong> Market suggestions are reviewed by our team. Popular suggestions with clear resolution criteria are more likely to be approved.
                  </p>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    onClick={() => setShowMarketBuilderModal(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmitMarketSuggestion}
                    disabled={!newMarketTitle.trim() || !newMarketDescription.trim()}
                    className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                      newMarketTitle.trim() && newMarketDescription.trim()
                        ? 'bg-[#0F4C4C] text-white hover:bg-[#0a3a3a]'
                        : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    Submit Suggestion
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
