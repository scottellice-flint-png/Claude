import { useState } from 'react';
import Link from 'next/link';
import { useStore } from '@/store';

// Sidebar navigation items
const NAV_ITEMS = [
  { id: 'account', label: 'Account & security', icon: 'shield', href: '/profile' },
  { id: 'activity', label: 'Your activity', icon: 'activity', href: '/portfolio' },
  { id: 'transfers', label: 'Transfers', icon: 'transfer', href: '#' },
  { id: 'documents', label: 'Documents', icon: 'document', href: '#' },
  { id: 'settings', label: 'Settings', icon: 'settings', href: '#' },
];

type TwoFactorMethod = 'sms-email' | 'sms-only' | 'email-only' | 'authenticator';

export default function ProfilePage() {
  const user = useStore((state) => state.user);
  const [twoFactorMethod, setTwoFactorMethod] = useState<TwoFactorMethod>('sms-email');
  const [isVerified, setIsVerified] = useState(true);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);

  if (!user) {
    return (
      <div className="text-center py-16">
        <div className="text-6xl mb-4">🔒</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Please log in</h2>
        <p className="text-gray-500">You need to be logged in to view your account settings.</p>
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
      case 'transfer':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        );
      case 'document':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case 'settings':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
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

        {/* Account Information Section */}
        <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-5 space-y-5">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-foremark-green mb-1">Email</label>
              <p className="text-gray-900">{user.email}</p>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-foremark-green mb-1">Phone</label>
              <p className="text-gray-900">+61 4•• ••• •89</p>
            </div>

            {/* Deactivate Account */}
            <button
              onClick={() => setShowDeactivateModal(true)}
              className="flex items-center gap-2 text-red-600 hover:text-red-700 font-medium text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
              Deactivate your account
            </button>
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
                  To comply with Australian financial regulations, we need to verify your identity before you can trade.
                </p>
                <button className="px-5 py-2.5 bg-foremark-green text-white font-semibold rounded-lg hover:bg-foremark-green-light transition-colors">
                  Verify identity
                </button>
              </div>
            )}
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
              Manage devices where you're currently logged in.
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

      {/* Deactivate Modal */}
      {showDeactivateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowDeactivateModal(false)} />
          <div className="relative bg-white rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Deactivate account?</h3>
            <p className="text-gray-600 mb-6">
              This will permanently close your account and you'll lose access to your trading history and any open positions. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeactivateModal(false)}
                className="flex-1 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button className="flex-1 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors">
                Deactivate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
