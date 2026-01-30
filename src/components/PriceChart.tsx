import { useMemo } from 'react';

interface PriceChartProps {
  marketId: string;
  currentPrice: number;
}

export default function PriceChart({ marketId, currentPrice }: PriceChartProps) {
  const priceHistory = useMemo(() => {
    const data = [];
    let price = currentPrice - 10 + Math.random() * 5;
    const now = Date.now();

    for (let i = 30; i >= 0; i--) {
      const drift = (currentPrice - price) * 0.1;
      const noise = (Math.random() - 0.5) * 5;
      price = Math.max(1, Math.min(99, price + drift + noise));

      data.push({
        timestamp: new Date(now - i * 24 * 60 * 60 * 1000).toISOString(),
        price: Math.round(price),
      });
    }

    data[data.length - 1].price = currentPrice;
    return data;
  }, [marketId, currentPrice]);

  const minPrice = Math.min(...priceHistory.map((p) => p.price));
  const maxPrice = Math.max(...priceHistory.map((p) => p.price));
  const priceRange = maxPrice - minPrice || 10;

  const chartHeight = 150;
  const chartWidth = 100;

  const points = priceHistory
    .map((point, i) => {
      const x = (i / (priceHistory.length - 1)) * chartWidth;
      const y = chartHeight - ((point.price - minPrice) / priceRange) * chartHeight;
      return `${x},${y}`;
    })
    .join(' ');

  const areaPoints = `0,${chartHeight} ${points} ${chartWidth},${chartHeight}`;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="p-4">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="w-full h-40"
          preserveAspectRatio="none"
        >
          {/* Gradient fill */}
          <defs>
            <linearGradient id={`gradient-${marketId}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#0F4C4C" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#0F4C4C" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Area under the line */}
          <polygon points={areaPoints} fill={`url(#gradient-${marketId})`} />

          {/* Price line */}
          <polyline
            points={points}
            fill="none"
            stroke="#0F4C4C"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Current price dot */}
          <circle
            cx={chartWidth}
            cy={chartHeight - ((currentPrice - minPrice) / priceRange) * chartHeight}
            r="4"
            fill="#0F4C4C"
          />
        </svg>
      </div>
    </div>
  );
}
