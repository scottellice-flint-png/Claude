import { ReactNode, useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useStore } from '@/store';
import { useSession, signOut } from 'next-auth/react';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const storeUser = useStore((state) => state.user);
  const markets = useStore((state) => state.markets);

  // Use session user if authenticated, otherwise fall back to store user
  const user = session?.user ? {
    id: session.user.id,
    username: session.user.username || 'User',
    balance: session.user.balance || 0,
  } : storeUser;
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Mock profiles for search
  const profiles = [
    { id: '1', username: 'MelbournePunter', avatar: '🦘', winRate: 68, followers: 1240 },
    { id: '2', username: 'SydneyPredictor', avatar: '🌉', winRate: 72, followers: 890 },
    { id: '3', username: 'BrisbaneBets', avatar: '☀️', winRate: 65, followers: 567 },
    { id: '4', username: 'PerthPunter', avatar: '🌅', winRate: 71, followers: 432 },
    { id: '5', username: 'AdelaidePro', avatar: '🍷', winRate: 69, followers: 321 },
    { id: '6', username: 'HobartHero', avatar: '🏔️', winRate: 64, followers: 234 },
    { id: '7', username: 'DarwinDave', avatar: '🐊', winRate: 67, followers: 189 },
    { id: '8', username: 'CanberraCapper', avatar: '🏛️', winRate: 73, followers: 456 },
  ];

  const formatBalance = (cents: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
    }).format(cents / 100);
  };

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when expanded on mobile
  useEffect(() => {
    if (isSearchExpanded && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchExpanded]);

  // Handle search submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/?search=${encodeURIComponent(searchQuery.trim())}`);
      setIsSearchExpanded(false);
    }
  };

  // Filter markets for search suggestions
  const marketResults = searchQuery.length >= 2
    ? markets.filter(m =>
        m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.description.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 4)
    : [];

  // Filter profiles for search suggestions
  const profileResults = searchQuery.length >= 2
    ? profiles.filter(p =>
        p.username.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 3)
    : [];

  const hasSearchResults = marketResults.length > 0 || profileResults.length > 0;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-foremark-green sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            {/* Logo - Hidden when search is expanded on mobile */}
            <Link
              href="/"
              className={`flex items-center gap-2.5 flex-shrink-0 ${isSearchExpanded ? 'hidden sm:flex' : 'flex'}`}
            >
              {/* Logo Icon - Checkmark in rounded square */}
              <div className="w-7 h-7 bg-foremark-lime rounded-lg flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-4 h-4 text-foremark-green"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div className="flex flex-col">
                <span className="text-2xl text-white foremark-logo">FOREMARK</span>
                <span className="text-[10px] text-white/60 tracking-wider uppercase -mt-1 hidden sm:block">Australia&apos;s prediction market</span>
              </div>
            </Link>

            {/* Search Bar - Desktop */}
            <div className="hidden md:flex flex-1 max-w-md mx-4">
              <form onSubmit={handleSearch} className="relative w-full">
                <input
                  type="text"
                  placeholder="Search markets or profiles"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/10 border border-white/20 rounded-full px-4 py-2 pl-10 text-white placeholder-white/60 focus:outline-none focus:bg-white/20 focus:border-white/40 text-sm"
                />
                <svg
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/60"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>

                {/* Search Results Dropdown */}
                {hasSearchResults && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50">
                    {/* Markets Section */}
                    {marketResults.length > 0 && (
                      <>
                        <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Markets</p>
                        </div>
                        {marketResults.map((market) => (
                          <Link
                            key={market.id}
                            href={`/market/${market.id}`}
                            onClick={() => setSearchQuery('')}
                            className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                          >
                            <span className="text-xl">{market.icon || '📊'}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{market.title}</p>
                              <p className="text-xs text-gray-500 capitalize">{market.category}</p>
                            </div>
                            <span className="text-sm font-semibold text-foremark-green">{market.yesPrice}%</span>
                          </Link>
                        ))}
                      </>
                    )}

                    {/* Profiles Section */}
                    {profileResults.length > 0 && (
                      <>
                        <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Profiles</p>
                        </div>
                        {profileResults.map((profile) => (
                          <Link
                            key={profile.id}
                            href={`/profile/${profile.username}`}
                            onClick={() => setSearchQuery('')}
                            className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                          >
                            <span className="text-xl">{profile.avatar}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900">{profile.username}</p>
                              <p className="text-xs text-gray-500">{profile.followers.toLocaleString()} followers</p>
                            </div>
                            <span className="text-sm font-semibold text-foremark-green">{profile.winRate}% win</span>
                          </Link>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </form>
            </div>

            {/* Mobile Search - Expanded */}
            {isSearchExpanded && (
              <form onSubmit={handleSearch} className="flex-1 md:hidden">
                <div className="relative">
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search markets or profiles"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onBlur={() => {
                      if (!searchQuery) {
                        setTimeout(() => setIsSearchExpanded(false), 200);
                      }
                    }}
                    className="w-full bg-white/10 border border-white/20 rounded-full px-4 py-2 pl-10 text-white placeholder-white/60 focus:outline-none focus:bg-white/20 focus:border-white/40 text-sm"
                  />
                  <svg
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/60"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setIsSearchExpanded(false);
                    }}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-white"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>

                  {/* Mobile Search Results Dropdown */}
                  {hasSearchResults && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50 max-h-80 overflow-y-auto">
                      {/* Markets Section */}
                      {marketResults.length > 0 && (
                        <>
                          <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Markets</p>
                          </div>
                          {marketResults.map((market) => (
                            <Link
                              key={market.id}
                              href={`/market/${market.id}`}
                              onClick={() => {
                                setSearchQuery('');
                                setIsSearchExpanded(false);
                              }}
                              className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                            >
                              <span className="text-xl">{market.icon || '📊'}</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">{market.title}</p>
                                <p className="text-xs text-gray-500 capitalize">{market.category}</p>
                              </div>
                              <span className="text-sm font-semibold text-foremark-green">{market.yesPrice}%</span>
                            </Link>
                          ))}
                        </>
                      )}

                      {/* Profiles Section */}
                      {profileResults.length > 0 && (
                        <>
                          <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Profiles</p>
                          </div>
                          {profileResults.map((profile) => (
                            <Link
                              key={profile.id}
                              href={`/profile/${profile.username}`}
                              onClick={() => {
                                setSearchQuery('');
                                setIsSearchExpanded(false);
                              }}
                              className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                            >
                              <span className="text-xl">{profile.avatar}</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900">{profile.username}</p>
                                <p className="text-xs text-gray-500">{profile.followers.toLocaleString()} followers</p>
                              </div>
                              <span className="text-sm font-semibold text-foremark-green">{profile.winRate}% win</span>
                            </Link>
                          ))}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </form>
            )}

            {/* Right Side Actions */}
            <div className={`flex items-center gap-1 sm:gap-2 flex-shrink-0 ${isSearchExpanded ? 'hidden sm:flex' : 'flex'}`}>
              {/* Mobile Search Icon */}
              <button
                onClick={() => setIsSearchExpanded(true)}
                className="md:hidden p-2 text-white/80 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>

              {/* Show Login/Signup buttons when not authenticated */}
              {!session?.user ? (
                <>
                  <Link
                    href="/login"
                    className="hidden sm:flex items-center px-4 py-2 text-white font-medium text-sm border border-white/40 rounded-full hover:bg-white/10 transition-colors"
                  >
                    Log in
                  </Link>
                  <Link
                    href="/login?mode=signup"
                    className="flex items-center px-3 sm:px-4 py-1.5 sm:py-2 bg-foremark-lime text-gray-900 font-semibold text-sm rounded-full hover:bg-foremark-lime-dark transition-colors"
                  >
                    Sign up
                  </Link>
                </>
              ) : (
                <>
                  {/* Deposit Button - only for logged in users */}
                  <Link href="/deposits" className="hidden sm:flex items-center gap-2 bg-foremark-lime text-gray-900 font-semibold px-4 py-2 rounded-full text-sm hover:bg-foremark-lime-dark transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Deposit
                  </Link>

                  {/* Notification Bell - only for logged in users */}
                  <button className="relative p-2 text-white/80 hover:text-white transition-colors">
                    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    <span className="absolute top-1 right-1 w-2 h-2 bg-foremark-lime rounded-full"></span>
                  </button>
                </>
              )}

              {/* User Menu */}
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="flex items-center gap-2 p-2 text-white/80 hover:text-white transition-colors"
                >
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>

                {/* Dropdown Menu */}
                {isMenuOpen && (
                  <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50">
                    {/* Quick Actions */}
                    <div className="p-4 border-b border-gray-100">
                      <div className="flex justify-around">
                        <Link
                          href="/rankings"
                          onClick={() => setIsMenuOpen(false)}
                          className="flex flex-col items-center gap-1 p-2 hover:bg-gray-50 rounded-lg transition-colors"
                        >
                          <div className="w-10 h-10 bg-foremark-green rounded-full flex items-center justify-center">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                          </div>
                          <span className="text-xs text-gray-600">Rankings</span>
                        </Link>
                        <Link
                          href="/deposits"
                          onClick={() => setIsMenuOpen(false)}
                          className="flex flex-col items-center gap-1 p-2 hover:bg-gray-50 rounded-lg transition-colors"
                        >
                          <div className="w-10 h-10 bg-foremark-lime rounded-full flex items-center justify-center">
                            <svg className="w-5 h-5 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                          </div>
                          <span className="text-xs text-gray-600">Add funds</span>
                        </Link>
                        <Link
                          href="/chats"
                          onClick={() => setIsMenuOpen(false)}
                          className="flex flex-col items-center gap-1 p-2 hover:bg-gray-50 rounded-lg transition-colors"
                        >
                          <div className="w-10 h-10 bg-foremark-green rounded-full flex items-center justify-center">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                          </div>
                          <span className="text-xs text-gray-600">Chats</span>
                        </Link>
                      </div>
                    </div>

                    {/* Balance Display */}
                    {user && (
                      <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-500">Balance</span>
                          <span className="text-lg font-bold text-gray-900">{formatBalance(user.balance)}</span>
                        </div>
                      </div>
                    )}

                    {/* Menu Items */}
                    <div className="py-2">
                      <Link
                        href="/profile"
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        Account & security
                      </Link>
                      <Link
                        href="/portfolio"
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Your activity
                      </Link>
                      <Link
                        href="/community"
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        Community
                      </Link>
                      <Link
                        href="/deposits"
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Deposits
                      </Link>
                      <Link
                        href="/withdrawals"
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                        </svg>
                        Withdrawals
                      </Link>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-gray-100"></div>

                    {/* Secondary Items */}
                    <div className="py-2">
                      <button className="w-full flex items-center justify-between px-4 py-2.5 text-gray-700 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Help & support
                        </div>
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-gray-100"></div>

                    {/* Login/Log Out */}
                    <div className="py-2">
                      {session?.user ? (
                        <button
                          onClick={() => {
                            setIsMenuOpen(false);
                            signOut({ callbackUrl: '/' });
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                          Log out
                        </button>
                      ) : (
                        <Link
                          href="/login"
                          onClick={() => setIsMenuOpen(false)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-foremark-green font-medium hover:bg-gray-50 transition-colors sm:hidden"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                          Log in
                        </Link>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full">
        {children}
      </main>

      {/* Desktop Footer */}
      <footer className="hidden md:block border-t border-gray-200 bg-white mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="flex items-center gap-2">
              {/* Footer Logo Icon */}
              <div className="w-5 h-5 bg-foremark-lime rounded flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-3 h-3 text-foremark-green"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <span className="text-lg font-bold text-foremark-green foremark-logo">FOREMARK</span>
              <span className="text-gray-400 text-sm">| Prediction Markets</span>
            </div>
            <div className="flex space-x-6">
              <a href="#" className="text-gray-500 hover:text-foremark-green text-sm">
                Terms
              </a>
              <a href="#" className="text-gray-500 hover:text-foremark-green text-sm">
                Privacy
              </a>
              <a href="#" className="text-gray-500 hover:text-foremark-green text-sm">
                About
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
