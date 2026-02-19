import { OrderBook as OrderBookType } from '@/types';

interface OrderBookProps {
  orderBook: OrderBookType;
  selectedSide: 'yes' | 'no';
  onPriceSelect: (price: number) => void;
}

export default function OrderBook({ orderBook, selectedSide, onPriceSelect }: OrderBookProps) {
  const book = selectedSide === 'yes' ? orderBook.yes : orderBook.no;

  const maxQuantity = Math.max(
    ...book.bids.map((b) => b.quantity),
    ...book.asks.map((a) => a.quantity)
  );

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
      <div className="p-4 border-b border-slate-700">
        <h3 className="text-lg font-semibold text-white">Order Book</h3>
        <p className="text-sm text-slate-400">
          {selectedSide === 'yes' ? 'Yes' : 'No'} bets
        </p>
      </div>

      <div className="divide-y divide-slate-700">
        {/* Header */}
        <div className="grid grid-cols-3 px-4 py-2 text-xs font-medium text-slate-500 uppercase">
          <span>Price</span>
          <span className="text-center">Quantity</span>
          <span className="text-right">Total</span>
        </div>

        {/* Asks (Sell orders) - sorted high to low */}
        <div className="max-h-40 overflow-y-auto">
          {[...book.asks].reverse().map((entry, i) => (
            <div
              key={`ask-${i}`}
              onClick={() => onPriceSelect(entry.price)}
              className="grid grid-cols-3 px-4 py-1.5 text-sm hover:bg-slate-700/50 cursor-pointer relative"
            >
              <div
                className="absolute inset-0 bg-rose-500/10 z-0"
                style={{ width: `${(entry.quantity / maxQuantity) * 100}%` }}
              />
              <span className="text-rose-400 z-10">{entry.price}¢</span>
              <span className="text-center text-slate-300 z-10">{entry.quantity}</span>
              <span className="text-right text-slate-500 z-10">
                ${((entry.price * entry.quantity) / 100).toFixed(0)}
              </span>
            </div>
          ))}
        </div>

        {/* Spread */}
        <div className="px-4 py-2 bg-slate-900/50 text-center">
          <span className="text-xs text-slate-500">Spread</span>
          <span className="text-sm text-white ml-2">
            {book.asks[0] && book.bids[0]
              ? `${book.asks[0].price - book.bids[0].price}¢`
              : '-'}
          </span>
        </div>

        {/* Bids (Buy orders) - sorted high to low */}
        <div className="max-h-40 overflow-y-auto">
          {book.bids.map((entry, i) => (
            <div
              key={`bid-${i}`}
              onClick={() => onPriceSelect(entry.price)}
              className="grid grid-cols-3 px-4 py-1.5 text-sm hover:bg-slate-700/50 cursor-pointer relative"
            >
              <div
                className="absolute inset-0 bg-emerald-500/10 z-0"
                style={{ width: `${(entry.quantity / maxQuantity) * 100}%` }}
              />
              <span className="text-emerald-400 z-10">{entry.price}¢</span>
              <span className="text-center text-slate-300 z-10">{entry.quantity}</span>
              <span className="text-right text-slate-500 z-10">
                ${((entry.price * entry.quantity) / 100).toFixed(0)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
