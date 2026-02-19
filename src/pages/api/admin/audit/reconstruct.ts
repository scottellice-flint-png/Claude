// Market State Reconstruction API - Reconstruct market state at any point in time
import type { NextApiRequest, NextApiResponse } from 'next';
import { withAdminAuth, AdminSession, AdminContext } from '@/lib/adminAuth';
import { reconstructMarketSnapshot } from '@/services/auditEventService';

// Rate limiting state
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 20; // 20 reconstructions per minute

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
      message: 'Too many reconstruction requests. Please try again later.',
      retryAfter: 60,
    });
  }

  try {
    const { marketId, timestamp } = req.query;

    if (!marketId || typeof marketId !== 'string') {
      return res.status(400).json({ error: 'marketId is required' });
    }

    if (!timestamp || typeof timestamp !== 'string') {
      return res.status(400).json({ error: 'timestamp is required (ISO 8601 format)' });
    }

    const targetTimestamp = new Date(timestamp);
    if (isNaN(targetTimestamp.getTime())) {
      return res.status(400).json({ error: 'Invalid timestamp format. Use ISO 8601 format.' });
    }

    const snapshot = await reconstructMarketSnapshot(marketId, targetTimestamp);

    if (!snapshot) {
      return res.status(404).json({
        error: 'No events found',
        message: 'No audit events found for this market before the specified timestamp.',
      });
    }

    return res.status(200).json({
      success: true,
      reconstructedAt: new Date().toISOString(),
      requestedTimestamp: timestamp,
      snapshot,
    });
  } catch (error) {
    console.error('Market reconstruction API error:', error);
    return res.status(500).json({ error: 'Failed to reconstruct market state' });
  }
}

export default withAdminAuth(handler, 'audit:read');
