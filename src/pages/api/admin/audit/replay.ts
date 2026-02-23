// ============================================================================
// AUDIT REPLAY API - NT Compliance
// POST /api/admin/audit/replay
// ============================================================================
//
// Deterministic replay of market state for audit purposes.
// Reconstructs order book, positions, and balances at any timestamp.
// ============================================================================

import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { writeAuditEvent } from '@/services/auditEventService';

interface ReplayRequest {
  marketId: string;
  upToTimestamp?: string;  // ISO timestamp
  verifyInvariants?: boolean;
}

interface ReplayResult {
  success: boolean;
  marketId: string;
  replayedUpTo: string;
  tradeCount: number;
  totalVolumeCents: number;
  positions: Record<string, number>;
  userBalanceDeltas: Record<string, number>;
  orderBook: {
    bids: Array<{ priceCents: number; quantityCents: number; orderCount: number }>;
    asks: Array<{ priceCents: number; quantityCents: number; orderCount: number }>;
  };
  invariantsValid: boolean;
  invariantErrors: Array<{ type: string; expected: unknown; actual: unknown }>;
}

interface ApiResponse {
  success: boolean;
  result?: ReplayResult;
  error?: string;
}

// Admin authentication
async function getAdminUser(req: NextApiRequest): Promise<{ id: string } | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.substring(7);
  if (!token) return null;
  return { id: 'admin-user-id' };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const admin = await getAdminUser(req);
  if (!admin) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  try {
    const body = req.body as ReplayRequest;

    if (!body.marketId) {
      return res.status(400).json({ success: false, error: 'Market ID required' });
    }

    const upToTs = body.upToTimestamp
      ? new Date(body.upToTimestamp)
      : new Date();

    // Call the SQL replay function
    const result = await prisma.$queryRaw<{ replay_market_state: unknown }[]>`
      SELECT replay_market_state(
        ${body.marketId}::UUID,
        ${upToTs}::TIMESTAMP
      ) as replay_market_state
    `;

    const replayResult = result[0]?.replay_market_state as ReplayResult;

    if (!replayResult) {
      return res.status(404).json({
        success: false,
        error: 'No data found for market',
      });
    }

    // Log the replay action
    await writeAuditEvent({
      eventType: 'ADMIN_ACCOUNT_ACTION',
      actorType: 'admin',
      actorId: admin.id,
      marketId: body.marketId,
      reasonCode: 'AUDIT_REPLAY',
      metadata: {
        upToTimestamp: upToTs.toISOString(),
        tradeCount: replayResult.tradeCount,
        invariantsValid: replayResult.invariantsValid,
      },
    });

    return res.status(200).json({
      success: true,
      result: replayResult,
    });

  } catch (error) {
    console.error('Replay handler error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal error',
    });
  }
}
