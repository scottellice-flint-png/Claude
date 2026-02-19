import { useState } from 'react';
import Link from 'next/link';
import { useStore } from '@/store';
import { useSession } from 'next-auth/react';

type WithdrawalMethod = 'bank' | 'paypal';

const methodTabs: { id: WithdrawalMethod; label: string }[] = [
  { id: 'bank', label: 'Bank EFT' },
  { id: 'paypal', label: 'PayPal' },
];

export default function WithdrawalsPage() {
  const { data: session, status } = useSession();
  const storeUser = useStore((state) => state.user);

  // Use session user if authenticated, otherwise fall back to store user
  const user = session?.user ? {
    id: session.user.id,
    username: session.user.username || 'User',
    balance: session.user.balance || 0,
  } : storeUser;

  const [activeMethod, setActiveMethod] = useState<WithdrawalMethod>('bank');
  const [amount, setAmount] = useState('');
  const [selectedBank, setSelectedBank] = useState('');

  const availableBalance = user?.balance ? user.balance / 100 : 0.00;

  const quickAmounts = [10, 25, 50, 100, 500];

  const handleQuickAmount = (value: number) => {
    setAmount(value.toString());
  };

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
        <p className="text-gray-500 mb-6">You need to be logged in to make withdrawals.</p>
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
    <div className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
              <Link href="/profile" className="hover:text-teal-700">Account</Link>
              <span>/</span>
              <span className="text-gray-900">Withdrawals</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Withdrawals</h1>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Main Form */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                {/* Method Tabs */}
                <div className="flex border-b border-gray-200">
                  {methodTabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveMethod(tab.id)}
                      className={`px-6 py-4 text-sm font-medium transition-colors relative ${
                        activeMethod === tab.id
                          ? 'text-teal-700'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {tab.label}
                      {activeMethod === tab.id && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-700" />
                      )}
                    </button>
                  ))}
                </div>

                {/* Available Balance */}
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                  <p className="text-sm text-gray-500">Available to Withdraw:</p>
                  <p className="text-xl font-bold text-gray-900">${availableBalance.toFixed(2)}</p>
                </div>

                <div className="p-6">
                  {/* Bank EFT Form */}
                  {activeMethod === 'bank' && (
                    <div className="space-y-6">
                      {/* Bank Account Selector */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Bank Account
                        </label>
                        <div className="relative">
                          <select
                            value={selectedBank}
                            onChange={(e) => setSelectedBank(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                          >
                            <option value="">BSB: ACC:</option>
                            <option value="saved">XXX-XXX: XXXXXXXX</option>
                          </select>
                          <svg
                            className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                        <Link href="/profile" className="text-sm text-teal-700 hover:text-teal-800 mt-2 inline-block">
                          + Add new bank account
                        </Link>
                      </div>

                      {/* Amount Input */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Amount
                        </label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                          <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="Minimum 10.00"
                            className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                          />
                        </div>
                      </div>

                      {/* Quick Amounts */}
                      <div className="flex flex-wrap gap-2">
                        {quickAmounts.map((value) => (
                          <button
                            key={value}
                            onClick={() => handleQuickAmount(value)}
                            className="flex-1 min-w-[80px] px-4 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:border-teal-500 hover:text-teal-700 transition-colors"
                          >
                            +{value}
                          </button>
                        ))}
                      </div>

                      {/* Submit Button */}
                      <div className="flex justify-end">
                        <button className="px-8 py-3 bg-teal-700 text-white rounded-lg font-medium hover:bg-teal-800 transition-colors">
                          Withdraw
                        </button>
                      </div>
                    </div>
                  )}

                  {/* PayPal Form */}
                  {activeMethod === 'paypal' && (
                    <div className="space-y-6">
                      {/* Secure Form Notice */}
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        Secure Form
                      </div>

                      {/* PayPal Logo */}
                      <div className="flex items-center gap-2">
                        <div className="text-2xl font-bold">
                          <span className="text-[#003087]">Pay</span>
                          <span className="text-[#009cde]">Pal</span>
                        </div>
                      </div>

                      {/* PayPal Notice */}
                      <p className="text-sm text-gray-600">
                        Note: A previous PayPal deposit to Foremark is required prior to withdrawing to PayPal.
                      </p>

                      {/* Amount Input */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Amount
                        </label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                          <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="Minimum $10.00"
                            className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                          />
                        </div>
                      </div>

                      {/* Quick Amounts */}
                      <div className="flex flex-wrap gap-2">
                        {quickAmounts.map((value) => (
                          <button
                            key={value}
                            onClick={() => handleQuickAmount(value)}
                            className="flex-1 min-w-[80px] px-4 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:border-teal-500 hover:text-teal-700 transition-colors"
                          >
                            +{value}
                          </button>
                        ))}
                      </div>

                      {/* Submit Button */}
                      <div className="flex justify-end">
                        <button className="px-8 py-3 bg-lime-400 text-teal-900 rounded-lg font-medium hover:bg-lime-500 transition-colors">
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar - Withdrawal Info (Desktop only) */}
            <div className="hidden lg:block lg:col-span-1">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Withdrawal Information</h3>

                <div className="space-y-4">
                  {activeMethod === 'bank' && (
                    <>
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                          <svg className="w-4 h-4 text-teal-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">Processing Time</p>
                          <p className="text-sm text-gray-500">1-3 business days</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                          <svg className="w-4 h-4 text-teal-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">No Fees</p>
                          <p className="text-sm text-gray-500">Free withdrawals to Australian banks</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                          <svg className="w-4 h-4 text-teal-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">Secure Transfer</p>
                          <p className="text-sm text-gray-500">Bank-grade encryption</p>
                        </div>
                      </div>
                    </>
                  )}

                  {activeMethod === 'paypal' && (
                    <>
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                          <svg className="w-4 h-4 text-teal-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">Fast Processing</p>
                          <p className="text-sm text-gray-500">Usually within 24 hours</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                          <svg className="w-4 h-4 text-teal-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">PayPal Protection</p>
                          <p className="text-sm text-gray-500">Buyer protection included</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                          <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">Requirement</p>
                          <p className="text-sm text-gray-500">Must have made a PayPal deposit first</p>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Minimum Amount Notice */}
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-500">
                    <span className="font-medium">Minimum withdrawal:</span> $10.00
                  </p>
                </div>
              </div>

              {/* Need Help */}
              <div className="mt-4 bg-teal-50 rounded-xl p-4">
                <h4 className="font-medium text-teal-900 mb-2">Need help?</h4>
                <p className="text-sm text-teal-700 mb-3">
                  Having trouble with your withdrawal? Our support team is here to help.
                </p>
                <button className="text-sm font-medium text-teal-700 hover:text-teal-800">
                  Contact Support →
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
  );
}
