import { useMemo } from 'react';

interface PriceChartProps {
  marketId: string;
  currentPrice: number;
}

export default function PriceChart({ marketId, currentPrice }: PriceChartProps) {
  // Generate mock price history data
  const priceHistory = useMemo(() => {
    const data = [];
    let price = currentPrice - 10 + Math.random() * 5;
    const now = Date.now();

    for (let i = 30; i >= 0; i--) {
      // Random walk with drift toward current price
      const drift = (currentPrice - price) * 0.1;
      const noise = (Math.random() - 0.5) * 5;
      price = Math.max(1, Math.min(99, price + drift + noise));

      data.push({
        timestamp: new Date(now - i * 24 * 60 * 60 * 1000).toISOString(),
        price: Math.round(price),
      });
    }

    // Ensure last point is current price
    data[data.length - 1].price = currentPrice;

    return data;
  }, [marketId, currentPrice]);

  const minPrice = Math.min(...priceHistory.map((p) => p.price));
  const maxPrice = Math.max(...priceHistory.map((p) => p.price));
  const priceRange = maxPrice - minPrice || 10;

  const chartHeight = 200;
  const chartWidth = 100; // percentage

  const points = priceHistory
    .map((point, i) => {
      const x = (i / (priceHistory.length - 1)) * chartWidth;
      const y = chartHeight - ((point.price - minPrice) / priceRange) * chartHeight;
      return `${x},${y}`;
    })
    .join(' ');

  const areaPoints = `0,${chartHeight} ${points} ${chartWidth},${chartHeight}`;

  const priceChange = priceHistory[priceHistory.length - 1].price - priceHistory[0].price;
  const priceChangePercent = ((priceChange / priceHistory[0].price) * 100).toFixed(1);
  const isPositive = priceChange >= 0;

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Price History</h3>
          <div className="text-right">
            <span
              className={`text-lg font-bold ${
                isPositive ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {isPositive ? '+' : ''}
              {priceChange}¢ ({isPositive ? '+' : ''}
              {priceChangePercent}%)
            </span>
            <p className="text-xs text-slate-500">30 day change</p>
          </div>
        </div>
      </div>

      <div className="p-4">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="w-full h-48"
          preserveAspectRatio="none"
        >
          {/* Gradient fill */}
          <defs>
            <linearGradient id={`gradient-${marketId}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop
                offset="0%"
                stopColor={isPositive ? '#10b981' : '#ef4444'}
                stopOpacity="0.3"
              />
              <stop
                offset="100%"
                stopColor={isPositive ? '#10b981' : '#ef4444'}
                stopOpacity="0"
              />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map((percent) => (
            <line
              key={percent}
              x1="0"
              y1={(percent / 100) * chartHeight}
              x2={chartWidth}
              y2={(percent / 100) * chartHeight}
              stroke="#334155"
              strokeWidth="0.5"
            />
          ))}

          {/* Area under the line */}
          <polygon
            points={areaPoints}
            fill={`url(#gradient-${marketId})`}
          />

          {/* Price line */}
          <polyline
            points={points}
            fill="none"
            stroke={isPositive ? '#10b981' : '#ef4444'}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Current price dot */}
          <circle
            cx={chartWidth}
            cy={chartHeight - ((currentPrice - minPrice) / priceRange) * chartHeight}
            r="3"
            fill={isPositive ? '#10b981' : '#ef4444'}
          />
        </svg>

        {/* X-axis labels */}
        <div className="flex justify-between mt-2 text-xs text-slate-500">
          <span>30d ago</span>
          <span>15d ago</span>
          <span>Today</span>
        </div>
      </div>

      {/* Price labels */}
      <div className="px-4 pb-4 flex justify-between text-xs text-slate-500">
        <span>Low: {minPrice}¢</span>
        <span>High: {maxPrice}¢</span>
      </div>
    </div>
  );
}
