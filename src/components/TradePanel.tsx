import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Market } from '@/types';
import { useStore } from '@/store';

interface LiquidityState {
  maxBetCents: number;
  maxBetDisplay: string;
  liquidityTier: string;
  liquidityTierDisplay: string;
  betCapReason: string;
  isSpreadWidened: boolean;
  spreadWarning: string | null;
  spreadMultiplier: number;
}

interface TradePanelProps {
  market: Market;
  selectedSide: 'yes' | 'no';
  onSideChange: (side: 'yes' | 'no') => void;
  selectedPrice?: number;
  selectedOutcome?: string;
  outcomeYesPrice?: number;
  outcomeNoPrice?: number;
}

export default function TradePanel({
  market,
  selectedSide,
  onSideChange,
  selectedPrice,
  selectedOutcome,
  outcomeYesPrice,
  outcomeNoPrice,
}: TradePanelProps) {
  const { data: session } = useSession();
  const [tradeMode, setTradeMode] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [liquidityState, setLiquidityState] = useState<LiquidityState | null>(null);

  const storeUser = useStore((state) => state.user);
  const placeOrder = useStore((state) => state.placeOrder);

  // Fetch liquidity state for NT bet cap display
  useEffect(() => {
    const fetchLiquidityState = async () => {
      try {
        const response = await fetch(`/api/trading/liquidity?marketId=${market.id}`);
        if (response.ok) {
          const data = await response.json();
          setLiquidityState(data);
        }
      } catch (error) {
        console.error('Failed to fetch liquidity state:', error);
      }
    };

    fetchLiquidityState();
    // Refresh every 30 seconds
    const interval = setInterval(fetchLiquidityState, 30000);
    return () => clearInterval(interval);
  }, [market.id]);

  // Use session user if authenticated
  const user = session?.user ? {
    id: session.user.id,
    username: session.user.username || 'User',
    balance: session.user.balance || 0,
  } : storeUser;

  const isAuthenticated = !!session?.user || !!storeUser;

  // Use outcome-specific prices if available, otherwise use market prices
  const yesPrice = outcomeYesPrice ?? market.yesPrice;
  const noPrice = outcomeNoPrice ?? market.noPrice;
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

  // Check if amount exceeds bet cap
  const maxBetCents = liquidityState?.maxBetCents || 5000000;
  const amountCents = amount * 100;
  const exceedsBetCap = amountCents > maxBetCents;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
      {/* NT Liquidity-Locked Bet Cap - Seed Phase */}
      {liquidityState && liquidityState.liquidityTier === 'seed' && (
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-200 p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                  Seed Phase
                </span>
              </div>
              <p className="text-sm font-medium text-gray-800 mb-1.5">
                Max Bet: {liquidityState.maxBetDisplay}
              </p>
              <p className="text-xs text-gray-600 leading-relaxed">
                This market is building liquidity. Bet limits increase as the market matures.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Growth Phase Indicator */}
      {liquidityState && liquidityState.liquidityTier === 'growth' && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200 p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                  Growth Phase
                </span>
                <span className="text-xs text-gray-500">Active Market</span>
              </div>
              <p className="text-sm font-medium text-gray-800 mb-1.5">
                Max Bet: {liquidityState.maxBetDisplay}
              </p>
              <p className="text-xs text-gray-600 leading-relaxed">
                This market has growing liquidity. Higher bet limits are available as the market matures.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Spread Widened Warning */}
      {liquidityState?.isSpreadWidened && (
        <div className="bg-red-50 border-b border-red-200 p-3">
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-red-800">
                Spread Widened
              </p>
              <p className="text-xs text-red-600 mt-0.5">
                {liquidityState.spreadWarning}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header with Market Info */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-foremark-green/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-lg">{market.icon || '📊'}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 break-words">{market.title}</p>
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
      <div className="flex items-center gap-3 p-4 border-b border-gray-100">
        <button
          onClick={() => setTradeMode('buy')}
          className={`px-5 py-2 text-sm font-bold rounded-full transition-all border-2 ${
            tradeMode === 'buy'
              ? 'bg-foremark-green text-white border-foremark-green shadow-md'
              : 'bg-white text-gray-500 border-gray-200 hover:border-foremark-green hover:text-gray-700'
          }`}
        >
          Place Bet
        </button>
        <button
          onClick={() => setTradeMode('sell')}
          className={`px-5 py-2 text-sm font-bold rounded-full transition-all border-2 ${
            tradeMode === 'sell'
              ? 'bg-gray-900 text-white border-gray-900 shadow-md'
              : 'bg-white text-gray-500 border-gray-200 hover:border-gray-900 hover:text-gray-700'
          }`}
        >
          Cash Out
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Yes/No Price Buttons - hidden in Cash Out mode */}
        {tradeMode === 'buy' && (
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
        )}

        {/* Amount Input */}
        <div className="border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm text-gray-500">Amount</span>
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

        {/* Bet Cap Warning */}
        {exceedsBetCap && liquidityState && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
            <p className="text-sm font-medium text-red-700">
              Exceeds maximum bet of {liquidityState.maxBetDisplay}
            </p>
            <p className="text-xs text-red-500 mt-1">
              Reduce your bet amount to continue
            </p>
          </div>
        )}

        {/* Submit Button - Show "Sign up to trade" for non-authenticated users */}
        {isAuthenticated ? (
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || amount <= 0 || amount * 100 > (user?.balance || 0) || exceedsBetCap}
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

        {/* Liquidity Tier Badge */}
        {liquidityState && (
          <div className="flex justify-center pt-2">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
              liquidityState.liquidityTier === 'seed'
                ? 'bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-700'
                : liquidityState.liquidityTier === 'growth'
                ? 'bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700'
                : 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-700'
            }`}>
              {liquidityState.liquidityTier === 'seed' && (
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                  <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                </svg>
              )}
              {liquidityState.liquidityTier === 'growth' && (
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
                </svg>
              )}
              {liquidityState.liquidityTier === 'mature' && (
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              )}
              {liquidityState.liquidityTierDisplay}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
