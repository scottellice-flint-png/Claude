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

  if (req.method === 'GET') {
    try {
      const { search, accountStatus, riskLevel, kycStatus } = req.query;

      const where: Record<string, unknown> = {};

      // Filter by account status
      if (accountStatus && accountStatus !== 'all') {
        where.accountStatus = accountStatus;
      }

      // Filter by risk level
      if (riskLevel && riskLevel !== 'all') {
        where.riskLevel = riskLevel;
      }

      // Filter by KYC status
      if (kycStatus && kycStatus !== 'all') {
        where.kycStatus = kycStatus;
      }

      // Search by email, username, or name
      if (search && typeof search === 'string') {
        where.OR = [
          { email: { contains: search, mode: 'insensitive' } },
          { username: { contains: search, mode: 'insensitive' } },
          { displayName: { contains: search, mode: 'insensitive' } },
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
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
          // Financial data
          balance: true,
          balanceCents: true,
          totalProfit: true,
          totalProfitCents: true,
          totalTrades: true,
          totalVolume: true,
          totalVolumeCents: true,
          // Risk & Compliance
          riskScore: true,
          riskLevel: true,
          toxicFlowCount: true,
          isFlagged: true,
          flagReason: true,
          accountStatus: true,
          kycStatus: true,
          // Get last trade for "Last Market" column
          buyTrades: {
            select: {
              market: {
                select: {
                  id: true,
                  title: true,
                  slug: true,
                },
              },
              createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          sellTrades: {
            select: {
              market: {
                select: {
                  id: true,
                  title: true,
                  slug: true,
                },
              },
              createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      // Format the response with last market info
      const formattedTraders = traders.map((trader) => {
        // Determine the most recent trade (buy or sell)
        const lastBuy = trader.buyTrades[0];
        const lastSell = trader.sellTrades[0];
        let lastMarket = null;

        if (lastBuy && lastSell) {
          lastMarket = new Date(lastBuy.createdAt) > new Date(lastSell.createdAt)
            ? lastBuy.market
            : lastSell.market;
        } else if (lastBuy) {
          lastMarket = lastBuy.market;
        } else if (lastSell) {
          lastMarket = lastSell.market;
        }

        return {
          id: trader.id,
          email: trader.email,
          username: trader.username,
          firstName: trader.firstName,
          lastName: trader.lastName,
          displayName: trader.displayName,
          avatarUrl: trader.avatarUrl,
          isActive: trader.isActive,
          isVerified: trader.isVerified,
          lastLoginAt: trader.lastLoginAt,
          createdAt: trader.createdAt,
          // Financial
          balance: trader.balance,
          balanceCents: trader.balanceCents.toString(),
          totalProfit: trader.totalProfit,
          totalProfitCents: trader.totalProfitCents.toString(),
          totalTrades: trader.totalTrades,
          totalVolume: trader.totalVolume,
          totalVolumeCents: trader.totalVolumeCents.toString(),
          // Risk & Compliance
          riskScore: trader.riskScore,
          riskLevel: trader.riskLevel || 'low',
          toxicFlowCount: trader.toxicFlowCount || 0,
          isFlagged: trader.isFlagged,
          flagReason: trader.flagReason,
          accountStatus: trader.accountStatus || 'active',
          kycStatus: trader.kycStatus || 'pending',
          // Last Market
          lastMarketTitle: lastMarket?.title || null,
          lastMarketSlug: lastMarket?.slug || null,
        };
      });

      return res.status(200).json({ data: formattedTraders, total: formattedTraders.length });
    } catch (error) {
      console.error('Error fetching traders:', error);
      return res.status(500).json({ error: 'Failed to fetch traders' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
