import type { NextApiRequest, NextApiResponse } from 'next';
import { isDatabaseAvailable, getMockMarket, getMockMarketComments, getMockMarketRules } from '@/lib/dbFallback';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id, include } = req.query;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Market ID is required' });
  }

  try {
    const dbAvailable = await isDatabaseAvailable();
    const includeComments = include === 'comments' || include === 'all';
    const includeRules = include === 'rules' || include === 'all';

    if (dbAvailable) {
      const prisma = (await import('@/lib/prisma')).default;

      const market = await prisma.market.findUnique({
        where: { id },
        include: {
          category: true,
          subcategory: true,
          outcomes: { orderBy: { position: 'asc' } },
        },
      });

      if (!market) {
        return res.status(404).json({ error: 'Market not found' });
      }

      const transformed = {
        id: market.id,
        title: market.title,
        description: market.description,
        shortDescription: market.shortDescription,
        category: market.category?.slug,
        status: mapStatus(market.status),
        closeDate: market.closesAt?.toISOString(),
        settlementDate: market.settlesBy?.toISOString(),
        yesPrice: market.currentYesPrice,
        noPrice: market.currentNoPrice,
        volume: market.volume,
        liquidity: market.liquidity,
        createdAt: market.createdAt.toISOString(),
        icon: market.icon,
        heroImageUrl: market.heroImageUrl,
        cardImageUrl: market.cardImageUrl,
        isFeatured: market.isFeatured,
        outcomes: market.outcomes?.map((o) => ({
          id: o.id,
          name: o.label,
          probability: o.currentPrice,
          yesPrice: o.currentPrice,
          noPrice: 100 - o.currentPrice,
          imageUrl: o.imageUrl,
        })),
      };

      return res.status(200).json({
        market: transformed,
        source: 'database',
      });
    }

    // Fallback to mock data
    const market = getMockMarket(id);

    if (!market) {
      return res.status(404).json({ error: 'Market not found' });
    }

    const response: Record<string, unknown> = {
      market,
      source: 'mock',
    };

    if (includeComments) {
      response.comments = getMockMarketComments(id);
    }

    if (includeRules) {
      response.rules = getMockMarketRules(id);
    }

    return res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching market:', error);

    // Try mock fallback
    try {
      const market = getMockMarket(id);
      if (market) {
        return res.status(200).json({
          market,
          source: 'mock-fallback',
        });
      }
    } catch {
      // Ignore
    }

    return res.status(500).json({ error: 'Failed to fetch market' });
  }
}

function mapStatus(dbStatus: string): 'open' | 'closed' | 'settled' {
  switch (dbStatus) {
    case 'published':
      return 'open';
    case 'resolved':
    case 'trading_halted':
      return 'closed';
    case 'settled':
    case 'archived':
      return 'settled';
    default:
      return 'open';
  }
}
