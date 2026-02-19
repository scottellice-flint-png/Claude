import { useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Market } from '@/types';
import { useStore } from '@/store';

interface TradePanelProps {
  market: Market;
  selectedSide: 'yes' | 'no';
  onSideChange: (side: 'yes' | 'no') => void;
  selectedPrice?: number;
  selectedOutcome?: string;
}

export default function TradePanel({
  market,
  selectedSide,
  onSideChange,
  selectedPrice,
  selectedOutcome,
}: TradePanelProps) {
  const { data: session } = useSession();
  const [tradeMode, setTradeMode] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const storeUser = useStore((state) => state.user);
  const placeOrder = useStore((state) => state.placeOrder);

  // Use session user if authenticated
  const user = session?.user?.userType === 'user' ? {
    id: session.user.id,
    username: session.user.username || 'User',
    balance: session.user.balance || 0,
  } : storeUser;

  const isAuthenticated = !!session?.user || !!storeUser;

  const yesPrice = market.yesPrice;
  const noPrice = market.noPrice;
  const currentPrice = selectedSide === 'yes' ? yesPrice : noPrice;
  const quantity = amount > 0 ? Math.floor((amount * 100) / currentPrice) : 0;
  const potentialPayout = (quantity * 100) / 100;

  const handleSubmit = async () => {
    if (!user) {
      setMessage({ type: 'error', text: 'Please log in to trade' });
      return;
    }

    if (amount * 100 > user.balance) {
      setMessage({ type: 'error', text: 'Insufficient balance' });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    const result = placeOrder(
      market.id,
      selectedSide,
      'market',
      currentPrice,
      quantity
    );

    setIsSubmitting(false);

    if (result.success) {
      setMessage({ type: 'success', text: `Order placed! Bought ${quantity} ${selectedSide.toUpperCase()} contracts.` });
      setAmount(0);
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to place order' });
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
    }).format(value);
  };

  // Get display title for the outcome
  const getOutcomeTitle = () => {
    if (selectedOutcome) {
      return selectedOutcome;
    }
    // Default to showing main market info
    const closeDate = new Date(market.closeDate);
    return closeDate.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' });
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
      {/* Header with Market Info */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-foremark-green/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-lg">{market.icon || '📊'}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{market.title}</p>
            <p className="text-sm">
              <span className={`font-semibold ${selectedSide === 'yes' ? 'text-foremark-green' : 'text-gray-700'}`}>
                {tradeMode === 'buy' ? 'Place Bet' : 'Cash Out'} {selectedSide === 'yes' ? 'Yes' : 'No'}
              </span>
              <span className="text-gray-500"> · {getOutcomeTitle()}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Place Bet / Cash Out Toggle */}
      <div className="flex items-center gap-2 p-4 border-b border-gray-100">
        <div className="flex bg-gray-100 rounded-full p-1">
          <button
            onClick={() => setTradeMode('buy')}
            className={`px-4 py-1.5 text-sm font-semibold rounded-full transition-all ${
              tradeMode === 'buy'
                ? 'bg-foremark-green text-white'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Place Bet
          </button>
          <button
            onClick={() => setTradeMode('sell')}
            className={`px-4 py-1.5 text-sm font-semibold rounded-full transition-all ${
              tradeMode === 'sell'
                ? 'bg-gray-900 text-white'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Cash Out
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Yes/No Price Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => onSideChange('yes')}
            className={`py-3 text-center font-bold rounded-full transition-all border-2 ${
              selectedSide === 'yes'
                ? 'bg-foremark-lime text-gray-900 border-foremark-lime'
                : 'bg-white border-gray-200 text-gray-900 hover:border-foremark-lime'
            }`}
          >
            Yes {yesPrice}¢
          </button>
          <button
            onClick={() => onSideChange('no')}
            className={`py-3 text-center font-bold rounded-full transition-all border-2 ${
              selectedSide === 'no'
                ? 'bg-gray-900 text-white border-gray-900'
                : 'bg-white border-gray-200 text-gray-900 hover:border-gray-900'
            }`}
          >
            No {noPrice}¢
          </button>
        </div>

        {/* Amount Input */}
        <div className="border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm text-gray-500">Amount</span>
              {isAuthenticated && (
                <div className="mt-1">
                  <Link href="/deposits" className="text-xs text-foremark-green hover:underline">
                    Earn 3.25% Interest
                  </Link>
                </div>
              )}
            </div>
            <div className="flex items-center gap-1">
              <span className="text-3xl font-semibold text-gray-300">$</span>
              <input
                type="number"
                min="0"
                value={amount || ''}
                onChange={(e) => setAmount(Math.max(0, parseInt(e.target.value) || 0))}
                placeholder="0"
                className="w-20 text-3xl font-semibold text-right text-gray-900 bg-transparent border-0 focus:ring-0 focus:outline-none placeholder-gray-300"
              />
            </div>
          </div>
        </div>

        {/* Quick amount buttons - only show for authenticated users */}
        {isAuthenticated && (
          <div className="flex gap-2">
            {[10, 50, 100, 500].map((q) => (
              <button
                key={q}
                onClick={() => setAmount(q)}
                className={`flex-1 py-2 text-sm font-semibold rounded-full transition-colors ${
                  amount === q
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                ${q}
              </button>
            ))}
          </div>
        )}

        {/* Payout Info - only show when amount > 0 */}
        {amount > 0 && isAuthenticated && (
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Potential Payout</span>
              <span className="text-xl font-bold text-foremark-green">
                {formatCurrency(potentialPayout)}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              If {selectedSide.toUpperCase()} wins, you receive {formatCurrency(potentialPayout)}
            </p>
          </div>
        )}

        {/* Available Balance - only show for authenticated users */}
        {user && isAuthenticated && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Available Balance</span>
            <span className="font-semibold text-gray-900">{formatCurrency(user.balance / 100)}</span>
          </div>
        )}

        {/* Message */}
        {message && (
          <div
            className={`p-3 rounded-xl text-sm font-medium ${
              message.type === 'success'
                ? 'bg-green-50 text-green-700'
                : 'bg-red-50 text-red-700'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Submit Button - Show "Sign up to trade" for non-authenticated users */}
        {isAuthenticated ? (
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || amount <= 0 || amount * 100 > (user?.balance || 0)}
            className="w-full py-4 rounded-full font-bold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-foremark-green text-white hover:bg-foremark-green-light"
          >
            {isSubmitting
              ? 'Placing Bet...'
              : tradeMode === 'buy'
                ? `Place Bet · ${selectedSide.toUpperCase()} for ${formatCurrency(amount)}`
                : `Cash Out for ${formatCurrency(amount)}`}
          </button>
        ) : (
          <Link
            href="/login?mode=signup"
            className="block w-full py-4 rounded-full font-bold text-lg text-center transition-all bg-foremark-green text-white hover:bg-foremark-green-light"
          >
            Sign up to bet
          </Link>
        )}
      </div>
    </div>
  );
}
