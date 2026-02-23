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
      const user = await prisma.user.findUnique({
        where: { id },
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
          // Financial
          balanceCents: true,
          lockedBalanceCents: true,
          totalProfitCents: true,
          totalTrades: true,
          totalVolumeCents: true,
          totalTakerFeesPaidCents: true,
          totalMakerRebatesEarnedCents: true,
          netFeesCents: true,
          // Risk
          riskScore: true,
          riskLevel: true,
          toxicFlowCount: true,
          isFlagged: true,
          flagReason: true,
          accountStatus: true,
          statusReason: true,
          customMaxBetCents: true,
          sharpShieldTierOverride: true,
          // KYC
          kycStatus: true,
          kycProvider: true,
          kycVerifiedAt: true,
          kycReferenceId: true,
          kycDocumentType: true,
          kycExpiresAt: true,
          // Responsible Gambling
          depositLimitCents: true,
          depositLimitPeriod: true,
          selfExclusionUntil: true,
          coolingOffUntil: true,
          // Session
          lastIpAddress: true,
          lastDeviceFingerprint: true,
          lastUserAgent: true,
        },
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Convert BigInt fields to strings
      const formattedUser = {
        ...user,
        balanceCents: user.balanceCents.toString(),
        lockedBalanceCents: user.lockedBalanceCents.toString(),
        totalProfitCents: user.totalProfitCents.toString(),
        totalVolumeCents: user.totalVolumeCents.toString(),
        totalTakerFeesPaidCents: user.totalTakerFeesPaidCents.toString(),
        totalMakerRebatesEarnedCents: user.totalMakerRebatesEarnedCents.toString(),
        netFeesCents: user.netFeesCents.toString(),
        customMaxBetCents: user.customMaxBetCents?.toString() || null,
        depositLimitCents: user.depositLimitCents?.toString() || null,
      };

      return res.status(200).json(formattedUser);
    } catch (error) {
      console.error('Error fetching user:', error);
      return res.status(500).json({ error: 'Failed to fetch user' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
