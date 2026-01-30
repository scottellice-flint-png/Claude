import { useState } from 'react';
import { useStore } from '@/store';

export default function ProfilePage() {
  const user = useStore((state) => state.user);
  const positions = useStore((state) => state.getUserPositions());
  const [referralCode] = useState('FOREMARK-JD-2024');

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0,
    }).format(cents / 100);
  };

  const totalPayouts = positions.reduce((sum, p) => sum + Math.max(0, p.profit), 0);
  const winRate = positions.length > 0
    ? Math.round((positions.filter(p => p.profit > 0).length / positions.length) * 100)
    : 0;

  const badges = [
    { icon: '🔥', label: '10 Streak', earned: true },
    { icon: '🐋', label: 'Whale', earned: true },
    { icon: '🔮', label: 'Oracle', earned: false },
    { icon: '⚡', label: 'Early Bird', earned: true },
  ];

  if (!user) {
    return (
      <div className="text-center py-16">
        <div className="text-6xl mb-4">🔒</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Please log in</h2>
        <p className="text-gray-500">You need to be logged in to view your profile.</p>
      </div>
    );
  }

  const initials = user.username.substring(0, 2).toUpperCase();

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="bg-foremark-green rounded-2xl p-6 text-white text-center -mx-4 sm:mx-0">
        {/* Avatar */}
        <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-foremark-lime flex items-center justify-center border-4 border-foremark-green-light">
          <span className="text-3xl font-black text-foremark-green">{initials}</span>
        </div>

        {/* Name and Username */}
        <h1 className="text-2xl font-black uppercase">{user.username}</h1>
        <p className="text-white/70 text-sm">@{user.username.toLowerCase()}_foremark</p>
        <p className="text-white/50 text-xs mt-1">
          Joined {new Date(user.createdAt).toLocaleDateString('en-AU', { month: 'short', year: 'numeric' })}
        </p>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mt-6">
          <div className="bg-white/10 rounded-xl p-4">
            <p className="text-xs text-white/70 uppercase mb-1">Total Payouts</p>
            <p className="text-2xl font-bold">{formatCurrency(totalPayouts)}</p>
          </div>
          <div className="bg-white/10 rounded-xl p-4">
            <p className="text-xs text-white/70 uppercase mb-1">Win Rate</p>
            <p className="text-2xl font-bold">{winRate}%</p>
          </div>
        </div>
      </div>

      {/* Badges Section */}
      <div>
        <h2 className="text-2xl font-black text-gray-900 uppercase mb-4">Badges</h2>
        <div className="grid grid-cols-4 gap-4">
          {badges.map((badge, i) => (
            <div
              key={i}
              className={`text-center ${badge.earned ? '' : 'opacity-40'}`}
            >
              <div className={`w-14 h-14 mx-auto rounded-full flex items-center justify-center mb-2 ${
                badge.earned ? 'bg-foremark-lime' : 'bg-gray-200'
              }`}>
                <span className="text-2xl">{badge.icon}</span>
              </div>
              <p className="text-xs font-semibold text-gray-600 uppercase">{badge.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Invite Friends */}
      <div className="bg-foremark-lime rounded-2xl p-5">
        <h3 className="font-black text-gray-900 uppercase mb-2">Invite Friends</h3>
        <p className="text-sm text-gray-700 mb-4">
          Get $25 for every friend who joins and places their first trade.
        </p>
        <div className="bg-white rounded-xl p-3 border-2 border-dashed border-gray-300">
          <p className="font-mono font-bold text-gray-900 text-center">{referralCode}</p>
        </div>
        <button className="w-full mt-3 py-3 bg-gray-900 text-white rounded-full font-bold hover:bg-gray-800 transition-colors">
          COPY REFERRAL CODE
        </button>
      </div>

      {/* Account Settings */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h2 className="font-black text-gray-900 uppercase">Account</h2>
        </div>
        <div className="divide-y divide-gray-100">
          <button className="w-full px-4 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
            <span className="font-semibold text-gray-900">Edit Profile</span>
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <button className="w-full px-4 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
            <span className="font-semibold text-gray-900">Notifications</span>
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <button className="w-full px-4 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
            <span className="font-semibold text-gray-900">Payment Methods</span>
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <button className="w-full px-4 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
            <span className="font-semibold text-gray-900">Security</span>
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <h2 className="text-2xl font-black text-gray-900 uppercase mb-4">Recent Activity</h2>
        <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center">
          <p className="text-gray-500">No recent activity to show</p>
        </div>
      </div>

      {/* Sign Out Button */}
      <button className="w-full py-4 rounded-full border-2 border-gray-300 text-gray-600 font-bold hover:bg-gray-50 transition-colors">
        SIGN OUT
      </button>
    </div>
  );
}
