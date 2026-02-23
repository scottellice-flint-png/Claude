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
      const sessions = await prisma.userSession.findMany({
        where: { userId: id },
        select: {
          id: true,
          ipAddress: true,
          deviceFingerprint: true,
          userAgent: true,
          country: true,
          city: true,
          createdAt: true,
          lastActiveAt: true,
          isActive: true,
        },
        orderBy: { lastActiveAt: 'desc' },
        take: 50,
      });

      return res.status(200).json({ data: sessions });
    } catch (error) {
      console.error('Error fetching sessions:', error);
      return res.status(500).json({ error: 'Failed to fetch sessions' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
