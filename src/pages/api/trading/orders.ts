// ============================================================================
// TRADING API - Orders Endpoint
// POST: Create order | GET: Get user's orders | DELETE: Cancel order
// ============================================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import { createOrder, cancelOrder, getUserOrders } from '@/services/tradingEngineService';
import { detectRapidFire, detectIPCluster } from '@/services/riskDefenseService';
import { createAuditContext } from '@/services/auditEventService';
import prisma from '@/lib/prisma';

// ============================================================================
// TYPES
// ============================================================================

interface CreateOrderBody {
  marketId: string;
  outcomeId: string;
  side: 'buy' | 'sell';
  orderType: 'limit' | 'market';
  priceCents: number;
  quantityCents: number;
}

interface CancelOrderBody {
  orderId: string;
  reason?: string;
}

// ============================================================================
// HANDLER
// ============================================================================

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Get user ID from session (simplified - should use proper auth)
  const userId = req.headers['x-user-id'] as string;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
  }

  // Verify user exists
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, isActive: true, isFlagged: true },
  });

  if (!user || !user.isActive) {
    return res.status(403).json({ error: 'User not found or inactive', code: 'USER_INACTIVE' });
  }

  // Check if user is flagged
  if (user.isFlagged) {
    return res.status(403).json({
      error: 'Account is under review',
      code: 'USER_FLAGGED',
    });
  }

  // Get client IP
  const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
    || req.socket.remoteAddress
    || undefined;

  // Create audit context
  const auditContext = createAuditContext('user', userId, req as unknown as {
    headers: Record<string, string | string[] | undefined>;
    socket?: { remoteAddress?: string };
  });

  switch (req.method) {
    case 'POST':
      return handleCreateOrder(req, res, userId, ipAddress, auditContext);

    case 'GET':
      return handleGetOrders(req, res, userId);

    case 'DELETE':
      return handleCancelOrder(req, res, userId);

    default:
      res.setHeader('Allow', ['POST', 'GET', 'DELETE']);
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

// ============================================================================
// CREATE ORDER
// ============================================================================

async function handleCreateOrder(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string,
  ipAddress: string | undefined,
  auditContext: ReturnType<typeof createAuditContext>
) {
  try {
    const body = req.body as CreateOrderBody;

    // Validate required fields
    if (!body.marketId || !body.outcomeId || !body.side || !body.priceCents || !body.quantityCents) {
      return res.status(400).json({
        error: 'Missing required fields',
        code: 'VALIDATION_ERROR',
        required: ['marketId', 'outcomeId', 'side', 'priceCents', 'quantityCents'],
      });
    }

    // Validate side
    if (!['buy', 'sell'].includes(body.side)) {
      return res.status(400).json({
        error: 'Invalid side - must be "buy" or "sell"',
        code: 'VALIDATION_ERROR',
      });
    }

    // Validate order type
    const orderType = body.orderType || 'limit';
    if (!['limit', 'market'].includes(orderType)) {
      return res.status(400).json({
        error: 'Invalid order type - must be "limit" or "market"',
        code: 'VALIDATION_ERROR',
      });
    }

    // Validate price
    if (body.priceCents < 1 || body.priceCents > 99) {
      return res.status(400).json({
        error: 'Price must be between 1 and 99 cents',
        code: 'INVALID_PRICE',
      });
    }

    // Validate quantity
    if (body.quantityCents < 100) {
      return res.status(400).json({
        error: 'Minimum quantity is 100 cents (1 unit)',
        code: 'INVALID_QUANTITY',
      });
    }

    // Run risk checks
    const rapidFireCheck = await detectRapidFire(userId);
    if (!rapidFireCheck.passed) {
      return res.status(429).json({
        error: 'Rate limit exceeded - too many orders',
        code: 'RAPID_FIRE_DETECTED',
        details: rapidFireCheck.details,
      });
    }

    if (ipAddress) {
      await detectIPCluster(ipAddress, userId);
      // IP cluster is alert-only, don't block
    }

    // Create the order
    const result = await createOrder({
      userId,
      marketId: body.marketId,
      outcomeId: body.outcomeId,
      side: body.side,
      orderType,
      priceCents: body.priceCents,
      quantityCents: body.quantityCents,
      ipAddress,
    }, auditContext);

    if (!result.success) {
      // Determine appropriate status code
      const statusCode =
        result.reasonCode === 'INSUFFICIENT_BALANCE' ? 402 :
        result.reasonCode === 'EXCEEDS_LIQUIDITY_CAP' ? 400 :
        result.reasonCode === 'MARKET_NOT_OPEN' ? 400 :
        result.reasonCode === 'MARKET_CLOSED' ? 400 :
        result.reasonCode === 'USER_FLAGGED' ? 403 :
        500;

      return res.status(statusCode).json({
        error: result.error,
        code: result.reasonCode,
        maxBetCents: result.maxBetCents,
        liquidityTier: result.liquidityTier,
      });
    }

    return res.status(201).json({
      success: true,
      orderId: result.orderId,
      status: result.status,
      totalFilledCents: result.totalFilledCents,
      tradesCreated: result.tradesCreated,
      remainingCents: result.remainingCents,
      reasonCode: result.reasonCode,
    });
  } catch (error) {
    console.error('Create order error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
    });
  }
}

// ============================================================================
// GET ORDERS
// ============================================================================

async function handleGetOrders(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) {
  try {
    const { status, marketId, limit = '50' } = req.query;

    // Parse status filter
    const statusFilter = status
      ? (Array.isArray(status) ? status : status.split(',')) as ('pending' | 'open' | 'partial' | 'filled' | 'cancelled' | 'expired' | 'rejected')[]
      : undefined;

    const orders = await getUserOrders(userId, statusFilter);

    // Filter by market if specified
    const filteredOrders = marketId
      ? orders.filter(o => o.marketId === marketId)
      : orders;

    // Apply limit
    const limitedOrders = filteredOrders.slice(0, parseInt(limit as string, 10));

    return res.status(200).json({
      orders: limitedOrders.map(order => ({
        id: order.id,
        marketId: order.marketId,
        marketTitle: order.market.title,
        outcomeId: order.outcomeId,
        outcomeLabel: order.outcome.label,
        side: order.side,
        orderType: order.orderType,
        priceCents: order.priceCents,
        quantityCents: order.quantityCents,
        filledCents: order.filledCents,
        remainingCents: order.remainingCents,
        status: order.status,
        createdAt: order.createdAt.toISOString(),
        filledAt: order.filledAt?.toISOString(),
        cancelledAt: order.cancelledAt?.toISOString(),
        isTaker: order.isTaker,
      })),
      total: filteredOrders.length,
    });
  } catch (error) {
    console.error('Get orders error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
    });
  }
}

// ============================================================================
// CANCEL ORDER
// ============================================================================

async function handleCancelOrder(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) {
  try {
    const { orderId, reason } = req.body as CancelOrderBody;

    if (!orderId) {
      return res.status(400).json({
        error: 'Order ID is required',
        code: 'VALIDATION_ERROR',
      });
    }

    const result = await cancelOrder(orderId, userId, reason || 'USER_CANCEL');

    if (!result.success) {
      return res.status(400).json({
        error: result.error,
        code: result.reasonCode,
      });
    }

    return res.status(200).json({
      success: true,
      orderId: result.orderId,
      status: result.status,
      reasonCode: result.reasonCode,
    });
  } catch (error) {
    console.error('Cancel order error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
    });
  }
}
