import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';

type TimeFilter = 'weekly' | 'monthly' | 'all-time';
type LeaderboardType = 'profit' | 'volume' | 'predictions';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const timeFilter = (req.query.time as TimeFilter) || 'all-time';
  const type = (req.query.type as LeaderboardType) || 'profit';
  const limit = parseInt(req.query.limit as string) || 10;

  try {
    // Determine date filter
    let dateFilter: Date | undefined;
    const now = new Date();

    if (timeFilter === 'weekly') {
      dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (timeFilter === 'monthly') {
      dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Determine sort field
    let orderBy: Record<string, 'desc'>;
    if (type === 'profit') {
      orderBy = { totalProfit: 'desc' };
    } else if (type === 'volume') {
      orderBy = { totalVolume: 'desc' };
    } else {
      orderBy = { totalTrades: 'desc' };
    }

    // Fetch users
    const users = await prisma.user.findMany({
      where: {
        isActive: true,
        ...(dateFilter && {
          updatedAt: { gte: dateFilter },
        }),
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        totalProfit: true,
        totalVolume: true,
        totalTrades: true,
        isVerified: true,
      },
      orderBy,
      take: limit,
    });

    // Format response
    const leaders = users.map((user: any, index: number) => {
      let value: number;
      if (type === 'profit') {
        value = user.totalProfit;
      } else if (type === 'volume') {
        value = user.totalVolume;
      } else {
        value = user.totalTrades;
      }

      return {
        rank: index + 1,
        id: user.id,
        username: user.displayName || user.username,
        avatarUrl: user.avatarUrl,
        value,
        badge: index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? 'bronze' : user.isVerified ? 'verified' : undefined,
      };
    });

    // Calculate time remaining for weekly/monthly
    let timeRemaining = null;
    if (timeFilter === 'weekly') {
      const nextSunday = new Date();
      nextSunday.setDate(nextSunday.getDate() + (7 - nextSunday.getDay()));
      nextSunday.setHours(23, 59, 59, 999);
      timeRemaining = nextSunday.getTime() - now.getTime();
    } else if (timeFilter === 'monthly') {
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      timeRemaining = nextMonth.getTime() - now.getTime();
    }

    return res.status(200).json({
      type,
      timeFilter,
      leaders,
      timeRemaining,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
}
