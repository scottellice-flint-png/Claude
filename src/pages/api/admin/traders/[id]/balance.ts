import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Check admin authentication - only super_admin and admin can adjust balance
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
      const { amountCents, type, reason } = req.body;

      // Validate inputs
      if (typeof amountCents !== 'number' || amountCents === 0) {
        return res.status(400).json({ error: 'Invalid amount' });
      }

      const validTypes = ['credit', 'debit', 'refund', 'bonus', 'correction'];
      if (!validTypes.includes(type)) {
        return res.status(400).json({ error: 'Invalid adjustment type' });
      }

      if (!reason?.trim()) {
        return res.status(400).json({ error: 'Reason is required for balance adjustments' });
      }

      // Get current user balance
      const user = await prisma.user.findUnique({
        where: { id },
        select: { balanceCents: true },
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const balanceBefore = user.balanceCents;
      const balanceAfter = balanceBefore + BigInt(amountCents);

      // Don't allow negative balance
      if (balanceAfter < BigInt(0)) {
        return res.status(400).json({ error: 'Adjustment would result in negative balance' });
      }

      // Use transaction to ensure consistency
      const result = await prisma.$transaction(async (tx) => {
        // Create balance adjustment record
        const adjustment = await tx.balanceAdjustment.create({
          data: {
            userId: id,
            adminUserId: session.user.id,
            amountCents: BigInt(amountCents),
            type,
            reason: reason.trim(),
            balanceBeforeCents: balanceBefore,
            balanceAfterCents: balanceAfter,
          },
        });

        // Update user balance
        const updatedUser = await tx.user.update({
          where: { id },
          data: {
            balanceCents: balanceAfter,
            // Also update legacy balance field for compatibility
            balance: Number(balanceAfter) / 100,
          },
        });

        // Create audit event
        await tx.auditEvent.create({
          data: {
            occurredAtMs: BigInt(Date.now()),
            eventType: 'USER_BALANCE_ADJUSTED',
            actorType: 'admin',
            actorId: session.user.id,
            beforeState: JSON.stringify({ balanceCents: balanceBefore.toString() }),
            afterState: JSON.stringify({ balanceCents: balanceAfter.toString() }),
            reasonCode: type.toUpperCase(),
            metadata: JSON.stringify({
              userId: id,
              adjustmentId: adjustment.id,
              amountCents,
              reason: reason.trim(),
            }),
          },
        });

        return { adjustment, updatedUser };
      });

      return res.status(200).json({
        success: true,
        newBalanceCents: result.updatedUser.balanceCents.toString(),
        adjustmentId: result.adjustment.id,
      });
    } catch (error) {
      console.error('Error adjusting balance:', error);
      return res.status(500).json({ error: 'Failed to adjust balance' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
