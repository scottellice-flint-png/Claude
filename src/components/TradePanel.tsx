import { useState, useEffect } from 'react';
import { Market } from '@/types';
import { useStore } from '@/store';

interface TradePanelProps {
  market: Market;
  selectedSide: 'yes' | 'no';
  onSideChange: (side: 'yes' | 'no') => void;
  selectedPrice?: number;
}

export default function TradePanel({
  market,
  selectedSide,
  onSideChange,
  selectedPrice,
}: TradePanelProps) {
  const [amount, setAmount] = useState(100);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const user = useStore((state) => state.user);
  const placeOrder = useStore((state) => state.placeOrder);

  const currentPrice = selectedSide === 'yes' ? market.yesPrice : market.noPrice;
  const quantity = Math.floor((amount * 100) / currentPrice);
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
      setAmount(100);
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

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
      {/* Side Toggle */}
      <div className="grid grid-cols-2 p-2 gap-2 bg-gray-50">
        <button
          onClick={() => onSideChange('yes')}
          className={`py-3 text-center font-bold rounded-full transition-all ${
            selectedSide === 'yes'
              ? 'bg-foremark-lime text-gray-900'
              : 'bg-white text-gray-500 border border-gray-200'
          }`}
        >
          BUY YES
        </button>
        <button
          onClick={() => onSideChange('no')}
          className={`py-3 text-center font-bold rounded-full transition-all ${
            selectedSide === 'no'
              ? 'bg-gray-900 text-white'
              : 'bg-white text-gray-500 border border-gray-200'
          }`}
        >
          BUY NO
        </button>
      </div>

      <div className="p-5 space-y-5">
        {/* Investment Amount */}
        <div>
          <label className="block text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Investment Amount
          </label>
          <div className="relative">
            <input
              type="number"
              min="1"
              value={amount}
              onChange={(e) => setAmount(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full bg-white border-2 border-gray-200 rounded-xl px-4 py-4 text-2xl font-bold text-gray-900 focus:outline-none focus:border-foremark-green pr-12"
            />
            <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-xl">
              $
            </span>
          </div>

          {/* Quick amount buttons */}
          <div className="flex gap-2 mt-3">
            {[50, 100, 250, 500].map((q) => (
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
        </div>

        {/* Payout Info */}
        <div className="bg-gray-50 rounded-xl p-4">
          <div className="flex justify-between items-center">
            <span className="text-gray-500">Potential Payout</span>
            <span className="text-2xl font-bold text-foremark-green">
              {formatCurrency(potentialPayout)}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            If {selectedSide.toUpperCase()} wins, you receive {formatCurrency(potentialPayout)}
          </p>
        </div>

        {/* Available Balance */}
        {user && (
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

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || !user || amount * 100 > (user?.balance || 0)}
          className={`w-full py-4 rounded-full font-bold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
            selectedSide === 'yes'
              ? 'bg-foremark-lime text-gray-900 hover:bg-foremark-lime-dark'
              : 'bg-gray-900 text-white hover:bg-gray-800'
          }`}
        >
          {isSubmitting
            ? 'Placing Order...'
            : `Buy ${selectedSide.toUpperCase()} for ${formatCurrency(amount)}`}
        </button>
      </div>
    </div>
  );
}
