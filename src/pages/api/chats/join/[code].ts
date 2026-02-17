import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);

  if (!session || session.user.userType !== 'user') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = session.user.id;
  const inviteCode = req.query.code as string;

  try {
    // Find chat by invite code
    const chat = await prisma.groupChat.findUnique({
      where: { inviteCode },
      include: {
        members: true,
      },
    });

    if (!chat) {
      return res.status(404).json({ error: 'Invalid invite code' });
    }

    if (!chat.isActive) {
      return res.status(400).json({ error: 'This chat is no longer active' });
    }

    // Check if already a member
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existingMembership = chat.members.find((m: any) => m.userId === userId);
    if (existingMembership) {
      return res.status(200).json({
        message: 'Already a member',
        chatId: chat.id,
      });
    }

    // Check member limit
    if (chat.members.length >= chat.maxMembers) {
      return res.status(400).json({ error: 'This chat has reached its member limit' });
    }

    // Add user to chat
    await prisma.groupChatMember.create({
      data: {
        chatId: chat.id,
        userId,
        isAdmin: false,
      },
    });

    // Send a system message
    await prisma.chatMessage.create({
      data: {
        chatId: chat.id,
        senderId: userId,
        content: 'joined the chat',
      },
    });

    return res.status(200).json({
      message: 'Successfully joined the chat',
      chatId: chat.id,
    });
  } catch (error) {
    console.error('Error joining chat:', error);
    return res.status(500).json({ error: 'Failed to join chat' });
  }
}
