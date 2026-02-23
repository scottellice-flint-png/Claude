import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Check admin authentication - only super_admin and admin can set limits
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.role || !['super_admin', 'admin'].includes(session.user.role)) {
    return res.status(401).json({ error: 'Unauthorized - Admin access required' });
  }

  const { id } = req.query;

  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid user ID' });
  }

  if (req.method === 'POST') {
    try {
      const { customMaxBetCents, sharpShieldTierOverride } = req.body;

      // Get current user state for audit
      const user = await prisma.user.findUnique({
        where: { id },
        select: {
          customMaxBetCents: true,
          sharpShieldTierOverride: true,
        },
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Validate tier override if provided
      if (sharpShieldTierOverride !== null && sharpShieldTierOverride !== undefined) {
        if (![0, 1, 2, 3].includes(sharpShieldTierOverride)) {
          return res.status(400).json({ error: 'Invalid tier override (must be 0-3 or null)' });
        }
      }

      // Validate custom max bet if provided
      if (customMaxBetCents !== null && customMaxBetCents !== undefined) {
        if (typeof customMaxBetCents !== 'number' || customMaxBetCents < 0) {
          return res.status(400).json({ error: 'Invalid custom max bet' });
        }
      }

      // Update user limits
      const updatedUser = await prisma.user.update({
        where: { id },
        data: {
          customMaxBetCents: customMaxBetCents !== null && customMaxBetCents !== undefined
            ? BigInt(customMaxBetCents)
            : null,
          sharpShieldTierOverride: sharpShieldTierOverride !== null && sharpShieldTierOverride !== undefined
            ? sharpShieldTierOverride
            : null,
        },
      });

      // Create audit event
      await prisma.auditEvent.create({
        data: {
          occurredAtMs: BigInt(Date.now()),
          eventType: 'USER_LIMITS_CHANGED',
          actorType: 'admin',
          actorId: session.user.id,
          beforeState: JSON.stringify({
            customMaxBetCents: user.customMaxBetCents?.toString() || null,
            sharpShieldTierOverride: user.sharpShieldTierOverride,
          }),
          afterState: JSON.stringify({
            customMaxBetCents: updatedUser.customMaxBetCents?.toString() || null,
            sharpShieldTierOverride: updatedUser.sharpShieldTierOverride,
          }),
          reasonCode: 'MANUAL_LIMIT_OVERRIDE',
          metadata: JSON.stringify({ userId: id }),
        },
      });

      return res.status(200).json({
        success: true,
        customMaxBetCents: updatedUser.customMaxBetCents?.toString() || null,
        sharpShieldTierOverride: updatedUser.sharpShieldTierOverride,
      });
    } catch (error) {
      console.error('Error updating limits:', error);
      return res.status(500).json({ error: 'Failed to update limits' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
