import Link from 'next/link';
import { Market } from '@/types';

interface MarketCardProps {
  market: Market;
  showHotBadge?: boolean;
}

export default function MarketCard({ market, showHotBadge = false }: MarketCardProps) {
  const formatVolume = (volume: number) => {
    if (volume >= 1000000) {
      return `$${(volume / 1000000).toFixed(1)}M`;
    }
    if (volume >= 1000) {
      return `$${(volume / 1000).toFixed(0)}K`;
    }
    return `$${volume}`;
  };

  const categoryLabels: Record<string, string> = {
    politics: 'POLITICS',
    economics: 'ECONOMICS',
    climate: 'CLIMATE',
    sports: 'SPORTS',
    culture: 'CULTURE',
    world: 'WORLD',
  };

  return (
    <Link href={`/market/${market.id}`}>
      <div className="bg-white rounded-2xl p-5 border border-gray-200 hover:border-gray-300 hover:shadow-lg transition-all duration-200 cursor-pointer">
        {/* Badges */}
        <div className="flex items-center gap-2 mb-3">
          {showHotBadge && (
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-foremark-lime text-gray-900">
              HOT
            </span>
          )}
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700">
            {categoryLabels[market.category] || market.category.toUpperCase()}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-lg font-bold text-gray-900 mb-4 leading-tight">
          {market.title}
        </h3>

        {/* Price and Chance */}
        <div className="flex items-end justify-between mb-4">
          <div>
            <p className="text-3xl font-bold text-gray-900">{market.yesPrice}%</p>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Chance</p>
          </div>
        </div>

        {/* Buy Buttons - Kalshi Style */}
        <div className="flex gap-2">
          <button className="flex-1 py-2.5 px-4 rounded-full border-2 border-gray-200 text-emerald-500 font-bold text-sm hover:border-emerald-400 hover:bg-emerald-50 transition-colors">
            Yes {market.yesPrice}¢
          </button>
          <button className="flex-1 py-2.5 px-4 rounded-full border-2 border-gray-200 text-red-500 font-bold text-sm hover:border-red-400 hover:bg-red-50 transition-colors">
            No {market.noPrice}¢
          </button>
        </div>

        {/* Volume */}
        <div className="mt-3 pt-3 border-t border-gray-100">
          <span className="text-xs text-gray-500">
            Volume: <span className="font-semibold text-gray-700">{formatVolume(market.volume)}</span>
          </span>
        </div>
      </div>
    </Link>
  );
}
