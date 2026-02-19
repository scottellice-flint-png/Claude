import { useMemo } from 'react';
import { MarketOutcome } from '@/types';

interface PriceChartProps {
  marketId: string;
  currentPrice: number;
  outcomes?: MarketOutcome[];
}

// Foremark brand colors for chart lines
const CHART_COLORS = [
  { line: '#0F4C4C', name: 'Teal' },      // foremark-green
  { line: '#C8E64C', name: 'Lime' },      // foremark-lime
  { line: '#6B7280', name: 'Gray' },      // gray-500
];

interface SeriesData {
  name: string;
  currentPrice: number;
  color: string;
  data: number[];
}

export default function PriceChart({ marketId, currentPrice, outcomes }: PriceChartProps) {
  // Generate price history data for each series
  const seriesData = useMemo(() => {
    const series: SeriesData[] = [];

    if (outcomes && outcomes.length > 0) {
      // Multi-outcome market
      outcomes.slice(0, 3).forEach((outcome, index) => {
        const data = generateStepData(outcome.probability, 30);
        series.push({
          name: outcome.name,
          currentPrice: outcome.probability,
          color: CHART_COLORS[index % CHART_COLORS.length].line,
          data,
        });
      });
    } else {
      // Single outcome market (Yes price)
      const data = generateStepData(currentPrice, 30);
      series.push({
        name: 'Yes',
        currentPrice,
        color: CHART_COLORS[0].line,
        data,
      });
    }

    return series;
  }, [marketId, currentPrice, outcomes]);

  // Generate date labels for x-axis
  const dateLabels = useMemo(() => {
    const labels = [];
    const now = new Date();
    for (let i = 4; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
      labels.push(date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }));
    }
    return labels;
  }, []);

  const chartWidth = 400;
  const chartHeight = 160;
  const paddingLeft = 0;
  const paddingRight = 50;
  const paddingTop = 10;
  const paddingBottom = 25;
  const graphWidth = chartWidth - paddingLeft - paddingRight;
  const graphHeight = chartHeight - paddingTop - paddingBottom;

  // Generate step line path for a series
  const generateStepPath = (data: number[]) => {
    if (data.length === 0) return '';

    const points: string[] = [];
    data.forEach((price, i) => {
      const x = paddingLeft + (i / (data.length - 1)) * graphWidth;
      const y = paddingTop + graphHeight - (price / 100) * graphHeight;

      if (i === 0) {
        points.push(`M ${x} ${y}`);
      } else {
        // Step line: horizontal then vertical
        const prevX = paddingLeft + ((i - 1) / (data.length - 1)) * graphWidth;
        points.push(`H ${x}`);
        points.push(`V ${y}`);
      }
    });

    return points.join(' ');
  };

  return (
    <div>
      {/* Chart */}
      <div>
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="w-full"
          style={{ height: '180px' }}
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Horizontal grid lines (dotted) */}
          {[0, 25, 50, 75, 100].map((pct) => {
            const y = paddingTop + graphHeight - (pct / 100) * graphHeight;
            return (
              <g key={pct}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={chartWidth - paddingRight}
                  y2={y}
                  stroke="#E5E7EB"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
                {/* Y-axis label on right */}
                <text
                  x={chartWidth - paddingRight + 8}
                  y={y + 4}
                  className="text-xs"
                  fill="#9CA3AF"
                >
                  {pct}%
                </text>
              </g>
            );
          })}

          {/* Step lines for each series */}
          {seriesData.map((series) => (
            <path
              key={series.name}
              d={generateStepPath(series.data)}
              fill="none"
              stroke={series.color}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}

          {/* End points with circles */}
          {seriesData.map((series) => {
            const lastPrice = series.data[series.data.length - 1];
            const x = chartWidth - paddingRight;
            const y = paddingTop + graphHeight - (lastPrice / 100) * graphHeight;
            return (
              <g key={`${series.name}-dot`}>
                {/* Outer circle (white border) */}
                <circle
                  cx={x}
                  cy={y}
                  r="6"
                  fill="white"
                  stroke={series.color}
                  strokeWidth="2"
                />
                {/* Inner filled circle */}
                <circle
                  cx={x}
                  cy={y}
                  r="4"
                  fill={series.color}
                />
              </g>
            );
          })}

          {/* X-axis date labels */}
          {dateLabels.map((label, i) => {
            const x = paddingLeft + (i / (dateLabels.length - 1)) * graphWidth;
            return (
              <text
                key={label}
                x={x}
                y={chartHeight - 5}
                className="text-xs"
                fill="#9CA3AF"
                textAnchor="middle"
              >
                {label}
              </text>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

// Generate step-style price data that ends at target price
function generateStepData(targetPrice: number, numPoints: number): number[] {
  const data: number[] = [];
  let price = targetPrice - 15 + Math.random() * 10;

  for (let i = 0; i < numPoints - 1; i++) {
    // Random step changes (sometimes no change for flat sections)
    if (Math.random() > 0.3) {
      const drift = (targetPrice - price) * 0.05;
      const step = (Math.random() - 0.45) * 8;
      price = Math.max(5, Math.min(95, price + drift + step));
    }
    data.push(Math.round(price));
  }

  // Ensure last point is the current price
  data.push(targetPrice);

  return data;
}
