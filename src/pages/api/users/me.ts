import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);

  if (!session || session.user.userType !== 'user') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = session.user.id;

  if (req.method === 'GET') {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          displayName: true,
          avatarUrl: true,
          isVerified: true,
          balance: true,
          totalProfit: true,
          totalTrades: true,
          totalVolume: true,
          createdAt: true,
          _count: {
            select: {
              followers: true,
              following: true,
              chatMemberships: true,
            },
          },
        },
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      return res.status(200).json({
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        isVerified: user.isVerified,
        balance: user.balance,
        totalProfit: user.totalProfit,
        totalTrades: user.totalTrades,
        totalVolume: user.totalVolume,
        createdAt: user.createdAt,
        followersCount: user._count.followers,
        followingCount: user._count.following,
        chatsCount: user._count.chatMemberships,
      });
    } catch (error) {
      console.error('Error fetching user:', error);
      return res.status(500).json({ error: 'Failed to fetch user' });
    }
  }

  if (req.method === 'PUT' || req.method === 'PATCH') {
    const { displayName, avatarUrl, firstName, lastName } = req.body;

    try {
      const user = await prisma.user.update({
        where: { id: userId },
        data: {
          ...(displayName !== undefined && { displayName }),
          ...(avatarUrl !== undefined && { avatarUrl }),
          ...(firstName !== undefined && { firstName }),
          ...(lastName !== undefined && { lastName }),
        },
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
          firstName: true,
          lastName: true,
        },
      });

      return res.status(200).json(user);
    } catch (error) {
      console.error('Error updating user:', error);
      return res.status(500).json({ error: 'Failed to update user' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
