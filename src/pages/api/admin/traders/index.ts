import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]';
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

  if (req.method === 'GET') {
    try {
      const { search, isActive } = req.query;

      const where: Record<string, unknown> = {};

      // Filter by active status
      if (isActive === 'true') {
        where.isActive = true;
      } else if (isActive === 'false') {
        where.isActive = false;
      }

      // Search by email or username
      if (search && typeof search === 'string') {
        where.OR = [
          { email: { contains: search, mode: 'insensitive' } },
          { username: { contains: search, mode: 'insensitive' } },
          { displayName: { contains: search, mode: 'insensitive' } },
        ];
      }

      const traders = await prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          displayName: true,
          avatarUrl: true,
          isActive: true,
          isVerified: true,
          lastLoginAt: true,
          createdAt: true,
          balance: true,
          totalProfit: true,
          totalTrades: true,
          totalVolume: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      return res.status(200).json({ data: traders, total: traders.length });
    } catch (error) {
      console.error('Error fetching traders:', error);
      return res.status(500).json({ error: 'Failed to fetch traders' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
