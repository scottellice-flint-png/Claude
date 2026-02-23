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
      const positions = await prisma.position.findMany({
        where: {
          userId: id,
          quantityCents: { not: 0 },
        },
        select: {
          id: true,
          outcomeId: true,
          quantityCents: true,
          avgPriceCents: true,
          outcome: {
            select: {
              label: true,
              market: {
                select: {
                  id: true,
                  title: true,
                  slug: true,
                  status: true,
                },
              },
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
      });

      // Define position type for mapping
      type PositionRecord = {
        id: string;
        outcomeId: string;
        quantityCents: number;
        avgPriceCents: number;
        outcome: {
          label: string;
          market: { id: string; title: string; slug: string; status: string };
        };
      };

      // Format positions with BigInt conversion
      const formattedPositions = positions.map((pos: PositionRecord) => ({
        id: pos.id,
        outcomeId: pos.outcomeId,
        side: pos.quantityCents > 0 ? 'long' : 'short',
        quantityCents: Math.abs(pos.quantityCents).toString(),
        avgPriceCents: pos.avgPriceCents,
        outcome: pos.outcome,
      }));

      return res.status(200).json({ data: formattedPositions });
    } catch (error) {
      console.error('Error fetching positions:', error);
      return res.status(500).json({ error: 'Failed to fetch positions' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
