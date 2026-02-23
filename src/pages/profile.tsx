import { useState } from 'react';
import Link from 'next/link';
import { useStore } from '@/store';
import { useSession } from 'next-auth/react';

// Sidebar navigation items
const NAV_ITEMS = [
  { id: 'account', label: 'Account & security', icon: 'shield', href: '/profile' },
  { id: 'activity', label: 'Your activity', icon: 'activity', href: '/portfolio' },
  { id: 'community', label: 'Community', icon: 'community', href: '/community' },
  { id: 'chats', label: 'Chats', icon: 'chats', href: '/chats' },
  { id: 'deposits', label: 'Deposits', icon: 'deposit', href: '/deposits' },
  { id: 'withdrawals', label: 'Withdrawals', icon: 'withdrawal', href: '/withdrawals' },
];

type TwoFactorMethod = 'sms-email' | 'sms-only' | 'email-only' | 'authenticator';

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const storeUser = useStore((state) => state.user);

  // Use session user if authenticated, otherwise fall back to store user
  const user = session?.user ? {
    id: session.user.id,
    username: session.user.username || 'User',
    email: session.user.email || '',
    balance: session.user.balance || 0,
  } : storeUser;
  const [twoFactorMethod, setTwoFactorMethod] = useState<TwoFactorMethod>('sms-email');
  const [isVerified] = useState(true);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [showBreakModal, setShowBreakModal] = useState(false);
  const [showLimitsModal, setShowLimitsModal] = useState(false);
  const [showPasswordVisible, setShowPasswordVisible] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [marketingPrefs, setMarketingPrefs] = useState({
    promotions: true,
    updates: true,
    research: false,
  });
  const [breakDuration, setBreakDuration] = useState('');
  const [depositLimit, setDepositLimit] = useState({
    daily: '',
    weekly: '',
    monthly: '',
  });
  // Profile & Privacy settings
  const [profileUsername, setProfileUsername] = useState(user?.username || '');
  const [profileBio, setProfileBio] = useState('Prediction market enthusiast from Sydney');
  const [isPublicProfile, setIsPublicProfile] = useState(true);
  const [defaultBetVisibility, setDefaultBetVisibility] = useState<'visible' | 'hidden'>('visible');
  const [followRequests] = useState([
    { id: '1', username: 'MarketMaster', avatar: 'bg-blue-400' },
    { id: '2', username: 'AussiePunter', avatar: 'bg-green-400' },
  ]);

  // Show loading state while session is being fetched
  if (status === 'loading') {
    return (
      <div className="text-center py-16">
        <div className="animate-spin w-8 h-8 border-4 border-foremark-green border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-16">
        <div className="text-6xl mb-4">🔒</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Please log in</h2>
        <p className="text-gray-500 mb-6">You need to be logged in to view your account settings.</p>
        <Link
          href="/login"
          className="inline-flex items-center px-6 py-3 bg-foremark-green text-white font-semibold rounded-lg hover:bg-foremark-green-light transition-colors"
        >
          Log in
        </Link>
      </div>
    );
  }

  const NavIcon = ({ type }: { type: string }) => {
    switch (type) {
      case 'shield':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        );
      case 'activity':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        );
      case 'deposit':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        );
      case 'withdrawal':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        );
      case 'community':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        );
      case 'chats':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex gap-8">
      {/* Sidebar Navigation - Desktop */}
      <aside className="hidden lg:block w-56 flex-shrink-0">
        <div className="sticky top-20">
          <nav className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {NAV_ITEMS.map((item) => {
              const isActive = item.id === 'account';
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3.5 text-sm font-medium transition-colors border-b border-gray-100 last:border-b-0 ${
                    isActive
                      ? 'bg-foremark-lime text-gray-900'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <NavIcon type={item.icon} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 space-y-8">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Account & security</h1>
        </div>

        {/* Account Details Section */}
        <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-5 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Account Details</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Status */}
              <div>
                <label className="block text-sm text-gray-500 mb-1">Status</label>
                <p className="text-foremark-green font-medium">Verified</p>
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm text-gray-500 mb-1">Name</label>
                <p className="text-gray-900">{user.username}</p>
              </div>

              {/* Account Number */}
              <div>
                <label className="block text-sm text-gray-500 mb-1">Account Number</label>
                <p className="text-gray-900">FM-{user.id.slice(0, 6).toUpperCase()}</p>
              </div>

              {/* Date of Birth */}
              <div>
                <label className="block text-sm text-gray-500 mb-1">Date of Birth</label>
                <p className="text-gray-900">••/••/1990</p>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm text-gray-500 mb-1">Email</label>
                <p className="text-gray-900">{user.email}</p>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm text-gray-500 mb-1">Phone</label>
                <p className="text-gray-900">+61 4•• ••• •89</p>
              </div>

              {/* Address */}
              <div className="md:col-span-2">
                <label className="block text-sm text-gray-500 mb-1">Address</label>
                <p className="text-gray-900">••• ••••••• Street, Sydney NSW 2000</p>
              </div>
            </div>

            <button className="text-sm font-medium text-foremark-green hover:text-foremark-green-light">
              View Details
            </button>
          </div>
        </section>

        {/* Profile & Privacy Section */}
        <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Profile & Privacy</h2>

            {/* Profile Info */}
            <div className="space-y-4 pb-5 border-b border-gray-100">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                <input
                  type="text"
                  value={profileUsername}
                  onChange={(e) => setProfileUsername(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-foremark-green/20 focus:border-foremark-green"
                  placeholder="Enter your username"
                />
                <p className="text-xs text-gray-500 mt-1">Your username will be visible to all other users.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                <textarea
                  value={profileBio}
                  onChange={(e) => setProfileBio(e.target.value)}
                  rows={3}
                  maxLength={160}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-foremark-green/20 focus:border-foremark-green resize-none"
                  placeholder="Tell others about yourself..."
                />
                <p className="text-xs text-gray-500 mt-1">{profileBio.length}/160 characters</p>
              </div>

              <button className="text-sm font-medium text-foremark-green hover:text-foremark-green-light">
                Update Profile
              </button>
            </div>

            {/* Public vs Private Profile */}
            <div className="py-5 border-b border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-medium text-gray-900">Profile Visibility</h3>
                  <p className="text-sm text-gray-500">Control who can see your activity</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm ${!isPublicProfile ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>Private</span>
                  <button
                    onClick={() => setIsPublicProfile(!isPublicProfile)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      isPublicProfile ? 'bg-foremark-green' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        isPublicProfile ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                  <span className={`text-sm ${isPublicProfile ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>Public</span>
                </div>
              </div>

              <div className={`p-4 rounded-lg ${isPublicProfile ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'}`}>
                {isPublicProfile ? (
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="font-medium text-green-800">Public Profile</p>
                      <ul className="text-sm text-green-700 mt-1 space-y-1">
                        <li>• Any user can follow your account</li>
                        <li>• Follow requests are automatically accepted</li>
                        <li>• Your visible predictions can be seen by followers</li>
                        <li>• Eligible for Verified Predictor status</li>
                      </ul>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <div>
                      <p className="font-medium text-gray-800">Private Profile</p>
                      <ul className="text-sm text-gray-600 mt-1 space-y-1">
                        <li>• Users must request to follow you</li>
                        <li>• You can accept or decline follow requests</li>
                        <li>• Only approved followers see your predictions</li>
                        <li>• Not eligible for Verified Predictor status</li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>

              {/* Pending Follow Requests (only show for private profiles) */}
              {!isPublicProfile && followRequests.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Pending Follow Requests ({followRequests.length})</h4>
                  <div className="space-y-2">
                    {followRequests.map((request) => (
                      <div key={request.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 ${request.avatar} rounded-full flex items-center justify-center text-white text-sm font-bold`}>
                            {request.username.charAt(0)}
                          </div>
                          <span className="font-medium text-gray-900">{request.username}</span>
                        </div>
                        <div className="flex gap-2">
                          <button className="px-3 py-1.5 bg-foremark-green text-white text-xs font-medium rounded-lg hover:bg-foremark-green-light transition-colors">
                            Accept
                          </button>
                          <button className="px-3 py-1.5 border border-gray-300 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-100 transition-colors">
                            Decline
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Default Bet Visibility */}
            <div className="py-5 border-b border-gray-100">
              <h3 className="font-medium text-gray-900 mb-2">Default Prediction Visibility</h3>
              <p className="text-sm text-gray-500 mb-3">
                Choose whether your predictions are visible or hidden by default. You can always change visibility for individual predictions.
              </p>

              <div className="space-y-2">
                <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer border border-gray-200">
                  <input
                    type="radio"
                    name="betVisibility"
                    checked={defaultBetVisibility === 'visible'}
                    onChange={() => setDefaultBetVisibility('visible')}
                    className="w-4 h-4 text-foremark-green focus:ring-foremark-green"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">Visible</p>
                    <p className="text-sm text-gray-500">Predictions appear on your profile and in followers&apos; feeds</p>
                  </div>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer border border-gray-200">
                  <input
                    type="radio"
                    name="betVisibility"
                    checked={defaultBetVisibility === 'hidden'}
                    onChange={() => setDefaultBetVisibility('hidden')}
                    className="w-4 h-4 text-foremark-green focus:ring-foremark-green"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">Hidden</p>
                    <p className="text-sm text-gray-500">Predictions are private and will not appear anywhere on the app</p>
                  </div>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                </label>
              </div>
            </div>

            {/* Verified Predictor Info */}
            <div className="pt-5">
              <div className="flex items-start gap-3 p-4 bg-foremark-lime/20 rounded-lg border border-foremark-lime">
                <div className="w-8 h-8 bg-foremark-green rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-foremark-green">Verified Predictor Program</p>
                  <p className="text-sm text-gray-600 mt-1">
                    Top predictors with public profiles can earn Verified Predictor status. Verified predictors get a badge, increased visibility on the leaderboard, and access to exclusive features.
                  </p>
                  <button className="mt-2 text-sm font-medium text-foremark-green hover:text-foremark-green-light">
                    Learn more about verification →
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Identity Verification Section */}
        <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Identity Verification</h2>

            {isVerified ? (
              <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-green-800">Identity verified</p>
                  <p className="text-sm text-green-700 mt-1">
                    Your identity has been verified. You have full access to all Foremark features.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-gray-600 text-sm">
                  To comply with Australian financial regulations, we need to verify your identity before you can bet.
                </p>
                <button className="px-5 py-2.5 bg-foremark-green text-white font-semibold rounded-lg hover:bg-foremark-green-light transition-colors">
                  Verify identity
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Change Password Section */}
        <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Change Password</h2>

            <div className="space-y-4 max-w-md">
              {/* Current Password */}
              <div>
                <label className="block text-sm text-gray-500 mb-1">Current Password</label>
                <div className="relative">
                  <input
                    type={showPasswordVisible.current ? 'text' : 'password'}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-foremark-green/20 focus:border-foremark-green"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordVisible(prev => ({ ...prev, current: !prev.current }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {showPasswordVisible.current ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      )}
                    </svg>
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-sm text-gray-500 mb-1">New Password</label>
                <div className="relative">
                  <input
                    type={showPasswordVisible.new ? 'text' : 'password'}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-foremark-green/20 focus:border-foremark-green"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordVisible(prev => ({ ...prev, new: !prev.new }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {showPasswordVisible.new ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      )}
                    </svg>
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm text-gray-500 mb-1">Confirm Password</label>
                <div className="relative">
                  <input
                    type={showPasswordVisible.confirm ? 'text' : 'password'}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-foremark-green/20 focus:border-foremark-green"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordVisible(prev => ({ ...prev, confirm: !prev.confirm }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {showPasswordVisible.confirm ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      )}
                    </svg>
                  </button>
                </div>
              </div>

              <button className="text-sm font-medium text-foremark-green hover:text-foremark-green-light">
                Update Details
              </button>
            </div>
          </div>
        </section>

        {/* Two-Factor Authentication Section */}
        <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Two-factor Authentication</h2>
            <p className="text-gray-600 text-sm mb-4">
              Help keep your Foremark account safe. This helps prevent anyone from accessing your account, even if they know your password.
            </p>

            <div className="border-t border-gray-100 pt-4">
              <p className="text-sm font-medium text-gray-700 mb-3">How would you like to receive this code?</p>

              <div className="space-y-1">
                <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer border-b border-gray-100">
                  <input
                    type="radio"
                    name="2fa"
                    checked={twoFactorMethod === 'sms-email'}
                    onChange={() => setTwoFactorMethod('sms-email')}
                    className="w-4 h-4 text-foremark-green focus:ring-foremark-green"
                  />
                  <span className="text-gray-900">
                    Text message (<span className="text-foremark-green">SMS</span>) and email
                  </span>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer border-b border-gray-100">
                  <input
                    type="radio"
                    name="2fa"
                    checked={twoFactorMethod === 'sms-only'}
                    onChange={() => setTwoFactorMethod('sms-only')}
                    className="w-4 h-4 text-foremark-green focus:ring-foremark-green"
                  />
                  <span className="text-gray-900">
                    Text message (<span className="text-foremark-green">SMS</span>) only
                  </span>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer border-b border-gray-100">
                  <input
                    type="radio"
                    name="2fa"
                    checked={twoFactorMethod === 'email-only'}
                    onChange={() => setTwoFactorMethod('email-only')}
                    className="w-4 h-4 text-foremark-green focus:ring-foremark-green"
                  />
                  <span className="text-gray-900">Email only</span>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="radio"
                    name="2fa"
                    checked={twoFactorMethod === 'authenticator'}
                    onChange={() => setTwoFactorMethod('authenticator')}
                    className="w-4 h-4 text-foremark-green focus:ring-foremark-green"
                  />
                  <span className="text-gray-900">
                    Authenticator app <span className="text-gray-500 text-sm">(recommended)</span>
                  </span>
                </label>
              </div>
            </div>
          </div>
        </section>

        {/* Marketing Preferences Section */}
        <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Marketing Preferences</h2>
            <p className="text-gray-600 text-sm mb-4">
              Choose what communications you would like to receive from Foremark.
            </p>

            <div className="space-y-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={marketingPrefs.promotions}
                  onChange={(e) => setMarketingPrefs(prev => ({ ...prev, promotions: e.target.checked }))}
                  className="mt-0.5 w-4 h-4 text-foremark-green rounded focus:ring-foremark-green"
                />
                <div>
                  <p className="text-gray-900 font-medium">Promotions & Bonus offers</p>
                  <p className="text-sm text-gray-500">Receive notifications about special promotions and bonus offers.</p>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={marketingPrefs.updates}
                  onChange={(e) => setMarketingPrefs(prev => ({ ...prev, updates: e.target.checked }))}
                  className="mt-0.5 w-4 h-4 text-foremark-green rounded focus:ring-foremark-green"
                />
                <div>
                  <p className="text-gray-900 font-medium">Product updates</p>
                  <p className="text-sm text-gray-500">Stay informed about new features and market additions.</p>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={marketingPrefs.research}
                  onChange={(e) => setMarketingPrefs(prev => ({ ...prev, research: e.target.checked }))}
                  className="mt-0.5 w-4 h-4 text-foremark-green rounded focus:ring-foremark-green"
                />
                <div>
                  <p className="text-gray-900 font-medium">Research & Insights</p>
                  <p className="text-sm text-gray-500">Receive market analysis and betting insights from our research team.</p>
                </div>
              </label>
            </div>

            <button className="mt-4 text-sm font-medium text-foremark-green hover:text-foremark-green-light">
              Set Preferences
            </button>
          </div>
        </section>

        {/* Linked Accounts Section */}
        <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Linked Accounts</h2>
            <p className="text-gray-600 text-sm mb-4">
              Connect external accounts for faster sign-in and enhanced security.
            </p>

            <div className="space-y-3">
              {/* Google */}
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white border border-gray-200 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Google</p>
                    <p className="text-sm text-gray-500">Not connected</p>
                  </div>
                </div>
                <button className="px-4 py-2 text-sm font-medium text-foremark-green border border-foremark-green rounded-lg hover:bg-foremark-green hover:text-white transition-colors">
                  Connect
                </button>
              </div>

              {/* Apple */}
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Apple</p>
                    <p className="text-sm text-gray-500">Not connected</p>
                  </div>
                </div>
                <button className="px-4 py-2 text-sm font-medium text-foremark-green border border-foremark-green rounded-lg hover:bg-foremark-green hover:text-white transition-colors">
                  Connect
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Active Sessions Section */}
        <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Active Sessions</h2>
            <p className="text-gray-600 text-sm mb-4">
              Manage devices where you are currently logged in.
            </p>

            <div className="space-y-3">
              {/* Current Session */}
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-foremark-lime/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-foremark-green/10 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-foremark-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Chrome on macOS</p>
                    <p className="text-sm text-gray-500">Sydney, Australia · Current session</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 text-xs font-medium text-foremark-green bg-foremark-lime rounded-full">
                  Active
                </span>
              </div>

              {/* Other Session */}
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Foremark App on iPhone</p>
                    <p className="text-sm text-gray-500">Melbourne, Australia · 2 days ago</p>
                  </div>
                </div>
                <button className="text-sm font-medium text-red-600 hover:text-red-700">
                  Revoke
                </button>
              </div>
            </div>

            <button className="mt-4 text-sm font-medium text-red-600 hover:text-red-700">
              Sign out of all other sessions
            </button>
          </div>
        </section>

        {/* Responsible Gambling Section */}
        <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Responsible Gambling</h2>

            {/* Set Limits */}
            <div className="pb-4 border-b border-gray-100">
              <h3 className="font-medium text-gray-900 mb-2">Set Limits</h3>
              <p className="text-sm text-gray-600 mb-3">
                You can control the amount you deposit by setting deposit limits. Limits will take effect immediately and can be reduced any time.
              </p>
              <button
                onClick={() => setShowLimitsModal(true)}
                className="px-4 py-2 bg-foremark-green text-white text-sm font-semibold rounded-lg hover:bg-foremark-green-light transition-colors"
              >
                Set Limit
              </button>
            </div>

            {/* Take a Break */}
            <div className="py-4 border-b border-gray-100">
              <h3 className="font-medium text-gray-900 mb-2">Take a Break</h3>
              <p className="text-sm text-gray-600 mb-2">
                If you feel you need to take a break from betting online, take a break.
              </p>
              <p className="text-sm text-gray-500 mb-3">
                <strong>Please Note:</strong> If you choose to take a break from your account, you will not be able to log into or affect any changes to your account until your break period has ended.
              </p>
              <button
                onClick={() => setShowBreakModal(true)}
                className="text-sm font-medium text-foremark-green hover:text-foremark-green-light"
              >
                Take a break
              </button>
            </div>

            {/* Close Account */}
            <div className="py-4 border-b border-gray-100">
              <h3 className="font-medium text-gray-900 mb-2">Close Account</h3>
              <p className="text-sm text-gray-600 mb-2">
                Want to close your Foremark account?
              </p>
              <p className="text-sm text-gray-500 mb-3">
                <strong>Please Note:</strong> When you close your account, you may re-open it at any time by contacting the Foremark Customer Service Team.
              </p>
              <button
                onClick={() => setShowDeactivateModal(true)}
                className="text-sm font-medium text-red-600 hover:text-red-700"
              >
                Close Account
              </button>
            </div>

            {/* National Self Exclusion Register */}
            <div className="py-4 border-b border-gray-100">
              <h3 className="font-medium text-gray-900 mb-2">National Self Exclusion Register</h3>
              <p className="text-sm text-gray-600 mb-3">
                The National Self-Exclusion Register (BetStop) is a free service provided by the Australian Government that allows people to self-exclude from all licensed Australian online and phone wagering providers in a single process. Registering is quick and easy.
              </p>
              <a
                href="https://www.betstop.gov.au"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-foremark-green hover:text-foremark-green-light"
              >
                Learn More
              </a>
            </div>

            {/* Responsible Gambling Policy */}
            <div className="pt-4">
              <h3 className="font-medium text-gray-900 mb-2">Responsible Gambling Policy</h3>
              <p className="text-sm text-gray-600 mb-3">
                Please see our Responsible Gambling Policy for more information, including self-exclusion options.
              </p>
              <a
                href="#"
                className="text-sm font-medium text-foremark-green hover:text-foremark-green-light"
              >
                Responsible Gambling Policy
              </a>
            </div>
          </div>
        </section>

        {/* Mobile Navigation */}
        <nav className="lg:hidden bg-white rounded-xl border border-gray-200 overflow-hidden">
          {NAV_ITEMS.filter(item => item.id !== 'account').map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className="flex items-center justify-between px-4 py-4 text-gray-600 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
            >
              <span className="flex items-center gap-3 font-medium">
                <NavIcon type={item.icon} />
                {item.label}
              </span>
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))}
        </nav>

        {/* Sign Out Button */}
        <button className="w-full py-4 rounded-xl border-2 border-gray-300 text-gray-600 font-semibold hover:bg-gray-50 transition-colors">
          Sign out
        </button>
      </main>

      {/* Deactivate/Close Account Modal */}
      {showDeactivateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowDeactivateModal(false)} />
          <div className="relative bg-white rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Close account?</h3>
            <p className="text-gray-600 mb-6">
              This will close your Foremark account. You can re-open it at any time by contacting our Customer Service Team. Any open positions will need to be closed first.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeactivateModal(false)}
                className="flex-1 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button className="flex-1 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors">
                Close Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Take a Break Modal */}
      {showBreakModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowBreakModal(false)} />
          <div className="relative bg-white rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Take a Break</h3>
            <p className="text-gray-600 mb-4">
              Choose how long you would like to take a break from Foremark. During this time, you will not be able to access your account.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Duration</label>
              <select
                value={breakDuration}
                onChange={(e) => setBreakDuration(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-foremark-green/20 focus:border-foremark-green"
              >
                <option value="">Select duration</option>
                <option value="24h">24 hours</option>
                <option value="48h">48 hours</option>
                <option value="7d">7 days</option>
                <option value="30d">30 days</option>
                <option value="90d">90 days</option>
                <option value="6m">6 months</option>
                <option value="1y">1 year</option>
              </select>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowBreakModal(false)}
                className="flex-1 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={!breakDuration}
                className="flex-1 py-3 bg-foremark-green text-white rounded-lg font-semibold hover:bg-foremark-green-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirm Break
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Set Limits Modal */}
      {showLimitsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowLimitsModal(false)} />
          <div className="relative bg-white rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Set Deposit Limits</h3>
            <p className="text-gray-600 mb-4">
              Set limits on how much you can deposit. Decreases take effect immediately; increases require a 7-day cooling-off period.
            </p>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Daily Limit</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    value={depositLimit.daily}
                    onChange={(e) => setDepositLimit(prev => ({ ...prev, daily: e.target.value }))}
                    placeholder="No limit set"
                    className="w-full pl-8 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-foremark-green/20 focus:border-foremark-green"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Weekly Limit</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    value={depositLimit.weekly}
                    onChange={(e) => setDepositLimit(prev => ({ ...prev, weekly: e.target.value }))}
                    placeholder="No limit set"
                    className="w-full pl-8 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-foremark-green/20 focus:border-foremark-green"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Limit</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    value={depositLimit.monthly}
                    onChange={(e) => setDepositLimit(prev => ({ ...prev, monthly: e.target.value }))}
                    placeholder="No limit set"
                    className="w-full pl-8 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-foremark-green/20 focus:border-foremark-green"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLimitsModal(false)}
                className="flex-1 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button className="flex-1 py-3 bg-foremark-green text-white rounded-lg font-semibold hover:bg-foremark-green-light transition-colors">
                Save Limits
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
