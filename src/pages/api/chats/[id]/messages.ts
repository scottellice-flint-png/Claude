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
    const limit = parseInt(req.query.limit as string) || 50;
    const before = req.query.before as string;

    try {
      const messages = await prisma.chatMessage.findMany({
        where: {
          chatId,
          ...(before && { createdAt: { lt: new Date(before) } }),
        },
        include: {
          sender: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
          prediction: true,
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      // Update last read time
      await prisma.groupChatMember.update({
        where: { chatId_userId: { chatId, userId } },
        data: { lastReadAt: new Date() },
      });

      return res.status(200).json({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        messages: messages.reverse().map((m: any) => ({
          id: m.id,
          senderId: m.sender.id,
          senderName: m.sender.displayName || m.sender.username,
          senderAvatar: m.sender.avatarUrl,
          content: m.content,
          timestamp: m.createdAt,
          isPinned: m.isPinned,
          prediction: m.prediction
            ? {
                id: m.prediction.id,
                market: m.prediction.market,
                position: m.prediction.position,
                amount: m.prediction.amount,
                description: m.prediction.description,
              }
            : undefined,
        })),
      });
    } catch (error) {
      console.error('Error fetching messages:', error);
      return res.status(500).json({ error: 'Failed to fetch messages' });
    }
  }

  if (req.method === 'POST') {
    const { content, predictionId } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    try {
      const message = await prisma.chatMessage.create({
        data: {
          chatId,
          senderId: userId,
          content: content.trim(),
          predictionId: predictionId || null,
        },
        include: {
          sender: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
          prediction: true,
        },
      });

      // Update chat's updatedAt
      await prisma.groupChat.update({
        where: { id: chatId },
        data: { updatedAt: new Date() },
      });

      return res.status(201).json({
        id: message.id,
        senderId: message.sender.id,
        senderName: message.sender.displayName || message.sender.username,
        senderAvatar: message.sender.avatarUrl,
        content: message.content,
        timestamp: message.createdAt,
        isPinned: message.isPinned,
        prediction: message.prediction
          ? {
              id: message.prediction.id,
              market: message.prediction.market,
              position: message.prediction.position,
              amount: message.prediction.amount,
              description: message.prediction.description,
            }
          : undefined,
      });
    } catch (error) {
      console.error('Error sending message:', error);
      return res.status(500).json({ error: 'Failed to send message' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
