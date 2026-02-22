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

        {/* Title with optional image */}
        <div className="flex items-start gap-3 mb-4">
          {(market.heroImageUrl || market.cardImageUrl) && (
            <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
              <img
                src={market.cardImageUrl || market.heroImageUrl}
                alt={market.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <h3 className="text-lg font-bold text-gray-900 leading-tight flex-1">
            {market.title}
          </h3>
        </div>

        {/* Price and Chance */}
        <div className="flex items-end justify-between mb-4">
          <div>
            <p className="text-3xl font-bold text-gray-900">{market.yesPrice}%</p>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Chance</p>
          </div>
        </div>

        {/* Buy Buttons */}
        <div className="flex gap-2">
          <button className="flex-1 py-2.5 px-4 rounded-full bg-foremark-lime text-gray-900 font-bold text-sm hover:bg-foremark-lime-dark transition-colors">
            Yes {market.yesPrice}¢
          </button>
          <button className="flex-1 py-2.5 px-4 rounded-full bg-white border-2 border-gray-900 text-gray-900 font-bold text-sm hover:bg-gray-50 transition-colors">
            No {market.noPrice}¢
          </button>
        </div>

        {/* Volume - only show if there are actual trades */}
        {market.volume > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <span className="text-xs text-gray-500">
              Volume: <span className="font-semibold text-gray-700">{formatVolume(market.volume)}</span>
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}
