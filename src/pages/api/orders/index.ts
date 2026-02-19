import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { writeAuditEvent } from '@/services/auditEventService';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'POST') {
    const { marketId, side, type, price, quantity, outcomeId } = req.body;

    // Validate input
    if (!marketId || !side || !type || !price || !quantity) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get user session for audit logging
    const session = await getServerSession(req, res, authOptions);
    const userId = session?.user?.id;
    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || 'unknown';
    const userAgent = req.headers['user-agent'];

    // In production, process order and match with order book
    const order = {
      id: `order-${Date.now()}`,
      marketId,
      outcomeId,
      side,
      type,
      price,
      quantity,
      status: 'open',
      createdAt: new Date().toISOString(),
    };

    // Audit event for order creation
    await writeAuditEvent({
      eventType: 'ORDER_CREATED',
      actorType: userId ? 'user' : 'system',
      actorId: userId,
      ipAddress,
      userAgent,
      marketId,
      orderId: order.id,
      afterState: {
        id: order.id,
        marketId,
        outcomeId,
        side,
        type,
        price,
        quantity,
        status: order.status,
      },
      metadata: {
        orderType: type,
        side,
      },
    }).catch(console.error);

    // In a real implementation, this would also log:
    // - AMM_QUOTE_GENERATED (pre-trade quote)
    // - TRADE_EXECUTED (when matched)
    // - AMM_STATE_CHANGED (post-trade price update)
    // - COMMISSION_APPLIED (fees)

    return res.status(201).json(order);
  }

  if (req.method === 'GET') {
    // Return user's orders
    return res.status(200).json([]);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
