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
      const adjustments = await prisma.balanceAdjustment.findMany({
        where: { userId: id },
        select: {
          id: true,
          amountCents: true,
          type: true,
          reason: true,
          balanceBeforeCents: true,
          balanceAfterCents: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      // Define adjustment type for mapping
      type AdjustmentRecord = {
        id: string;
        amountCents: bigint;
        type: string;
        reason: string;
        balanceBeforeCents: bigint;
        balanceAfterCents: bigint;
        createdAt: Date;
      };

      // Convert BigInt fields to strings
      const formattedAdjustments = adjustments.map((adj: AdjustmentRecord) => ({
        id: adj.id,
        amountCents: adj.amountCents.toString(),
        type: adj.type,
        reason: adj.reason,
        balanceBeforeCents: adj.balanceBeforeCents.toString(),
        balanceAfterCents: adj.balanceAfterCents.toString(),
        createdAt: adj.createdAt,
      }));

      return res.status(200).json({ data: formattedAdjustments });
    } catch (error) {
      console.error('Error fetching adjustments:', error);
      return res.status(500).json({ error: 'Failed to fetch adjustments' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
