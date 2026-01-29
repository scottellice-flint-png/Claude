import type { NextApiRequest, NextApiResponse } from 'next';
import { Market } from '@/types';

// In-memory store (in production, use a real database)
const markets: Market[] = [
  {
    id: '1',
    title: 'Will Bitcoin exceed $100,000 by end of 2026?',
    description: 'This market will resolve to Yes if the price of Bitcoin (BTC) exceeds $100,000 USD on any major exchange before December 31, 2026 11:59 PM ET.',
    category: 'crypto',
    status: 'open',
    closeDate: '2026-12-31T23:59:00Z',
    settlementDate: '2027-01-02T12:00:00Z',
    yesPrice: 67,
    noPrice: 33,
    volume: 2450000,
    liquidity: 890000,
    createdAt: '2024-01-15T10:00:00Z',
  },
  {
    id: '2',
    title: 'Will the Federal Reserve cut rates in Q1 2026?',
    description: 'This market resolves to Yes if the Federal Reserve announces a rate cut during Q1 2026 (January 1 - March 31).',
    category: 'economics',
    status: 'open',
    closeDate: '2026-03-31T23:59:00Z',
    settlementDate: '2026-04-01T12:00:00Z',
    yesPrice: 42,
    noPrice: 58,
    volume: 1890000,
    liquidity: 650000,
    createdAt: '2024-02-01T14:30:00Z',
  },
];

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    const { category } = req.query;
    let filteredMarkets = markets;

    if (category && category !== 'all') {
      filteredMarkets = markets.filter(m => m.category === category);
    }

    return res.status(200).json(filteredMarkets);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
