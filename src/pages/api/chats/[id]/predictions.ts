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
    const limit = parseInt(req.query.limit as string) || 20;

    try {
      const predictions = await prisma.sharedPrediction.findMany({
        where: { chatId },
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
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      return res.status(200).json({
        predictions: predictions.map((p: any) => ({
          id: p.id,
          userId: p.user.id,
          username: p.user.displayName || p.user.username,
          userAvatar: p.user.avatarUrl,
          market: p.market,
          position: p.position,
          amount: p.amount,
          description: p.description,
          timestamp: p.createdAt,
        })),
      });
    } catch (error) {
      console.error('Error fetching predictions:', error);
      return res.status(500).json({ error: 'Failed to fetch predictions' });
    }
  }

  if (req.method === 'POST') {
    const { market, position, amount, description } = req.body;

    if (!market || !position || !amount) {
      return res.status(400).json({ error: 'Market, position, and amount are required' });
    }

    if (!['Yes', 'No'].includes(position)) {
      return res.status(400).json({ error: 'Position must be Yes or No' });
    }

    try {
      const prediction = await prisma.sharedPrediction.create({
        data: {
          chatId,
          userId,
          market,
          position,
          amount: parseFloat(amount),
          description: description || null,
        },
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
      });

      // Also create a message with this prediction
      await prisma.chatMessage.create({
        data: {
          chatId,
          senderId: userId,
          content: `Shared a prediction: ${position} on "${market}" for $${amount}`,
          predictionId: prediction.id,
        },
      });

      // Update chat's updatedAt
      await prisma.groupChat.update({
        where: { id: chatId },
        data: { updatedAt: new Date() },
      });

      return res.status(201).json({
        id: prediction.id,
        userId: prediction.user.id,
        username: prediction.user.displayName || prediction.user.username,
        userAvatar: prediction.user.avatarUrl,
        market: prediction.market,
        position: prediction.position,
        amount: prediction.amount,
        description: prediction.description,
        timestamp: prediction.createdAt,
      });
    } catch (error) {
      console.error('Error sharing prediction:', error);
      return res.status(500).json({ error: 'Failed to share prediction' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
