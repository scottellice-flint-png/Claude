import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const username = req.query.username as string;

  try {
    const user = await prisma.user.findUnique({
      where: { username: username.toLowerCase() },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        isVerified: true,
        totalProfit: true,
        totalTrades: true,
        totalVolume: true,
        createdAt: true,
        _count: {
          select: {
            followers: true,
            following: true,
          },
        },
      },
    });

    if (!user || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if current user follows this user
    const session = await getServerSession(req, res, authOptions);
    let isFollowing = false;

    if (session && session.user.userType === 'user') {
      const follow = await prisma.userFollow.findUnique({
        where: {
          followerId_followingId: {
            followerId: session.user.id,
            followingId: user.id,
          },
        },
      });
      isFollowing = !!follow;
    }

    return res.status(200).json({
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      isVerified: user.isVerified,
      totalProfit: user.totalProfit,
      totalTrades: user.totalTrades,
      totalVolume: user.totalVolume,
      createdAt: user.createdAt,
      followersCount: user._count.followers,
      followingCount: user._count.following,
      isFollowing,
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    return res.status(500).json({ error: 'Failed to fetch user' });
  }
}
