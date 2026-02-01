import { useState } from 'react';
import Link from 'next/link';
import { useStore } from '@/store';

type DepositMethod = 'card' | 'payid' | 'paypal' | 'bpay';

const QUICK_AMOUNTS_CARD = [5, 10, 25, 50, 100];
const QUICK_AMOUNTS_PAYPAL = [10, 25, 50, 100, 500];

export default function DepositsPage() {
  const user = useStore((state) => state.user);
  const [activeMethod, setActiveMethod] = useState<DepositMethod>('card');
  const [amount, setAmount] = useState('');
  const [selectedCard, setSelectedCard] = useState('');

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
    }).format(cents / 100);
  };

  if (!user) {
    return (
      <div className="text-center py-16">
        <div className="text-6xl mb-4">🔒</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Please log in</h2>
        <p className="text-gray-500">You need to be logged in to make deposits.</p>
      </div>
    );
  }

  const methodTabs: { id: DepositMethod; label: string }[] = [
    { id: 'card', label: 'Card' },
    { id: 'payid', label: 'PayID / Bank EFT' },
    { id: 'paypal', label: 'PayPal' },
    { id: 'bpay', label: 'BPAY' },
  ];

  const renderCardForm = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          Secure Form
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">Accepted:</span>
          <div className="flex items-center gap-1">
            <div className="w-8 h-5 bg-[#1A1F71] rounded flex items-center justify-center">
              <span className="text-white text-[8px] font-bold">VISA</span>
            </div>
            <div className="w-8 h-5 bg-gradient-to-r from-red-500 to-yellow-500 rounded flex items-center justify-center">
              <div className="flex">
                <div className="w-2 h-2 bg-red-600 rounded-full opacity-80"></div>
                <div className="w-2 h-2 bg-yellow-500 rounded-full -ml-1 opacity-80"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm text-gray-500 mb-2">Payment Method</label>
        <select
          value={selectedCard}
          onChange={(e) => setSelectedCard(e.target.value)}
          className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-foremark-green/20 focus:border-foremark-green"
        >
          <option value="">Please select a payment method</option>
          <option value="new">Add new card</option>
        </select>
      </div>

      <div>
        <label className="block text-sm text-gray-500 mb-2">Amount</label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Minimum $5.00"
            className="w-full pl-8 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-foremark-green/20 focus:border-foremark-green"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {QUICK_AMOUNTS_CARD.map((quickAmount) => (
          <button
            key={quickAmount}
            onClick={() => setAmount(quickAmount.toString())}
            className="flex-1 min-w-[60px] py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            + {quickAmount}
          </button>
        ))}
      </div>

      <button className="w-full py-3 bg-foremark-green text-white font-semibold rounded-lg hover:bg-foremark-green-light transition-colors">
        Deposit
      </button>

      <div className="pt-4 border-t border-gray-100">
        <h4 className="font-medium text-foremark-green mb-2">Verifying Your Card</h4>
        <p className="text-sm text-gray-600">
          We partner with Australian service providers to easily and securely verify your card.
          This will not divulge any other financial or transactional information. This means less paperwork and less fuss.
        </p>
        <button className="mt-3 text-sm font-medium text-foremark-green hover:text-foremark-green-light">
          Verify Your Card
        </button>
      </div>
    </div>
  );

  const renderPayIDForm = () => (
    <div className="space-y-6">
      {/* PayID Section */}
      <div className="bg-gray-50 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="px-2 py-1 bg-foremark-green text-white text-xs font-bold rounded">PayID</div>
        </div>
        <h3 className="font-semibold text-gray-900 mb-2">Deposit Using PayID</h3>
        <p className="text-sm text-gray-600 mb-4">
          We will generate a unique PayID email address linked to your account
        </p>
        <button className="w-full py-3 bg-foremark-green text-white font-semibold rounded-lg hover:bg-foremark-green-light transition-colors">
          Start using PayID
        </button>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex-1 h-px bg-gray-200"></div>
        <span className="text-sm text-gray-400">OR</span>
        <div className="flex-1 h-px bg-gray-200"></div>
      </div>

      {/* Bank EFT Section */}
      <div>
        <h3 className="font-semibold text-gray-900 mb-2">Bank EFT Options</h3>
        <p className="text-sm text-gray-600 mb-4">
          Deposit funds using an electronic bank transfer
        </p>
        <button className="w-full flex items-center justify-between px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
          <span className="font-medium text-gray-900">Deposit Using Bank EFT</span>
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      <div className="p-4 bg-foremark-lime/20 rounded-lg">
        <p className="text-sm text-gray-700">
          <strong>Bank Transfer Details:</strong>
        </p>
        <div className="mt-2 space-y-1 text-sm text-gray-600">
          <p>BSB: <span className="font-mono">XXX-XXX</span></p>
          <p>Account: <span className="font-mono">XX-XXX-XXXX</span></p>
          <p>Reference: <span className="font-mono">Your username</span></p>
        </div>
      </div>
    </div>
  );

  const renderPayPalForm = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          Secure Form
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="text-2xl font-bold text-[#003087]">Pay</div>
        <div className="text-2xl font-bold text-[#009cde]">Pal</div>
      </div>

      <div>
        <label className="block text-sm text-gray-500 mb-2">Amount</label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Minimum $10.00"
            className="w-full pl-8 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-foremark-green/20 focus:border-foremark-green"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {QUICK_AMOUNTS_PAYPAL.map((quickAmount) => (
          <button
            key={quickAmount}
            onClick={() => setAmount(quickAmount.toString())}
            className="flex-1 min-w-[60px] py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            + {quickAmount}
          </button>
        ))}
      </div>

      <button className="w-full py-3 bg-foremark-green text-white font-semibold rounded-lg hover:bg-foremark-green-light transition-colors">
        Next
      </button>
    </div>
  );

  const renderBPAYForm = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <div className="px-3 py-1.5 bg-[#002D6E] text-white text-sm font-bold rounded">BPAY</div>
      </div>

      <p className="text-sm text-gray-600">
        Contact your bank or financial institution to make this payment from your cheque, savings, debit card or transaction account.
        You will be required to enter the below Biller Code and Customer Reference number. For further assistance with completing a BPAY deposit, please contact your bank.
      </p>

      <p className="text-sm text-gray-500">
        BPAY deposits can take 2-3 days to clear.
      </p>

      <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Biller Code:</span>
          <div className="flex items-center gap-2">
            <span className="font-mono font-semibold text-gray-900">XXXXXX</span>
            <button className="p-1 hover:bg-gray-200 rounded transition-colors">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Customer Reference:</span>
          <div className="flex items-center gap-2">
            <span className="font-mono font-semibold text-gray-900">XXXXXXXX</span>
            <button className="p-1 hover:bg-gray-200 rounded transition-colors">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderMethodContent = () => {
    switch (activeMethod) {
      case 'card':
        return renderCardForm();
      case 'payid':
        return renderPayIDForm();
      case 'paypal':
        return renderPayPalForm();
      case 'bpay':
        return renderBPAYForm();
    }
  };

  const getMethodBenefits = () => {
    switch (activeMethod) {
      case 'card':
        return {
          timing: 'Instant',
          benefits: ['No Fees', 'Instant depositing', 'No Daily Limit'],
        };
      case 'payid':
        return {
          timing: '24-48 hours on business days',
          benefits: ['No Daily Limit', 'Safe and Secure', 'No Fees'],
        };
      case 'paypal':
        return {
          timing: 'Instant',
          benefits: ['No Fees', 'Instant Deposit', 'No Daily Limit'],
        };
      case 'bpay':
        return {
          timing: '48-72 hours on business days',
          benefits: ['No Fees', 'Instant depositing', 'No Daily Limit'],
        };
    }
  };

  const benefits = getMethodBenefits();

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Deposit Funds</h1>
        <p className="text-gray-500 mt-1">Add money to your Foremark account</p>
      </div>

      {/* Balance */}
      <div className="mb-6 p-4 bg-foremark-lime/20 rounded-xl">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Current Balance</span>
          <span className="text-xl font-bold text-gray-900">{formatCurrency(user.balance)}</span>
        </div>
      </div>

      {/* Method Tabs */}
      <div className="flex border-b border-gray-200 mb-6 overflow-x-auto">
        {methodTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveMethod(tab.id)}
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeMethod === tab.id
                ? 'text-foremark-green border-foremark-green'
                : 'text-gray-500 border-transparent hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            {renderMethodContent()}
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          {/* Benefits */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-sm font-medium text-foremark-green mb-3">{benefits.timing}</p>
            <div className="space-y-2">
              {benefits.benefits.map((benefit, index) => (
                <div key={index} className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-foremark-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm text-gray-700">{benefit}</span>
                </div>
              ))}
            </div>

            {activeMethod === 'card' && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-sm font-medium text-gray-900 mb-2">Accepted Cards</p>
                <div className="flex items-center gap-2">
                  <div className="w-10 h-6 bg-gradient-to-r from-red-500 to-yellow-500 rounded flex items-center justify-center">
                    <div className="flex">
                      <div className="w-2.5 h-2.5 bg-red-600 rounded-full opacity-80"></div>
                      <div className="w-2.5 h-2.5 bg-yellow-500 rounded-full -ml-1 opacity-80"></div>
                    </div>
                  </div>
                  <div className="w-10 h-6 bg-[#1A1F71] rounded flex items-center justify-center">
                    <span className="text-white text-[9px] font-bold">VISA</span>
                  </div>
                </div>
              </div>
            )}

            {activeMethod === 'bpay' && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-500">
                  To make a deposit through BPAY, you need to visit the BPAY section of your online bank account.
                </p>
              </div>
            )}
          </div>

          {/* Help */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-2">Need Help?</h3>
            <p className="text-sm text-gray-600 mb-3">
              Our support team is available 24/7 to assist with any deposit queries.
            </p>
            <Link
              href="#"
              className="text-sm font-medium text-foremark-green hover:text-foremark-green-light"
            >
              Contact Support
            </Link>
          </div>

          {/* Responsible Gambling */}
          <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs text-gray-500">
                You can set deposit limits in your <Link href="/profile" className="text-foremark-green">Account settings</Link>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
