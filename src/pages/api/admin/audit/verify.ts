// Hash Chain Verification API - Verify audit log integrity
import type { NextApiRequest, NextApiResponse } from 'next';
import { withAdminAuth, AdminSession, AdminContext } from '@/lib/adminAuth';
import { verifyHashChain } from '@/services/auditEventService';

// Rate limiting state
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 300000; // 5 minutes
const RATE_LIMIT_MAX_REQUESTS = 5; // 5 verifications per 5 minutes

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

  // Only super_admin and admin can verify hash chains
  if (!['super_admin', 'admin'].includes(session.user.role)) {
    return res.status(403).json({
      error: 'Insufficient permissions',
      message: 'Only administrators can verify hash chains.',
    });
  }

  // Check rate limit
  if (!checkRateLimit(ctx.userId)) {
    return res.status(429).json({
      error: 'Rate limit exceeded',
      message: 'Hash verification is resource-intensive. Please try again later.',
      retryAfter: 300,
    });
  }

  try {
    const { startSeq, endSeq } = req.query;

    const startSeqBigInt = startSeq ? BigInt(startSeq as string) : undefined;
    const endSeqBigInt = endSeq ? BigInt(endSeq as string) : undefined;

    const result = await verifyHashChain(startSeqBigInt, endSeqBigInt);

    return res.status(200).json({
      success: true,
      verifiedAt: new Date().toISOString(),
      range: {
        startSeq: startSeq || 'beginning',
        endSeq: endSeq || 'latest',
      },
      result: {
        valid: result.valid,
        totalVerified: result.totalVerified,
        brokenAt: result.brokenAt || null,
        message: result.valid
          ? 'Hash chain integrity verified successfully.'
          : `Hash chain broken at event ID: ${result.brokenAt}`,
      },
    });
  } catch (error) {
    console.error('Hash verification API error:', error);
    return res.status(500).json({ error: 'Failed to verify hash chain' });
  }
}

export default withAdminAuth(handler, 'audit:read');
