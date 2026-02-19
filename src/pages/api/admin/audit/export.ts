// Audit Export API - Export audit events in various formats for regulatory compliance
import type { NextApiRequest, NextApiResponse } from 'next';
import { withAdminAuth, AdminSession, AdminContext } from '@/lib/adminAuth';
import {
  exportAuditEvents,
  exportMarketLifecycle,
  exportBetLifecycle,
} from '@/services/auditEventService';
import type { AuditEventType, AuditExportFilters, ExportFormat } from '@/types/auditEvents';

// Rate limiting state (in production, use Redis or similar)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10; // 10 exports per minute (more restrictive than queries)

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
      message: 'Too many export requests. Please try again later.',
      retryAfter: 60,
    });
  }

  try {
    const {
      type = 'events', // 'events', 'market', 'bet'
      format = 'json',
      marketId,
      betId,
      orderId,
      actorId,
      eventTypes,
      startTime,
      endTime,
      limit = '1000',
      offset = '0',
    } = req.query;

    const exportFormat = (format as string) === 'csv' ? 'csv' : 'json';

    let exportData: string;
    let filename: string;
    let contentType: string;

    if (type === 'market' && marketId && typeof marketId === 'string') {
      // Export full market lifecycle
      exportData = await exportMarketLifecycle(marketId, exportFormat);
      filename = `market-${marketId}-lifecycle.${exportFormat}`;
    } else if (type === 'bet' && betId && typeof betId === 'string') {
      // Export full bet lifecycle
      exportData = await exportBetLifecycle(betId, exportFormat);
      filename = `bet-${betId}-lifecycle.${exportFormat}`;
    } else {
      // Export filtered events
      const filters: AuditExportFilters = {
        limit: Math.min(10000, parseInt(limit as string, 10) || 1000),
        offset: parseInt(offset as string, 10) || 0,
      };

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

      exportData = await exportAuditEvents(filters, exportFormat);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      filename = `audit-export-${timestamp}.${exportFormat}`;
    }

    // Set appropriate content type
    if (exportFormat === 'csv') {
      contentType = 'text/csv';
    } else {
      contentType = 'application/json';
    }

    // Set download headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-cache');

    return res.status(200).send(exportData);
  } catch (error) {
    console.error('Audit export API error:', error);
    return res.status(500).json({ error: 'Failed to export audit events' });
  }
}

export default withAdminAuth(handler, 'audit:read');
