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
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
  const [quantity, setQuantity] = useState(10);
  const [limitPrice, setLimitPrice] = useState(
    selectedSide === 'yes' ? market.yesPrice : market.noPrice
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const user = useStore((state) => state.user);
  const placeOrder = useStore((state) => state.placeOrder);

  // Update limit price when selected from order book
  useEffect(() => {
    if (selectedPrice !== undefined) {
      setLimitPrice(selectedPrice);
      setOrderType('limit');
    }
  }, [selectedPrice]);

  // Update limit price when side changes
  useEffect(() => {
    setLimitPrice(selectedSide === 'yes' ? market.yesPrice : market.noPrice);
  }, [selectedSide, market.yesPrice, market.noPrice]);

  const currentPrice = selectedSide === 'yes' ? market.yesPrice : market.noPrice;
  const effectivePrice = orderType === 'market' ? currentPrice : limitPrice;
  const totalCost = effectivePrice * quantity;
  const potentialProfit = (100 - effectivePrice) * quantity;

  const handleSubmit = async () => {
    if (!user) {
      setMessage({ type: 'error', text: 'Please log in to trade' });
      return;
    }

    if (totalCost > user.balance) {
      setMessage({ type: 'error', text: 'Insufficient balance' });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    const result = placeOrder(
      market.id,
      selectedSide,
      orderType,
      effectivePrice,
      quantity
    );

    setIsSubmitting(false);

    if (result.success) {
      setMessage({ type: 'success', text: `Order placed successfully! Bought ${quantity} ${selectedSide.toUpperCase()} contracts.` });
      setQuantity(10);
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to place order' });
    }
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
      {/* Side Toggle */}
      <div className="grid grid-cols-2">
        <button
          onClick={() => onSideChange('yes')}
          className={`py-4 text-center font-semibold transition-colors ${
            selectedSide === 'yes'
              ? 'bg-emerald-500 text-white'
              : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
          }`}
        >
          Buy Yes {market.yesPrice}¢
        </button>
        <button
          onClick={() => onSideChange('no')}
          className={`py-4 text-center font-semibold transition-colors ${
            selectedSide === 'no'
              ? 'bg-rose-500 text-white'
              : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
          }`}
        >
          Buy No {market.noPrice}¢
        </button>
      </div>

      <div className="p-5 space-y-5">
        {/* Order Type */}
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-2">
            Order Type
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setOrderType('market')}
              className={`py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                orderType === 'market'
                  ? 'bg-primary-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              Market
            </button>
            <button
              onClick={() => setOrderType('limit')}
              className={`py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                orderType === 'limit'
                  ? 'bg-primary-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              Limit
            </button>
          </div>
        </div>

        {/* Limit Price (only for limit orders) */}
        {orderType === 'limit' && (
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">
              Limit Price (¢)
            </label>
            <input
              type="number"
              min="1"
              max="99"
              value={limitPrice}
              onChange={(e) => setLimitPrice(Math.max(1, Math.min(99, parseInt(e.target.value) || 1)))}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        )}

        {/* Quantity */}
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-2">
            Quantity (contracts)
          </label>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 10))}
              className="w-10 h-10 rounded-lg bg-slate-700 text-white hover:bg-slate-600 flex items-center justify-center"
            >
              -
            </button>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-center text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <button
              onClick={() => setQuantity(quantity + 10)}
              className="w-10 h-10 rounded-lg bg-slate-700 text-white hover:bg-slate-600 flex items-center justify-center"
            >
              +
            </button>
          </div>
          {/* Quick select buttons */}
          <div className="flex space-x-2 mt-2">
            {[10, 50, 100, 500].map((q) => (
              <button
                key={q}
                onClick={() => setQuantity(q)}
                className="flex-1 py-1.5 text-xs rounded bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-white transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Order Summary */}
        <div className="bg-slate-900 rounded-lg p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Price per contract</span>
            <span className="text-white">{effectivePrice}¢</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Quantity</span>
            <span className="text-white">{quantity}</span>
          </div>
          <div className="border-t border-slate-700 pt-2 mt-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Total Cost</span>
              <span className="text-white font-semibold">{formatCurrency(totalCost)}</span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-slate-400">Max Profit (if {selectedSide})</span>
              <span className="text-emerald-400 font-semibold">{formatCurrency(potentialProfit)}</span>
            </div>
          </div>
        </div>

        {/* Available Balance */}
        {user && (
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Available Balance</span>
            <span className="text-white">{formatCurrency(user.balance)}</span>
          </div>
        )}

        {/* Message */}
        {message && (
          <div
            className={`p-3 rounded-lg text-sm ${
              message.type === 'success'
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'bg-rose-500/20 text-rose-400'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || !user || totalCost > (user?.balance || 0)}
          className={`w-full py-3 rounded-lg font-semibold text-white transition-all ${
            selectedSide === 'yes'
              ? 'bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/50'
              : 'bg-rose-500 hover:bg-rose-600 disabled:bg-rose-500/50'
          } disabled:cursor-not-allowed`}
        >
          {isSubmitting
            ? 'Placing Order...'
            : `Buy ${quantity} ${selectedSide.toUpperCase()} @ ${effectivePrice}¢`}
        </button>
      </div>
    </div>
  );
}
