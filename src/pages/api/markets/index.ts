import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { category } = req.query;

    const where: Record<string, unknown> = {
      // Only show published markets on the public site
      status: { in: ['published', 'resolved', 'settled'] },
    };

    if (category && category !== 'all') {
      where.category = { slug: category as string };
    }

    const markets = await prisma.market.findMany({
      where,
      include: {
        category: true,
        subcategory: true,
        outcomes: { orderBy: { position: 'asc' } },
      },
      orderBy: { volume: 'desc' },
    });

    // Transform DB markets into the frontend Market shape
    const transformed = markets.map((m: Record<string, unknown>) => {
      const outcomes = m.outcomes as Array<Record<string, unknown>> | undefined;
      return {
        id: m.id,
        title: m.title,
        description: (m.shortDescription || m.description) as string,
        category: (m.category as Record<string, unknown>)?.slug as string,
        status: mapStatus(m.status as string),
        closeDate: (m.closesAt as Date).toISOString(),
        settlementDate: (m.settlesBy as Date).toISOString(),
        yesPrice: m.currentYesPrice,
        noPrice: m.currentNoPrice,
        volume: m.volume,
        liquidity: m.liquidity,
        createdAt: (m.createdAt as Date).toISOString(),
        icon: m.icon || undefined,
        isFeatured: m.isFeatured,
        outcomes: outcomes && outcomes.length > 0
          ? outcomes.map((o) => ({
              id: o.id as string,
              name: o.label as string,
              probability: o.currentPrice as number,
              yesPrice: o.currentPrice as number,
              noPrice: 100 - (o.currentPrice as number),
            }))
          : undefined,
      };
    });

    return res.status(200).json(transformed);
  } catch (error) {
    console.error('Error fetching markets:', error);
    return res.status(500).json({ error: 'Failed to fetch markets' });
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
