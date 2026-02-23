import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';

type TimeFilter = 'weekly' | 'monthly' | 'all-time';
type CategoryFilter = 'all' | 'politics' | 'sports' | 'economics' | 'climate' | 'culture' | 'world';
type TabType = 'leaderboard' | 'activity';

interface LeaderboardEntry {
  rank: number;
  id?: string;
  username: string;
  avatar: string;
  avatarUrl?: string;
  value: number;
  badge?: 'gold' | 'silver' | 'bronze' | 'verified';
}

const avatarColors = ['bg-red-400', 'bg-blue-400', 'bg-green-400', 'bg-yellow-400', 'bg-purple-400', 'bg-pink-400', 'bg-indigo-400', 'bg-teal-400'];

// Mock leaderboard data (fallback when no users in DB)
const generateMockData = (count: number, type: 'profit' | 'volume' | 'predictions'): LeaderboardEntry[] => {
  const usernames = [
    'AussiePunter', 'MarketMaster', 'PredictorPro', 'BettingKangaroo', 'SydneyPunter',
    'MelbourneMarkets', 'BrisbanePredictor', 'PerthPundit', 'AdelaideAnalyst', 'HobartHunch',
    'DarwinDealer', 'CanberraCall', 'GoldCoastGuru', 'SunshineState', 'VicVenture',
    'NSWNumbers', 'QLDQuant', 'WAPredictions', 'SASpeculator', 'TasPunter',
    'OutbackOracle', 'CoralCoaster', 'ReefReader', 'DesertDuke', 'BushBanker'
  ];

  const baseValues: Record<string, number[]> = {
    profit: [145707, 126686, 95611, 87863, 71609, 46245, 26202, 25845, 25731, 24707, 18020, 14934, 12500, 11200, 9800],
    volume: [2850000, 2145000, 1680000, 1250000, 985000, 745000, 625000, 520000, 485000, 365000, 285000, 225000, 185000, 145000, 95000],
    predictions: [1702, 1504, 1240, 923, 674, 436, 291, 276, 269, 214, 209, 206, 185, 162, 145],
  };

  return Array.from({ length: Math.min(count, usernames.length) }, (_, i) => ({
    rank: i + 1,
    username: usernames[i],
    avatar: avatarColors[i % avatarColors.length],
    value: baseValues[type][i] || Math.floor(baseValues[type][baseValues[type].length - 1] * (0.9 - i * 0.05)),
    badge: i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : i < 10 ? 'verified' : undefined,
  }));
};

const formatCurrency = (cents: number) => {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
};

const formatNumber = (num: number) => {
  return new Intl.NumberFormat('en-AU').format(num);
};

export default function RankingsPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<TabType>('leaderboard');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('weekly');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [timeLeft, setTimeLeft] = useState({ days: 6, hours: 22, minutes: 2, seconds: 21 });
  const [profitLeaders, setProfitLeaders] = useState<LeaderboardEntry[]>(generateMockData(15, 'profit'));
  const [volumeLeaders, setVolumeLeaders] = useState<LeaderboardEntry[]>(generateMockData(15, 'volume'));
  const [predictionLeaders, setPredictionLeaders] = useState<LeaderboardEntry[]>(generateMockData(15, 'predictions'));
  const [isLoading, setIsLoading] = useState(true);

  // Fetch leaderboard data from API
  const fetchLeaderboard = useCallback(async (type: 'profit' | 'volume' | 'predictions') => {
    try {
      const response = await fetch(`/api/leaderboard?type=${type}&time=${timeFilter}&limit=15`);
      if (response.ok) {
        const data = await response.json();
        if (data.leaders && data.leaders.length > 0) {
          const formattedLeaders: LeaderboardEntry[] = data.leaders.map((leader: { rank: number; id: string; username: string; avatarUrl?: string; value: number; badge?: string }, index: number) => ({
            rank: leader.rank,
            id: leader.id,
            username: leader.username,
            avatar: avatarColors[index % avatarColors.length],
            avatarUrl: leader.avatarUrl,
            value: leader.value,
            badge: leader.badge,
          }));
          return formattedLeaders;
        }
      }
      return null;
    } catch (error) {
      console.error(`Error fetching ${type} leaderboard:`, error);
      return null;
    }
  }, [timeFilter]);

  // Fetch all leaderboards
  useEffect(() => {
    const loadLeaderboards = async () => {
      setIsLoading(true);
      const [profit, volume, predictions] = await Promise.all([
        fetchLeaderboard('profit'),
        fetchLeaderboard('volume'),
        fetchLeaderboard('predictions'),
      ]);

      if (profit) setProfitLeaders(profit);
      if (volume) setVolumeLeaders(volume);
      if (predictions) setPredictionLeaders(predictions);

      setIsLoading(false);
    };

    loadLeaderboards();
  }, [fetchLeaderboard]);

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        let { days, hours, minutes, seconds } = prev;
        seconds--;
        if (seconds < 0) { seconds = 59; minutes--; }
        if (minutes < 0) { minutes = 59; hours--; }
        if (hours < 0) { hours = 23; days--; }
        if (days < 0) { days = 6; hours = 23; minutes = 59; seconds = 59; }
        return { days, hours, minutes, seconds };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const getBadgeIcon = (badge?: string) => {
    switch (badge) {
      case 'gold':
        return <span className="text-yellow-500">🥇</span>;
      case 'silver':
        return <span className="text-gray-400">🥈</span>;
      case 'bronze':
        return <span className="text-amber-600">🥉</span>;
      case 'verified':
        return (
          <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      default:
        return null;
    }
  };

  const LeaderboardColumn = ({
    title,
    icon,
    entries,
    formatValue,
    color
  }: {
    title: string;
    icon: React.ReactNode;
    entries: LeaderboardEntry[];
    formatValue: (val: number) => string;
    color: string;
  }) => (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="font-semibold text-gray-900 text-sm md:text-base">{title}</h3>
        </div>
        <button className={`px-3 py-1.5 ${color} text-white text-xs font-medium rounded-full hover:opacity-90 transition-opacity`}>
          Join
        </button>
      </div>
      <div className="divide-y divide-gray-50">
        {entries.slice(0, 10).map((entry) => (
          <div key={entry.rank} className="flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2.5 hover:bg-gray-50 transition-colors active:bg-gray-100">
            <span className={`w-5 md:w-6 text-xs md:text-sm font-medium text-center ${entry.rank <= 3 ? 'text-foremark-green' : 'text-gray-400'}`}>
              {entry.rank}
            </span>
            <div className={`w-7 h-7 md:w-8 md:h-8 ${entry.avatar} rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
              {entry.username.charAt(0)}
            </div>
            <div className="flex items-center gap-1 flex-1 min-w-0">
              <span className="text-xs md:text-sm font-medium text-gray-900 truncate">{entry.username}</span>
              {getBadgeIcon(entry.badge)}
            </div>
            <span className="text-xs md:text-sm font-semibold text-gray-900 whitespace-nowrap">{formatValue(entry.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6 md:py-8">
        {/* Header - Mobile Optimized */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">Leaderboard</h1>

            {/* Countdown Timer */}
            <div className="flex items-center gap-2 text-sm bg-foremark-green/10 px-3 py-2 rounded-lg">
              <svg className="w-4 h-4 text-foremark-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-foremark-green font-medium">
                {timeLeft.days}d {timeLeft.hours}h {timeLeft.minutes}m left
              </span>
            </div>
          </div>

          {/* Tabs - Mobile Friendly */}
          <div className="flex gap-1 mt-4 bg-gray-100 p-1 rounded-lg w-full sm:w-auto sm:inline-flex">
            <button
              onClick={() => setActiveTab('leaderboard')}
              className={`flex-1 sm:flex-none px-4 py-2.5 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'leaderboard'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Leaderboard
            </button>
            <button
              onClick={() => setActiveTab('activity')}
              className={`flex-1 sm:flex-none px-4 py-2.5 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'activity'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Activity
            </button>
          </div>
        </div>

        {/* Filters - Mobile */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
          <select
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value as TimeFilter)}
            className="text-sm text-gray-700 bg-white border border-gray-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-foremark-green focus:border-transparent min-w-[100px]"
          >
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="all-time">All time</option>
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as CategoryFilter)}
            className="text-sm text-gray-700 bg-white border border-gray-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-foremark-green focus:border-transparent min-w-[140px]"
          >
            <option value="all">All categories</option>
            <option value="politics">Politics</option>
            <option value="sports">Sports</option>
            <option value="economics">Economics</option>
            <option value="climate">Climate</option>
            <option value="culture">Culture</option>
            <option value="world">World</option>
          </select>
        </div>

        {activeTab === 'leaderboard' && (
          <>
            {/* Leaderboard Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              <LeaderboardColumn
                title="Profit"
                icon={
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
                entries={profitLeaders}
                formatValue={formatCurrency}
                color="bg-green-600"
              />
              <LeaderboardColumn
                title="Volume"
                icon={
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                }
                entries={volumeLeaders}
                formatValue={formatNumber}
                color="bg-blue-600"
              />
              <LeaderboardColumn
                title="Predictions"
                icon={
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                }
                entries={predictionLeaders}
                formatValue={formatNumber}
                color="bg-purple-600"
              />
            </div>

            {/* Extended Lists */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {/* Profit Extended */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h3 className="font-semibold text-gray-900">Profit</h3>
                  </div>
                  <button className="px-3 py-1 bg-green-600 text-white text-xs font-medium rounded-full hover:bg-green-700 transition-colors">
                    Join
                  </button>
                </div>
                <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
                  {profitLeaders.slice(0, 5).map((entry) => (
                    <div key={entry.rank} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors">
                      <span className={`w-6 text-sm font-medium ${entry.rank <= 3 ? 'text-foremark-green' : 'text-gray-400'}`}>
                        {entry.rank}
                      </span>
                      <div className={`w-8 h-8 ${entry.avatar} rounded-full flex items-center justify-center text-white text-xs font-bold`}>
                        {entry.username.charAt(0)}
                      </div>
                      <div className="flex items-center gap-1 flex-1 min-w-0">
                        <span className="text-sm font-medium text-gray-900 truncate">{entry.username}</span>
                        {getBadgeIcon(entry.badge)}
                      </div>
                      <span className="text-sm font-semibold text-gray-900">{formatCurrency(entry.value)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Volume Extended */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <h3 className="font-semibold text-gray-900">Volume</h3>
                  </div>
                  <button className="px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded-full hover:bg-blue-700 transition-colors">
                    Join
                  </button>
                </div>
                <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
                  {volumeLeaders.slice(0, 5).map((entry) => (
                    <div key={entry.rank} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors">
                      <span className={`w-6 text-sm font-medium ${entry.rank <= 3 ? 'text-foremark-green' : 'text-gray-400'}`}>
                        {entry.rank}
                      </span>
                      <div className={`w-8 h-8 ${entry.avatar} rounded-full flex items-center justify-center text-white text-xs font-bold`}>
                        {entry.username.charAt(0)}
                      </div>
                      <div className="flex items-center gap-1 flex-1 min-w-0">
                        <span className="text-sm font-medium text-gray-900 truncate">{entry.username}</span>
                        {getBadgeIcon(entry.badge)}
                      </div>
                      <span className="text-sm font-semibold text-gray-900">{formatNumber(entry.value)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Predictions Extended */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    <h3 className="font-semibold text-gray-900">Predictions</h3>
                  </div>
                  <button className="px-3 py-1 bg-purple-600 text-white text-xs font-medium rounded-full hover:bg-purple-700 transition-colors">
                    Join
                  </button>
                </div>
                <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
                  {predictionLeaders.slice(0, 5).map((entry) => (
                    <div key={entry.rank} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors">
                      <span className={`w-6 text-sm font-medium ${entry.rank <= 3 ? 'text-foremark-green' : 'text-gray-400'}`}>
                        {entry.rank}
                      </span>
                      <div className={`w-8 h-8 ${entry.avatar} rounded-full flex items-center justify-center text-white text-xs font-bold`}>
                        {entry.username.charAt(0)}
                      </div>
                      <div className="flex items-center gap-1 flex-1 min-w-0">
                        <span className="text-sm font-medium text-gray-900 truncate">{entry.username}</span>
                        {getBadgeIcon(entry.badge)}
                      </div>
                      <span className="text-sm font-semibold text-gray-900">{formatNumber(entry.value)}</span>
                    </div>
                  ))}
                </div>
                <div className="px-4 py-2 border-t border-gray-100 text-right">
                  <span className="text-xs text-foremark-green font-medium flex items-center justify-end gap-1">
                    {timeLeft.days}d {timeLeft.hours}h {timeLeft.minutes}m {timeLeft.seconds}s left
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </span>
                </div>
              </div>
            </div>

            {/* Footer Note */}
            <p className="text-xs text-gray-400 text-center mb-6">
              The data is updated approximately every 5 minutes.
            </p>

            {/* How It Works */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
              <h3 className="font-semibold text-gray-900 mb-4">How the Leaderboard Works</h3>
              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h4 className="font-medium text-gray-900">Profit</h4>
                  </div>
                  <p className="text-sm text-gray-500">
                    Ranked by net profit from resolved predictions. Shows betting skill and market insight.
                  </p>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <h4 className="font-medium text-gray-900">Volume</h4>
                  </div>
                  <p className="text-sm text-gray-500">
                    Total value of all predictions placed. Indicates market participation and engagement.
                  </p>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    </div>
                    <h4 className="font-medium text-gray-900">Predictions</h4>
                  </div>
                  <p className="text-sm text-gray-500">
                    Number of predictions made. Shows active participation across different markets.
                  </p>
                </div>
              </div>
            </div>

            {/* Responsible Gambling Notice */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <h4 className="font-medium text-amber-800 mb-1">Bet Responsibly</h4>
                  <p className="text-sm text-amber-700">
                    Past performance is not indicative of future results. Only bet with funds you can afford to lose.
                    If you need support, contact Gambling Help on <strong>1800 858 858</strong>.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'activity' && (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Activity Feed Coming Soon</h3>
            <p className="text-gray-500 mb-4">See recent bets and predictions from top players.</p>
            <Link href="/" className="text-foremark-green hover:text-teal-800 font-medium">
              Browse Markets →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
