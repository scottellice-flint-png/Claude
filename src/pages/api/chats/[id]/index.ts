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
  const chatId = req.query.id as string;

  // Check if user is a member of this chat
  const membership = await prisma.groupChatMember.findUnique({
    where: {
      chatId_userId: { chatId, userId },
    },
  });

  if (!membership) {
    return res.status(403).json({ error: 'Not a member of this chat' });
  }

  if (req.method === 'GET') {
    try {
      const chat = await prisma.groupChat.findUnique({
        where: { id: chatId },
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  displayName: true,
                  avatarUrl: true,
                },
              },
            },
          },
          createdBy: {
            select: {
              id: true,
              username: true,
            },
          },
        },
      });

      if (!chat) {
        return res.status(404).json({ error: 'Chat not found' });
      }

      // Update last read time
      await prisma.groupChatMember.update({
        where: { chatId_userId: { chatId, userId } },
        data: { lastReadAt: new Date() },
      });

      return res.status(200).json({
        id: chat.id,
        name: chat.name,
        description: chat.description,
        emoji: chat.emoji,
        inviteCode: chat.inviteCode,
        createdBy: chat.createdBy,
        members: chat.members.map((m: any) => ({
          id: m.user.id,
          username: m.user.username,
          displayName: m.user.displayName,
          avatarUrl: m.user.avatarUrl,
          isAdmin: m.isAdmin,
          isMuted: m.isMuted,
        })),
        isAdmin: membership.isAdmin,
        isMuted: membership.isMuted,
        createdAt: chat.createdAt,
      });
    } catch (error) {
      console.error('Error fetching chat:', error);
      return res.status(500).json({ error: 'Failed to fetch chat' });
    }
  }

  if (req.method === 'PUT' || req.method === 'PATCH') {
    // Update chat (admin only)
    if (!membership.isAdmin) {
      return res.status(403).json({ error: 'Only admins can update the chat' });
    }

    const { name, description, emoji } = req.body;

    try {
      const chat = await prisma.groupChat.update({
        where: { id: chatId },
        data: {
          ...(name && { name }),
          ...(description !== undefined && { description }),
          ...(emoji && { emoji }),
        },
      });

      return res.status(200).json({
        id: chat.id,
        name: chat.name,
        description: chat.description,
        emoji: chat.emoji,
      });
    } catch (error) {
      console.error('Error updating chat:', error);
      return res.status(500).json({ error: 'Failed to update chat' });
    }
  }

  if (req.method === 'DELETE') {
    // Delete chat (admin only)
    if (!membership.isAdmin) {
      return res.status(403).json({ error: 'Only admins can delete the chat' });
    }

    try {
      await prisma.groupChat.delete({
        where: { id: chatId },
      });

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error deleting chat:', error);
      return res.status(500).json({ error: 'Failed to delete chat' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
