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

  const currentUserId = session.user.id;
  const username = req.query.username as string;

  // Find the user to follow
  const targetUser = await prisma.user.findUnique({
    where: { username: username.toLowerCase() },
    select: { id: true },
  });

  if (!targetUser) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (targetUser.id === currentUserId) {
    return res.status(400).json({ error: 'Cannot follow yourself' });
  }

  if (req.method === 'POST') {
    // Follow user
    try {
      await prisma.userFollow.create({
        data: {
          followerId: currentUserId,
          followingId: targetUser.id,
        },
      });

      return res.status(200).json({ success: true, following: true });
    } catch (error: unknown) {
      if ((error as { code?: string }).code === 'P2002') {
        // Already following
        return res.status(200).json({ success: true, following: true });
      }
      console.error('Error following user:', error);
      return res.status(500).json({ error: 'Failed to follow user' });
    }
  }

  if (req.method === 'DELETE') {
    // Unfollow user
    try {
      await prisma.userFollow.delete({
        where: {
          followerId_followingId: {
            followerId: currentUserId,
            followingId: targetUser.id,
          },
        },
      });

      return res.status(200).json({ success: true, following: false });
    } catch (error: unknown) {
      if ((error as { code?: string }).code === 'P2025') {
        // Not following
        return res.status(200).json({ success: true, following: false });
      }
      console.error('Error unfollowing user:', error);
      return res.status(500).json({ error: 'Failed to unfollow user' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
