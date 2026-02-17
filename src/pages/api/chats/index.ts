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

  if (req.method === 'GET') {
    // Get all chats for the current user
    try {
      const memberships = await prisma.groupChatMember.findMany({
        where: { userId },
        include: {
          chat: {
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
              messages: {
                orderBy: { createdAt: 'desc' },
                take: 1,
                include: {
                  sender: {
                    select: {
                      id: true,
                      username: true,
                    },
                  },
                },
              },
              _count: {
                select: {
                  messages: {
                    where: {
                      createdAt: {
                        gt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
                      },
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: {
          chat: {
            updatedAt: 'desc',
          },
        },
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const chats = memberships.map((membership: any) => {
        const lastMessage = membership.chat.messages[0];
        const unreadCount = lastMessage && lastMessage.createdAt > membership.lastReadAt ? 1 : 0;

        return {
          id: membership.chat.id,
          name: membership.chat.name,
          description: membership.chat.description,
          emoji: membership.chat.emoji,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          members: membership.chat.members.map((m: any) => ({
            id: m.user.id,
            username: m.user.username,
            displayName: m.user.displayName,
            avatarUrl: m.user.avatarUrl,
            isAdmin: m.isAdmin,
          })),
          lastMessage: lastMessage?.content,
          lastMessageTime: lastMessage?.createdAt,
          lastMessageSender: lastMessage?.sender.username,
          unreadCount,
          isAdmin: membership.isAdmin,
          isMuted: membership.isMuted,
          inviteCode: membership.chat.inviteCode,
        };
      });

      return res.status(200).json({ chats });
    } catch (error) {
      console.error('Error fetching chats:', error);
      return res.status(500).json({ error: 'Failed to fetch chats' });
    }
  }

  if (req.method === 'POST') {
    // Create a new chat
    const { name, description, emoji, memberIds } = req.body;

    if (!name || name.length < 1 || name.length > 50) {
      return res.status(400).json({ error: 'Chat name must be between 1 and 50 characters' });
    }

    try {
      const chat = await prisma.groupChat.create({
        data: {
          name,
          description: description || null,
          emoji: emoji || '💬',
          createdById: userId,
          members: {
            create: [
              { userId, isAdmin: true }, // Creator is always admin
              ...(memberIds || []).map((id: string) => ({ userId: id })),
            ],
          },
        },
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
        },
      });

      return res.status(201).json({
        id: chat.id,
        name: chat.name,
        description: chat.description,
        emoji: chat.emoji,
        inviteCode: chat.inviteCode,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        members: chat.members.map((m: any) => ({
          id: m.user.id,
          username: m.user.username,
          displayName: m.user.displayName,
          avatarUrl: m.user.avatarUrl,
          isAdmin: m.isAdmin,
        })),
      });
    } catch (error) {
      console.error('Error creating chat:', error);
      return res.status(500).json({ error: 'Failed to create chat' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
