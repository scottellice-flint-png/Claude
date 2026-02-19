// Comprehensive Audit Events API - Read-only endpoint for regulatory compliance
import type { NextApiRequest, NextApiResponse } from 'next';
import { withAdminAuth, AdminSession, AdminContext } from '@/lib/adminAuth';
import { getAuditEvents } from '@/services/auditEventService';
import type { AuditEventType, AuditExportFilters } from '@/types/auditEvents';

// Rate limiting state (in production, use Redis or similar)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 30; // 30 requests per minute

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userLimit = rateLimitMap.get(userId);

  if (!userLimit || userLimit.resetAt < now) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (userLimit.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  userLimit.count++;
  return true;
}

async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  session: AdminSession,
  ctx: AdminContext
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check rate limit
  if (!checkRateLimit(ctx.userId)) {
    return res.status(429).json({
      error: 'Rate limit exceeded',
      message: 'Too many requests. Please try again later.',
      retryAfter: 60,
    });
  }

  try {
    const {
      page = '1',
      pageSize = '50',
      marketId,
      betId,
      orderId,
      actorId,
      eventTypes,
      startTime,
      endTime,
    } = req.query;

    // Build filters
    const filters: AuditExportFilters = {};

    if (marketId && typeof marketId === 'string') {
      filters.marketId = marketId;
    }

    if (betId && typeof betId === 'string') {
      filters.betId = betId;
    }

    if (orderId && typeof orderId === 'string') {
      filters.orderId = orderId;
    }

    if (actorId && typeof actorId === 'string') {
      filters.actorId = actorId;
    }

    if (eventTypes) {
      const types = Array.isArray(eventTypes) ? eventTypes : [eventTypes];
      filters.eventTypes = types.filter(Boolean) as AuditEventType[];
    }

    if (startTime && typeof startTime === 'string') {
      filters.startTime = startTime;
    }

    if (endTime && typeof endTime === 'string') {
      filters.endTime = endTime;
    }

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const pageSizeNum = Math.min(100, Math.max(1, parseInt(pageSize as string, 10) || 50));

    const result = await getAuditEvents(filters, pageNum, pageSizeNum);

    return res.status(200).json(result);
  } catch (error) {
    console.error('Audit events API error:', error);
    return res.status(500).json({ error: 'Failed to fetch audit events' });
  }
}

export default withAdminAuth(handler, 'audit:read');
