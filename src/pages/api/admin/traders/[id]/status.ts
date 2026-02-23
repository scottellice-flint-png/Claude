import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Check admin authentication - only admins can change status
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.role || !['super_admin', 'admin', 'operator'].includes(session.user.role)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.query;

  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid user ID' });
  }

  if (req.method === 'POST') {
    try {
      const { status, reason } = req.body;

      // Validate status
      const validStatuses = ['active', 'frozen', 'suspended', 'banned'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }

      // Require reason for non-active status changes
      if (status !== 'active' && !reason?.trim()) {
        return res.status(400).json({ error: 'Reason is required for status changes' });
      }

      // Get current user state
      const user = await prisma.user.findUnique({
        where: { id },
        select: { accountStatus: true },
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Update user status
      const updatedUser = await prisma.user.update({
        where: { id },
        data: {
          accountStatus: status,
          statusReason: reason?.trim() || null,
          statusChangedAt: new Date(),
          statusChangedBy: session.user.id,
        },
      });

      // Create audit event
      await prisma.auditEvent.create({
        data: {
          occurredAtMs: BigInt(Date.now()),
          eventType: 'USER_STATUS_CHANGED',
          actorType: 'admin',
          actorId: session.user.id,
          beforeState: JSON.stringify({ accountStatus: user.accountStatus }),
          afterState: JSON.stringify({ accountStatus: status }),
          reasonCode: reason?.trim() || 'STATUS_CHANGE',
          metadata: JSON.stringify({ userId: id }),
        },
      });

      return res.status(200).json({ success: true, accountStatus: updatedUser.accountStatus });
    } catch (error) {
      console.error('Error updating status:', error);
      return res.status(500).json({ error: 'Failed to update status' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
