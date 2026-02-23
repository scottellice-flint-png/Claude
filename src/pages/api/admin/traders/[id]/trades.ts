import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Check admin authentication
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.role || !['super_admin', 'admin', 'operator', 'viewer'].includes(session.user.role)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.query;

  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid user ID' });
  }

  if (req.method === 'GET') {
    try {
      // Get trades where user is buyer or seller
      const [buyTrades, sellTrades] = await Promise.all([
        prisma.trade.findMany({
          where: { buyerId: id },
          select: {
            id: true,
            priceCents: true,
            quantityCents: true,
            executedAt: true,
            market: {
              select: {
                id: true,
                title: true,
                slug: true,
              },
            },
          },
          orderBy: { executedAt: 'desc' },
          take: 100,
        }),
        prisma.trade.findMany({
          where: { sellerId: id },
          select: {
            id: true,
            priceCents: true,
            quantityCents: true,
            executedAt: true,
            market: {
              select: {
                id: true,
                title: true,
                slug: true,
              },
            },
          },
          orderBy: { executedAt: 'desc' },
          take: 100,
        }),
      ]);

      // Define trade type for mapping
      type TradeRecord = {
        id: string;
        priceCents: number;
        quantityCents: number;
        executedAt: Date;
        market: { id: string; title: string; slug: string };
      };

      // Combine and format trades
      const allTrades = [
        ...buyTrades.map((t: TradeRecord) => ({
          id: t.id,
          side: 'BID',
          priceCents: t.priceCents,
          quantityCents: t.quantityCents,
          createdAt: t.executedAt,
          market: t.market,
        })),
        ...sellTrades.map((t: TradeRecord) => ({
          id: t.id,
          side: 'ASK',
          priceCents: t.priceCents,
          quantityCents: t.quantityCents,
          createdAt: t.executedAt,
          market: t.market,
        })),
      ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      return res.status(200).json({ data: allTrades.slice(0, 100) });
    } catch (error) {
      console.error('Error fetching trades:', error);
      return res.status(500).json({ error: 'Failed to fetch trades' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
