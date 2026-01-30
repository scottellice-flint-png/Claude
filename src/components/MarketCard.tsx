import Link from 'next/link';
import { Market } from '@/types';

interface MarketCardProps {
  market: Market;
}

export default function MarketCard({ market }: MarketCardProps) {
  const formatVolume = (volume: number) => {
    if (volume >= 1000000) {
      return `$${(volume / 1000000).toFixed(1)}M`;
    }
    if (volume >= 1000) {
      return `$${(volume / 1000).toFixed(0)}K`;
    }
    return `$${volume}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const categoryColors: Record<string, string> = {
    politics: 'bg-purple-500/20 text-purple-400',
    economics: 'bg-blue-500/20 text-blue-400',
    climate: 'bg-green-500/20 text-green-400',
    sports: 'bg-orange-500/20 text-orange-400',
    culture: 'bg-pink-500/20 text-pink-400',
  };

  return (
    <Link href={`/market/${market.id}`}>
      <div className="bg-slate-800 rounded-xl p-5 hover:bg-slate-750 transition-all duration-200 border border-slate-700 hover:border-slate-600 cursor-pointer group">
        {/* Category Badge */}
        <div className="flex items-center justify-between mb-3">
          <span
            className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${
              categoryColors[market.category] || 'bg-slate-500/20 text-slate-400'
            }`}
          >
            {market.category}
          </span>
          <span className="text-xs text-slate-500">
            Closes {formatDate(market.closeDate)}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold text-white mb-4 line-clamp-2 group-hover:text-primary-400 transition-colors">
          {market.title}
        </h3>

        {/* Price Display */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-emerald-500/10 rounded-lg p-3 text-center">
            <p className="text-xs text-slate-400 mb-1">Yes</p>
            <p className="text-2xl font-bold text-emerald-400">{market.yesPrice}¢</p>
          </div>
          <div className="bg-rose-500/10 rounded-lg p-3 text-center">
            <p className="text-xs text-slate-400 mb-1">No</p>
            <p className="text-2xl font-bold text-rose-400">{market.noPrice}¢</p>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between text-sm">
          <div>
            <span className="text-slate-500">Volume</span>
            <span className="text-white ml-2 font-medium">{formatVolume(market.volume)}</span>
          </div>
          <div>
            <span className="text-slate-500">Liquidity</span>
            <span className="text-white ml-2 font-medium">{formatVolume(market.liquidity)}</span>
          </div>
        </div>

        {/* Progress bar showing yes probability */}
        <div className="mt-4 h-1.5 bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-300"
            style={{ width: `${market.yesPrice}%` }}
          />
        </div>
      </div>
    </Link>
  );
}
