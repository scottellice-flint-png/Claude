import type { NextApiRequest, NextApiResponse } from 'next';
import { Market } from '@/types';

// Sample markets for API (main data is in Zustand store)
const markets: Market[] = [
  {
    id: '1',
    title: 'Who will win the next Australian Federal Election?',
    description: 'This market resolves to Yes if the Australian Labor Party wins the next Federal Election.',
    category: 'politics',
    status: 'open',
    closeDate: '2026-05-21T18:00:00+10:00',
    settlementDate: '2026-05-25T12:00:00+10:00',
    yesPrice: 52,
    noPrice: 48,
    volume: 2450000,
    liquidity: 890000,
    createdAt: '2025-01-15T10:00:00+10:00',
  },
  {
    id: '10',
    title: 'Will the RBA raise the cash rate at the Feb 2026 meeting?',
    description: 'Resolves Yes if the Reserve Bank of Australia announces a cash rate increase at the February 2026 monetary policy meeting.',
    category: 'economics',
    status: 'open',
    closeDate: '2026-02-17T14:30:00+11:00',
    settlementDate: '2026-02-18T12:00:00+11:00',
    yesPrice: 8,
    noPrice: 92,
    volume: 485000,
    liquidity: 178000,
    createdAt: '2025-01-08T09:00:00+11:00',
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
